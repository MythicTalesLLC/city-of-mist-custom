import { SystemModule } from "./config/system-module.js";
import { CitySettings } from "./settings.js";
import { HTMLTools } from "./tools/HTMLTools.js";
import { localize } from "./city.js";
import { CityDB } from "./city-db.js";
import { SelectedTagsAndStatus } from "./selected-tags.js";
import { CityHelpers } from "./city-helpers.js";
import { SceneTags } from "./scene-tags.js";
import { CityDialogs } from "./city-dialogs.js";
import { CityLogger } from "./city-logger.js";
export class CityActor extends Actor {
    get mainThemes() {
        return this.getThemes().sort((a, b) => b.themeSortValue() - a.themeSortValue());
    }
    get loadout() {
        return this.items.find((item) => {
            return item.isTheme() && item.isLoadoutTheme();
        });
    }
    possibleExtraThemeSources() {
        const nonGMOwners = game.users.filter(x => !x.isGM && this.testUserPermission(x, "OWNER"));
        return game.actors.contents.filter(actor => nonGMOwners.some(user => actor.testUserPermission(user, "OWNER") && actor.system.type != "crew"));
    }
    get crewTheme() {
        return this.activeCrew;
    }
    get crewThemes() {
        const nonGMOwners = game.users
            .filter(x => !x.isGM && this.testUserPermission(x, "OWNER"));
        const validCrewActors = game.actors.contents
            .filter(actor => nonGMOwners.some(user => actor.testUserPermission(user, "OWNER")
            && actor.system.type == "crew"));
        return validCrewActors.flatMap(x => x.getThemes());
    }
    get activeCrew() {
        if (this.system.type != "character") {
            return undefined;
        }
        const crewThemes = this.crewThemes;
        const activeId = this.system.activeCrewId;
        const theme = crewThemes.find(x => x.id == activeId);
        if (theme) {
            return theme;
        }
        if (crewThemes.length == 0) {
            return undefined;
        }
        return crewThemes[0];
    }
    get allLinkedExtraThemes() {
        const sources = this.possibleExtraThemeSources();
        return sources.flatMap(actor => actor.personalExtraThemes());
    }
    personalExtraThemes() {
        const themeType = this.system.type;
        switch (themeType) {
            case "character":
                return this.items.filter(x => x.isTheme() && x.isExtraTheme());
            case "crew":
                return [];
            case "threat":
                return this.items.filter(x => x.isTheme());
            default:
                themeType;
                console.error(`Unknown themetype ${themeType}`);
                return [];
        }
    }
    isDanger() {
        return this.system.type == "threat";
    }
    /** gets top level gmmoves (not submoves) */
    get gmmoves() {
        return this.getGMMoves()
            .filter(x => !x.system.superMoveId);
    }
    get clues() {
        return this.items.filter(x => x.system.type == "clue");
    }
    get clueJournal() {
        return this.items.filter(x => x.system.type == "journal");
    }
    get templates() {
        return this.getAttachedTemplates();
    }
    get my_statuses() {
        return this.getStatuses();
    }
    get collectiveStatus() {
        return this.getStatuses().filter(x => x.system.specialType == "collective");
    }
    async updateCollectiveStatus() {
        const collective = this.collectiveStatus;
        const useCollective = CitySettings.get("collectiveMechanics");
        if (this.collective_size == 0 || useCollective == "city-of-mist") {
            const promises = collective.map(status => status.delete());
            await Promise.allSettled(promises);
            return;
        }
        else {
            if (collective.length == 0) {
                const col_name = SystemModule.active.collectiveTermName();
                await this.createNewStatus(col_name, this.collective_size, this.collective_size, { "specialType": "collective" });
                return;
            }
            if (this.collective_size != collective[0].system.tier) {
                await collective[0].update({ "system.tier": this.collective_size, "system.pips": 0 });
            }
        }
    }
    async getCollectiveStatus() {
        let collective = this.collectiveStatus;
        if (!collective.length) {
            // const system = CitySettings.getBaseSystem();
            // const col_name = localize(COLLECTIVE[system]);
            const col_name = SystemModule.active.collectiveTermName();
            await this.createNewStatus(col_name, this.collective_size, 0, { "specialType": "collective" });
            collective = this.collectiveStatus;
        }
        return collective[0];
    }
    get my_story_tags() {
        return this.getStoryTags();
    }
    get my_spectrums() {
        return this.items.filter(x => x.isSpectrum());
    }
    get collective_size() {
        if (this.system.type == "threat") {
            const size = Number(this.system.collectiveSize ?? 0);
            if (Number.isNaN(size)) {
                return 0;
            }
            return size;
        }
        return 0;
    }
    get spectrums() {
        return this.getSpectrums();
    }
    is_character() {
        return this.system.type == "character";
    }
    isPC() {
        return this.system.type == "character";
    }
    is_scene_container() {
        return this.name.includes(SceneTags.SCENE_CONTAINER_ACTOR_NAME);
    }
    is_danger_or_extra() {
        return this.system.type == "threat";
    }
    is_crew_theme() {
        return this.system.type == "crew";
    }
    get helpPoints() {
        return this.items.
            filter(x => x.isJuice() && x.isHelp());
    }
    get hurtPoints() {
        return this.items.
            filter(x => x.isJuice() && x.isHurt());
    }
    get juice() {
        return this.items.
            filter(x => x.isJuice());
    }
    get tokenId() {
        return this?.token?.id ?? "";
    }
    get sceneId() {
        return this?.token?.parent?.id ?? "";
    }
    get storyTagsAndStatuses() {
        return this.my_statuses
            .concat(this.my_story_tags);
    }
    hasHelpFor(actorId) {
        return this.helpPoints.some(x => x.system.targetCharacterId == actorId && x.system.amount > 0);
    }
    hasHurtFor(actorId) {
        return this.hurtPoints.some(x => x.system.targetCharacterId == actorId && x.system.amount > 0);
    }
    get visible() {
        if (this.system.type == "threat" && this.name == SceneTags.SCENE_CONTAINER_ACTOR_NAME) {
            return false;
        }
        else {
            return super.visible;
        }
    }
    /** Gets amount of juice for a given provided actor id.
    whichOne can be either "help" | "hurt"
    returns Number
     */
    getHelpHurtFor(whichOne = "help", targetCharacterId) {
        let arr;
        switch (whichOne) {
            case "help":
                arr = this.helpPoints;
                break;
            case "hurt":
                arr = this.hurtPoints;
                break;
            default:
                throw new Error(`Bad request: ${whichOne}, must use either "help" or "hurt"`);
        }
        return arr
            .filter(juice => juice.targets(targetCharacterId))
            .reduce((acc, juice) => juice.system.amount + acc, 0);
    }
    getGMMoves(depth = 0) {
        if (depth > 2) {
            return [];
        }
        if (!this.isDanger()) {
            return [];
        }
        const GMMoves = this.items
            .filter(x => x.isGMMove());
        const attached = this.getAttachedTemplates().map(x => x?.getGMMoves(depth + 1) ?? []).flat();
        return GMMoves.concat(attached);
    }
    getSpectrums(depth = 0) {
        if (depth > 2) {
            return [];
        }
        if (this.isDanger()) {
            return [];
        }
        const mySpectrums = this.items.filter(x => x.system.type == "spectrum");
        const templateSpectrums = this.getAttachedTemplates()
            .map(x => x?.getSpectrums(depth + 1) ?? [])
            .flat();
        for (const spec of templateSpectrums) {
            if (!mySpectrums.find(x => x.name == spec.name)) {
                mySpectrums.push(spec);
            }
        }
        return mySpectrums;
    }
    ownsMove(move_id) {
        return this.getGMMoves().find(x => x.id == move_id)?.parent == this;
    }
    getAttachedTemplates() {
        if (this.system.type != "threat") {
            return [];
        }
        return (this.system.template_ids ?? [])
            .map(id => CityHelpers.getDangerTemplate(id)
            ?? CityDB.getActorById(id))
            .filter(x => x != null);
    }
    versionIsLessThan(version) {
        return String(this.system.version) < String(version);
    }
    async updateVersion(version) {
        version = String(version);
        if (this.versionIsLessThan(version)) {
            console.debug(`Updated version of ${this.name} to ${version}`);
            for (const item of this.items) {
                console.debug(`Updating Version of Item: ${item.name}`);
                await item.updateVersion(version);
            }
            return await this.update({ "system.version": version });
        }
        if (version < this.system.version) {
            console.warn(`Failed attempt to downgrade version of ${this.name} to ${version}`);
        }
    }
    /** returns the theme for a given id
    @return {CityItem}
     */
    getTheme(id) {
        return this.items.find(x => x.isTheme() && x.id == id);
    }
    /** returns the tag for a given id
    @return {CityItem}
     */
    getTag(id) {
        return this.items.find(x => x.isTag() && x.id == id);
    }
    /** returns the item for a given id
    @return {CityItem}
     */
    getItem(id) {
        return this.items.find(x => x.id == id);
    }
    /** returns the tag for a given id
    @return {CityItem[]}
     */
    getStoryTags() {
        return this.items.filter(x => {
            return x.system.type == "tag" && x.system.subtype == "story";
        })
            .sort((CityDB.namesort));
    }
    getSelectable(id) {
        return this.items.find(x => (x.isTag() || x.isStatus()) && x.id == id);
    }
    getStatus(id) {
        return this.items.find(x => x.isStatus() && x.id == id);
    }
    getStatuses() {
        return this.items
            .filter(item => item.isStatus())
            .sort(CityDB.namesort);
    }
    getClue(id) {
        return this.items.find(x => x.isClue() && x.id == id);
    }
    getJournalClue(id) {
        return this.items.find(x => x.isJournal() && x.id == id);
    }
    getJuice(id) {
        return this.items.find(x => x.isJuice() && x.id == id);
    }
    getGMMove(id) {
        return this.getGMMoves().find(x => x.isGMMove() && x.id == id);
    }
    getImprovement(id) {
        return this.items.find(x => x.isImprovement() && x.id == id);
    }
    getSpectrum(id) {
        return this.items.find(x => x.isSpectrum() && x.id == id);
    }
    hasStatus(name) {
        return this.items.find(x => x.isStatus() && x.name == name);
    }
    isNewCharacter() {
        return !this.system.finalized;
    }
    getTags(themeId = null, subtype = null) {
        const tags = this.items.filter(x => {
            return x.system.type == "tag" && (themeId == null || x.system.theme_id == themeId) && (subtype == null || x.system.subtype == subtype);
        });
        if (!tags.filter) {
            throw new Error("non array returned");
        }
        return tags;
    }
    /** Deletes a tag from the actor
@param {string} tagId
@param {{removeImprovement ?: boolean}} options
@param {boolean} options.removeImprovement removes an improvement from the actor as tag is deleted
     */
    async deleteTag(tagId, options = {}) {
        const tag = this.getTag(tagId);
        if (!tag) {
            return;
        }
        let afterMsg = "";
        if (tag.theme != null && !tag.isBonusTag()) {
            const theme = tag.theme;
            if (tag.isPowerTag()) {
                await theme.incUnspentUpgrades();
                afterMsg = localize("CityOfMist.log.theme.addImp");
            }
            if (tag.isWeaknessTag() && options?.removeImprovement) {
                await theme.decUnspentUpgrades();
                afterMsg = localize("CityOfMist.log.theme.remImp");
            }
        }
        await CityLogger.modificationLog(this, `Deleted`, tag, afterMsg);
        return await this.deleteEmbeddedById(tagId);
    }
    async deleteEmbeddedById(id) {
        return await this.deleteEmbeddedDocuments("Item", [id]);
    }
    async deleteStatus(id) {
        return await this.deleteEmbeddedById(id);
    }
    /**deletes a status by name
    @param {string} name
     */
    async deleteStatusByName(name) {
        const status = this.getStatuses().find(x => x.name == name);
        if (status) {
            await this.deleteStatus(status.id);
        }
    }
    async deleteGMMove(id) {
        const move = this.getGMMove(id);
        if (!move) {
            throw new Error(`Can't delte bad id ${id}`);
        }
        const promises = move.submoves.map(x => this.deleteGMMove(x.id));
        await Promise.allSettled(promises);
        return await this.deleteEmbeddedById(id);
    }
    async deleteClue(id) {
        return await this.deleteEmbeddedById(id);
    }
    async deleteJuice(id) {
        return await this.deleteEmbeddedById(id);
    }
    async deleteSpectrum(id) {
        return await this.deleteEmbeddedById(id);
    }
    async spendJuice(id, amount = 1) {
        const juice = this.items.find(x => x.system.type == "juice" && x.id == id);
        if (!juice) {
            throw new Error(`Can't find juice ${id}`);
        }
        await juice.spend(amount);
        if (juice.getAmount() <= 0) {
            await this.deleteJuice(id);
        }
    }
    async deleteImprovement(impId) {
        const imp = this.getImprovement(impId);
        if (!imp) {
            throw new Error(`Improvement ${impId} not found`);
        }
        if (imp.system.theme_id && imp.system.theme_id.length > 0) {
            const theme = this.getTheme(imp.system.theme_id);
            if (!theme) {
                throw new Error(`Can't find theme ${imp.system.theme_id}`);
            }
            await theme.incUnspentUpgrades();
        }
        else {
            if (this.system.type == "character") {
                await this.update({ "system.unspentBU": this.system.unspentBU + 1 });
            }
            else {
                throw new Error("Something strange happened");
            }
        }
        return this.deleteEmbeddedDocuments("Item", [impId]);
    }
    async setTokenName(name) {
        await this.update({ token: { name } });
    }
    async deleteTheme(themeId, awardBU = true) {
        const theme = this.getTheme(themeId);
        if (!theme) {
            throw new Error(`Can't find theme ${themeId}`);
        }
        await theme.setFlag("city-of-mist", "pendingDelete", true);
        if (awardBU && this.system.type == "character") {
            const BUV = theme.getBuildUpValue();
            await this.incBuildUp(BUV);
            await theme.destroyThemeMessage();
        }
        else {
            await CityHelpers.modificationLog(this, `Theme Deleted`, theme);
        }
        const tb = theme.getThemebookOrTK();
        if (tb && tb.isLocal) {
            if (tb.isThemeBook()) {
                console.log("Deleting embedded themebook");
                await this.deleteEmbeddedById(tb.id);
            }
            else if (tb.isThemeKit()) {
                const tb2 = tb.getThemebookOrTK();
                if (tb2 && tb2.isLocal) {
                    console.log("Deleting embedded themebook");
                    await this.deleteEmbeddedById(tb2.id);
                }
                console.log("Deleting embedded themekit");
                await this.deleteThemeKit(tb.id);
            }
        }
        await this.deleteEmbeddedById(themeId);
        console.log("Deleting theme");
    }
    async deleteThemeKit(themeKitId) {
        if (!themeKitId) {
            return;
        }
        console.log("Deleting Theme Kit");
        await this.deleteEmbeddedById(themeKitId);
    }
    getImprovements(themeId = null) {
        return this.items.filter(x => x.system.type == "improvement" && (themeId == null || x.system.theme_id == themeId));
    }
    /** get improvements from self and from other activeExtra and crew theme
     */
    getAllImprovements() {
        if (!this.is_character()) {
            return this.getImprovements();
        }
        const base = this.getImprovements();
        const crewImprovements = this.getCrewThemes()
            .flatMap(x => x.getImprovements());
        const activeExtraImprovements = this.activeExtra ? this.activeExtra.getImprovements() : [];
        return base
            .concat(crewImprovements)
            .concat(activeExtraImprovements);
    }
    get activeExtra() {
        if (this.system.type != "character") {
            return undefined;
        }
        const id = this.system.activeExtraId;
        const list = this.allLinkedExtraThemes;
        if (id) {
            const theme = list.find(theme => theme.id == id);
            if (theme) {
                return theme;
            }
        }
        if (list.length > 0) {
            return list[0];
        }
        return undefined;
    }
    getCrewThemes() {
        return game.actors.contents
            .filter(actor => actor.system.type == "crew" && actor.isOwner)
            .flatMap(actor => actor.getThemes());
    }
    async createNewTheme(name, themebook, isExtra = false) {
        const nascent = !this.isNewCharacter();
        const unspent_upgrades = nascent ? 1 : 3;
        const themebook_name = themebook.name;
        const system = {
            themebook_id: themebook.id, themebook_name, unspent_upgrades, nascent, isExtra
        };
        const obj = {
            name, type: "theme", system
        };
        if (this.mainThemes.length > 3 && !isExtra) {
            ui.notifications.warn("Can't add another theme");
            return null;
        }
        const theme = await this.createNewItem(obj);
        if (theme) {
            Hooks.callAll("themeCreated", this, theme);
            return theme;
        }
        ui.notifications.error(`Trouble creating theme: ${name} from ${themebook.name}`);
    }
    async addThemeKit(tk, isExtra = false) {
        if (this.mainThemes.length > 3 && !isExtra) {
            ui.notifications.warn("Can't add extra theme kit, already at 4 themes");
            return;
        }
        const localtk = await this.createNewItem(tk);
        if (!localtk.id) {
            throw new Error("Doesn't have an ID");
        }
        await this.createNewTheme(tk.displayedName, localtk, isExtra);
    }
    async createNewThemeKit(name = "Unnamed Theme Kit") {
        const obj = {
            name,
            type: "themekit",
            is_theme_kit: true,
        };
        return await this.createNewItem(obj);
    }
    getActivatedImprovementEffects(move_id) {
        return this.getAllImprovements()
            .filter(x => x.isImprovementActivated(move_id))
            .map(x => x.getActivatedEffect());
    }
    async createNewItem(obj) {
        return (await this.createEmbeddedDocuments("Item", [obj]))[0];
    }
    async createNewStatus(name, tier = 1, pips = 0, options = {}) {
        const obj = {
            name,
            type: "status",
            system: { ...options, pips, tier }
        };
        return await this.createNewItem(obj);
    }
    async createClue(metaSource = "", clueData = {}) {
        const existing = this.items.find(x => x.system.type == "clue" && x.system.metaSource == metaSource);
        if (metaSource && existing) {
            await existing.update({ "system.amount": existing.system.amount + 1 });
            return true;
        }
        const obj = await this.createNewClue({ metaSource, ...clueData });
        const clue = this.getClue(obj.id);
        const updateObj = await CityHelpers.itemDialog(clue);
        if (updateObj) {
            const partialstr = clue.system.partial ? ", partial" : "";
            await CityHelpers.modificationLog(this, "Created", clue, `${clue.system.amount}${partialstr}`);
            return true;
        }
        else {
            await this.deleteClue(obj.id);
            return false;
        }
    }
    async createNewClue(dataobj) {
        const name = dataobj.name ?? "Unnamed Clue";
        const obj = {
            name, type: "clue", system: { amount: 1, ...dataobj }
        };
        return await this.createNewItem(obj);
    }
    async createNewJuice(name, subtype = "") {
        const obj = {
            name, type: "juice", system: { amount: 1, subtype }
        };
        return await this.createNewItem(obj);
    }
    async createNewGMMove(name, systemData = {}) {
        const obj = {
            name, type: "gmmove", system: { subtype: "soft", ...systemData }
        };
        return await this.createNewItem(obj);
    }
    async createNewSpectrum(name) {
        const obj = {
            name, type: "spectrum"
        };
        return await this.createNewItem(obj);
    }
    async addClueJournal(question, answer) {
        const obj = {
            name: "Unnamed Journal",
            type: "journal",
            system: { question, answer }
        };
        if (!this.clueJournal.find(x => x.system.question == question && x.system.answer == answer)) {
            return await this.createNewItem(obj);
        }
        else {
            return null;
        }
    }
    getThemeKit(id) {
        return this.items.find(x => x.id == id && x.isThemeKit());
    }
    localExtraThemes() {
        return this.items.filter(x => x.isTheme()
            && x.isExtraTheme());
    }
    getThemes() {
        return this.items.filter(x => x.isTheme()
            && !x.isBeingDeleted()
            && !x.isExtraTheme()
            && x != this.loadout);
    }
    getNumberOfThemes(target_type) {
        const themes = this.getThemes();
        let count = 0;
        for (const theme of themes) {
            if (theme.isBeingDeleted()) {
                continue;
            }
            const theme_type = theme.getThemeType();
            if (target_type == theme_type) {
                ++count;
            }
        }
        return count;
    }
    async incBuildUp(amount = 1) {
        const oldBU = this.system.buildup.slice();
        const [newBU, improvements] = CityHelpers.modArray(oldBU, amount, 5);
        await this.update({ "system.buildup": newBU });
        if (improvements > 0) {
            await this.update({ "system.unspentBU": this.system.unspentBU + improvements });
        }
        return improvements;
    }
    async decBuildUp(amount = 1) {
        const oldBU = this.system.buildup.slice();
        const [newBU, improvements] = CityHelpers.modArray(oldBU, -amount, 5);
        await this.update({ "system.buildup": newBU });
        if (improvements < 0) {
            await this.update({ "system.unspentBU": this.system.unspentBU + improvements });
        }
        return improvements;
    }
    getBuildUp() {
        return this.system.buildup.reduce((acc, i) => acc + i, 0);
    }
    /** adds a tag to a chosen theme on the actor
    args
    @param {string} theme_id - id of theme,
    @param temp_subtype {"power" | "weakness" | "bonus"},
    @param question_letter{string} letter of the answered question or "_" for bonus,
    @param {{crispy ?: boolean, awardImprovement ?: boolean, noEdit ?: boolean}} options
     */
    async addTag(theme_id, temp_subtype, question_letter, options = {}) {
        const theme = this.getTheme(theme_id);
        if (!theme) {
            throw new Error(`Couldn't get Theme for id ${theme_id} on ${this.name}`);
        }
        const themebook = theme.getThemebookOrTK();
        if (options?.crispy == undefined) {
            if (!this.isPC() && temp_subtype != "weakness") {
                options.crispy = true;
            }
            else {
                options.crispy = false;
            }
        }
        let tag, upgrades;
        if (!themebook) {
            throw new Error("Couldn't find Themebook!");
        }
        switch (themebook.system.type) {
            case "themebook":
                [tag, upgrades] = await this._addTagFromThemeBook(theme, temp_subtype, question_letter, options);
                break;
            case "themekit":
                [tag, upgrades] = await this._addTagFromThemekit(theme, temp_subtype, question_letter, options);
                break;
            default: throw new Error(`Bad Type : $${themebook.type}`);
        }
        if (!options?.noEdit && !tag.isPartOfThemeKit()) {
            await CityDialogs.itemEditDialog(tag);
        }
        let afterMsg = "";
        if (upgrades > 0) {
            afterMsg = localize("CityOfMist.log.theme.addImp");
        }
        else if (upgrades < 0) {
            afterMsg = localize("CityOfMist.log.theme.remImp");
        }
        await CityLogger.modificationLog(this, "Created", tag, afterMsg);
    }
    async _addTagFromThemeBook(theme, temp_subtype, question_letter, options) {
        const themebook = theme.getThemebookOrTK();
        if (themebook.system.type == "themekit") {
            throw new Error("Themekit detected?");
        }
        let custom_tag = false;
        let question, subtag, subtype;
        let upgrades = 0;
        switch (temp_subtype) {
            case "power": {
                subtype = "power";
                const tagdata = themebook
                    .themebook_getTagQuestions(temp_subtype)
                    .find(x => x.letter == question_letter);
                question = tagdata.question;
                subtag = tagdata.subtag;
                await theme.decUnspentUpgrades();
                upgrades--;
                break;
            }
            case "weakness": {
                const tagdata = themebook
                    .themebook_getTagQuestions(temp_subtype)
                    .find(x => x.letter == question_letter);
                subtype = "weakness";
                question = tagdata.question;
                subtag = tagdata.subtag;
                if (options.awardImprovement) {
                    await theme.incUnspentUpgrades();
                    upgrades++;
                }
                break;
            }
            case "bonus":
                subtype = "power";
                custom_tag = true;
                subtag = false;
                question_letter = "_";
                question = "???";
                break;
            default:
                throw new Error(`Unrecognized Tag Type ${temp_subtype}`);
        }
        const obj = {
            name: "Unnamed Tag",
            type: "tag",
            system: {
                subtype,
                theme_id: theme.id,
                question_letter,
                question,
                crispy: options?.crispy ?? false,
                custom_tag,
                subtagRequired: subtag,
            }
        };
        return [await this.createNewItem(obj), upgrades];
    }
    async _addTagFromThemekit(theme, temp_subtype, question_letter, options) {
        const themebook = theme.getThemebookOrTK();
        if (!themebook.isThemeKit()) {
            throw new Error("Not a themekit!");
        }
        const tagdata = themebook
            .themekit_getTags(temp_subtype)
            .find(x => x.letter == question_letter);
        if (!tagdata && temp_subtype != "bonus") {
            throw new Error(`Can't find TagData for ${theme.name} ${temp_subtype}, ${question_letter}`);
        }
        let custom_tag = false;
        let subtag = false;
        let question = "-";
        let tagname, subtype;
        let upgrades = 0;
        const description = tagdata?.description ?? "";
        switch (temp_subtype) {
            case "power":
                subtype = "power";
                tagname = tagdata.tagname ?? tagdata.name;
                subtag = false;
                await theme.decUnspentUpgrades();
                upgrades--;
                break;
            case "weakness":
                subtype = "weakness";
                tagname = tagdata.tagname ?? tagdata.name;
                subtag = false;
                if (options.awardImprovement) {
                    await theme.incUnspentUpgrades();
                    upgrades++;
                }
                break;
            case "bonus":
                subtype = "power";
                custom_tag = true;
                question_letter = "_";
                question = "???";
                break;
            default:
                throw new Error(`Unknown tag subtype ${temp_subtype}`);
        }
        const obj = {
            name: tagname ?? "Unnamed Tag",
            type: "tag",
            system: {
                subtype,
                theme_id: theme.id,
                question_letter,
                question,
                crispy: options?.crispy ?? false,
                custom_tag,
                subtagRequired: subtag,
                description,
            },
        };
        return [await this.createNewItem(obj), upgrades];
    }
    async addImprovement(theme_id, number) {
        //TODO: accomodate new effect class in improvement this may not be right spot
        const theme = this.getTheme(theme_id);
        if (!theme) {
            throw new Error(`Can't find theme ${theme_id}`);
        }
        const themebook = theme.getThemebookOrTK();
        if (!themebook) {
            throw new Error(`Can't find theme book for ${theme.name}`);
        }
        // const data = themebook.system;
        const imp = themebook.isThemeBook()
            ? themebook.themebook_getImprovements()[number]
            : themebook.themekit_getImprovements()[number];
        console.log(imp);
        if (!imp) {
            throw new Error(`improvement number ${number} not found in theme ${theme_id}`);
        }
        const obj = {
            name: imp.name,
            type: "improvement",
            system: {
                description: imp.description,
                uses: {
                    max: imp?.uses ?? 0,
                    current: imp?.uses ?? 0,
                },
                theme_id,
                chosen: true,
                effect_class: imp.effect_class,
            }
        };
        try {
            const docs = await this.createNewItem(obj);
            await theme.decUnspentUpgrades();
            return docs;
        }
        catch (e) {
            console.log("Problem Adding Improvement");
            Debug(this);
            throw e;
        }
    }
    async addBuildUpImprovement(impId) {
        const improvements = await CityHelpers.getBuildUpImprovements();
        const imp = improvements.find(x => x.id == impId);
        if (imp == undefined) {
            throw new Error(`Couldn't find improvement ID:${impId}`);
        }
        const obj = {
            name: imp.name,
            type: "improvement",
            system: {
                description: imp.system.description,
                theme_id: "",
                effect_class: imp.system.effect_class,
                chosen: true,
                uses: {
                    max: imp.system?.uses?.max ?? 0,
                    current: imp.system?.uses?.max ?? 0
                }
            }
        };
        const unspentBU = this.system.unspentBU;
        await this.update({ "system.unspentBU": unspentBU - 1 });
        return await this.createNewItem(obj);
    }
    getBuildUpImprovements() {
        return this.items.filter(x => x.system.type == "improvement" && x.system.theme_id.length == 0);
    }
    async createStoryTag(name = "Unnamed Tag", preventDuplicates = false, options = {}) {
        name = name.trim();
        if (preventDuplicates) {
            if (this.getStoryTags().some(x => x.name == name)) {
                return null;
            }
        }
        const temporary = options?.temporary ?? !(game.user.isGM);
        const obj = {
            name,
            type: "tag",
            system: {
                subtype: "story",
                theme_id: "",
                question_letter: "_",
                question: "",
                crispy: false,
                burned: false,
                temporary,
                ...options,
            }
        };
        return await this.createNewItem(obj);
    }
    get relationshipTags() {
        return this.items.filter(item => item.isTag() && item.isRelationshipTag());
    }
    async createRelationshipTag(name = "Unnamed Tag", options = {}) {
        const obj = {
            name: name.trim(),
            type: "tag",
            system: {
                subtype: "relationship",
                theme_id: "",
                question_letter: "_",
                question: "",
                crispy: true,
                ...options,
            }
        };
        return await this.createNewItem(obj);
    }
    async deleteStoryTagByName(tagname) {
        const tag = this.getStoryTags().find(x => x.name == tagname);
        if (tag) {
            return await this.deleteTag(tag.id);
        }
    }
    async burnTag(id, state = 1) {
        const tag = this.getTag(id);
        if (!tag) {
            throw new Error(`Can't find tag ${id} to burn`);
        }
        const interval = 0.4;
        if (state > 0) {
            void CityHelpers.playBurn();
            let level = 3;
            while (level > 0) {
                await tag.burnTag(level--);
                await CityHelpers.asyncwait(interval);
            }
        }
        else {
            await tag.burnTag(0);
        }
    }
    async unburnTag(tagId) {
        await this.unburnTag(tagId);
    }
    async addAttention(themeId, amount = 1) {
        const theme = this.getTheme(themeId);
        if (!theme) {
            throw new Error(`Can't find theme id ${themeId}`);
        }
        const extra_improvements = await theme.addAttention(amount);
        if (this.isNewCharacter()) {
            console.log("Character finalized");
            await this.update({ "system.finalized": true });
        }
        return extra_improvements;
    }
    async removeAttention(themeId, amount = 1) {
        const theme = this.getTheme(themeId);
        if (!theme) {
            throw new Error(`Can't find theme id ${themeId}`);
        }
        const extra_improvements = await theme.removeAttention(amount);
        return extra_improvements;
    }
    async addFade(themeId, amount = 1) {
        const theme = this.getTheme(themeId);
        if (!theme) {
            throw new Error(`Can't find theme id ${themeId}`);
        }
        if (theme.crack == 2) {
            if (!await HTMLTools.confirmBox(localize("CityOfMist.dialog.actorSheet.addFade.title"), localize("CityOfMist.dialog.actorSheet.addFade.body"))) {
                return false;
            }
        }
        const theme_destroyed = await theme.addFade(amount);
        if (theme_destroyed) {
            await this.deleteTheme(themeId, true);
        }
        let txt = `Crack/Fade added to ${theme.displayedName}`;
        if (theme_destroyed) {
            txt += " ---- Theme Destroyed!";
        }
        else {
            txt += ` (Current ${theme.getCrack()})`;
        }
        await CityHelpers.modificationLog(this, txt);
        return theme_destroyed;
    }
    async addMilestone(themeId, amount = 1) {
        const theme = this.getTheme(themeId);
        if (!theme) {
            throw new Error(`Can't find theme id ${themeId}`);
        }
        await theme.addMilestone(amount);
        const trackName = SystemModule.themeThirdTrackName(theme);
        let txt = `${theme.parent.name}: ${trackName} added to ${theme.getDisplayedName()}`;
        if (theme.milestone == 2) {
            txt += "";
        }
        await CityHelpers.modificationLog(this, txt);
        return false;
    }
    async removeMilestone(themeId, amount = 1) {
        const theme = this.getTheme(themeId);
        if (!theme) {
            throw new Error(`Can't find theme id ${themeId}`);
        }
        const extra_improvements = await theme.removeMilestone(amount);
        // let txt =`${SystemModule.themeThirdTrackName(theme)} added to ${theme.displayedName} (current: ${theme.milestone})`;
        // await CityHelpers.modificationLog(this, txt);
        return extra_improvements;
    }
    async removeFade(themeId, amount = 1) {
        const theme = this.getTheme(themeId);
        if (!theme) {
            throw new Error(`Can't find theme id ${themeId}`);
        }
        await theme.removeFade(amount);
        let txt = `${theme.parent.name}: Crack/Fade removed from ${theme.getDisplayedName()}`;
        txt += ` (Current ${theme.getCrack()})`;
        await CityHelpers.modificationLog(this, txt);
        return false;
    }
    async resetFade(themeId) {
        const theme = this.getTheme(themeId);
        if (!theme) {
            throw new Error(`Can't find theme id ${themeId}`);
        }
        await theme.resetFade();
    }
    isLocked() {
        return this.system.locked;
    }
    isExtra() {
        return this.isDanger();
    }
    async toggleLockState() {
        const locked = !this.system.locked;
        SelectedTagsAndStatus.clearAllActivatedItems();
        await CityHelpers.playLockOpen();
        return await this.update({ "system.locked": locked });
    }
    async toggleAliasState() {
        const useAlias = !this.system.useAlias;
        return await this.update({ system: { useAlias } });
    }
    async setExtraThemeId(id) {
        await this.update({ system: { activeExtraId: id } });
    }
    async grantAttentionForWeaknessTag(id) {
        const tag = this.getSelectable(id);
        if (!tag) {
            throw new Error(`Can't find selectable ${id}`);
        }
        if (tag.system.type != "tag") {
            return;
        }
        const theme = this.getTheme(tag.system.theme_id);
        if (!theme) {
            throw new Error(`Can't get theme for ${tag.name}`);
        }
        await theme.addAttention();
    }
    getLinkedTokens() {
        if (this.token) {
            return [this.token];
        }
        const actives = this.getActiveTokens()
            .filter(x => !x.actor?.token)
            .map(x => "document" in x ? x.document : x);
        return actives;
    }
    get displayedName() {
        return this.getDisplayedName();
    }
    get pronouns() {
        if (this.system.type == "crew") {
            return [];
        }
        const prString = this.system.pronouns;
        if (!prString) {
            return [];
        }
        const prArray = prString
            .split("/")
            .map(str => {
            if (!str) {
                return "";
            }
            return str.trim().toLowerCase();
        });
        return CityActor._derivePronouns(prArray);
    }
    /** takes an array of pronounds and substitutes if it is incomplete
     */
    static _derivePronouns(prArray) {
        if (!prArray[0]) {
            return [];
        }
        const subtable = {
            "he": ["him", "his"],
            "she": ["her", "hers"],
            "it": ["it", "its"],
            "they": ["them", "their"],
        };
        const first = prArray[0];
        const subtableEntry = subtable[first];
        if (!subtableEntry) {
            return prArray;
        }
        for (let i = 1; i <= subtableEntry.length; i++) {
            if (!prArray[i]) {
                prArray[i] = subtableEntry[i - 1];
            }
        }
        return prArray;
    }
    get directoryName() {
        return SystemModule.active.directoryName(this);
        // const mythos = this.system.mythos ? ` [${this.system.mythos}]` : "";
        // const owner_name = this.name + mythos;
        // if (this.isOwner) {
        // 	if (this.name != this.tokenName && this.tokenName?.length) {
        // 		return owner_name + ` / ${this.tokenName}`;
        // 	}
        // 	return owner_name;
        // }
        // return this.tokenName ?? this.name;
    }
    get tokenName() {
        return this.prototypeToken.name;
    }
    getDisplayedName() {
        if (this.name == SceneTags.SCENE_CONTAINER_ACTOR_NAME) {
            return "Scene";
        }
        if (this.isToken && this.token) {
            return this.token.name;
        }
        const controlled = () => {
            const tokens = this.getActiveTokens();
            const controlled = tokens.find(tok => tok.controlled);
            if (controlled) {
                return controlled.name;
            }
            const owned = canvas?.tokens?.ownedTokens?.find(tok => tok.actor == this);
            if (owned) {
                return owned.name;
            }
            return null;
        };
        return this?.token?.name
            ?? controlled()
            ?? this?.token?.name
            ?? this?.prototypeToken?.name
            ?? this?.name
            ?? "My Name is Error";
    }
    getDependencies() {
        switch (this.system.type) {
            case "crew":
                if (this.isOwner) {
                    return game.actors.contents
                        .filter((act) => {
                        return act.isPC()
                            && act.isOwner
                            && act.crewTheme?.parent == this;
                    });
                }
                break;
            case "threat":
                if (this.name == SceneTags.SCENE_CONTAINER_ACTOR_NAME) {
                    return [];
                }
                if (this.isOwner && this.getThemes().length > 0) {
                    return game.actors.contents
                        .filter((act) => {
                        return act.isPC()
                            && act.isOwner
                            && act.activeExtra != null
                            && this.mainThemes.includes(act.activeExtra);
                    });
                }
                break;
            case "character":
                return [];
            default:
                console.error(`Unknown type ${this.type}`);
                return [];
        }
        return [];
    }
    hasFlashbackAvailable() {
        return !this.system?.flashback_used;
    }
    async expendFlashback() {
        await this.update({ "system.flashback_used": true });
    }
    async refreshFlashback() {
        await this.update({ "system.flashback_used": false });
    }
    async sessionEnd() {
        const items = [];
        const improvements = [
            this.crewThemes.flatMap(theme => theme.improvements()),
            this.allLinkedExtraThemes.flatMap(theme => theme.improvements()),
            this.items.contents.flatMap(x => x.isImprovement() ? [x] : []),
        ].flat();
        for (const imp of improvements) {
            if (await imp.refreshImprovementUses()) {
                items.push(imp.name);
            }
        }
        if (this.system.type == "character" && !this.hasFlashbackAvailable()) {
            await this.refreshFlashback();
            items.push("Flashback");
        }
        return items;
    }
    async moveCrewSelector(amount) {
        const crewTheme = this.activeCrew;
        if (!crewTheme) {
            return;
        }
        const list = this.crewThemes;
        const ind = list.findIndex(x => x.id == crewTheme.id);
        const newIndex = (ind + amount) % list.length;
        const newCrew = list[newIndex];
        const newId = newCrew.id;
        await this.update({ "system.activeCrewId": newId });
        if (!game.user.isGM) {
            const msg = localize("CityOfMist.logger.action.changeActiveCrew");
            await CityLogger.modificationLog(this, msg, newCrew);
        }
    }
    async moveExtraSelector(amount) {
        const activeExtra = this.activeExtra;
        if (!activeExtra) {
            return;
        }
        const list = this.allLinkedExtraThemes;
        const ind = list.findIndex(x => x.id == activeExtra.id);
        const newIndex = (ind + amount) % list.length;
        const newExtra = list[newIndex];
        const newId = newExtra.id;
        await this.update({ "system.activeExtraId": newId });
        if (!game.user.isGM) {
            const msg = localize("CityOfMist.logger.action.changeActiveExtra");
            await CityLogger.modificationLog(this, msg, newExtra);
        }
    }
    hasEntranceMoves() {
        return this.getGMMoves()
            .some(x => x.system.subtype == "entrance");
    }
    async executeEntranceMoves(token) {
        if (!game.user.isGM) {
            return;
        }
        if (!CityHelpers.entranceMovesEnabled()) {
            return;
        }
        const moves = this.getGMMoves()
            .filter(x => x.system.subtype == "entrance");
        if (CityHelpers.autoExecEntranceMoves()
            || await HTMLTools.confirmBox(`Run enter Scene Moves for ${token.name}`, `Run Enter scene moves for ${token.name}`)) {
            for (const move of moves) {
                await this.executeGMMove(move);
            }
        }
    }
    async executeGMMove(move, actor) {
        const { taglist, statuslist, html } = await move.prepareToRenderGMMove(this);
        const speaker = actor ? { alias: actor.getDisplayedName() } : {};
        if (await CityHelpers.sendToChat(html, speaker)) {
            await CityHelpers.processTextTagsStatuses(taglist, statuslist, this);
        }
    }
    async undoGMMove(move) {
        const { taglist, statuslist } = move.formatGMMoveText(this);
        for (const { name: tagname } of taglist) {
            await this.deleteStoryTagByName(tagname);
        }
        for (const { name } of statuslist) {
            await this.deleteStatusByName(name);
        }
    }
    async addOrCreateStatus(name2, options) {
        const pips = options.pips ?? 0;
        const tier2 = options.tier;
        const status = this.hasStatus(name2);
        if (status) {
            return await status.addStatus(tier2, options);
        }
        else {
            return await this.createNewStatus(name2, tier2, pips, options);
        }
    }
    async undoEntranceMoves(token) {
        if (!game.user.isGM) {
            return;
        }
        if (!CityHelpers.entranceMovesEnabled()) {
            return;
        }
        const moves = this.getGMMoves()
            .filter(x => x.system.subtype == "entrance");
        if (CityHelpers.autoExecEntranceMoves()
            || await HTMLTools.confirmBox(`Undo Enter Scene Moves for ${token.name}`, `Undo Enter scene moves for ${token.name}`)) {
            for (const move of moves) {
                await this.undoGMMove(move);
            }
        }
    }
    async addTemplate(id) {
        this.system.template_ids.push(id);
        return await this.update({ "system.template_ids": this.system.template_ids });
    }
    async removeTemplate(id) {
        const templates = this.system.template_ids.filter(x => x != id);
        return await this.update({ "system.template_ids": templates });
    }
    hasTemplate(id) {
        if (!this?.system?.template_ids) {
            return false;
        }
        return this.system.template_ids.includes(id);
    }
    async onDowntime() {
        //placeholder may use later
    }
    canUseMove(move) {
        const rolltype = move.system.subtype;
        switch (rolltype) {
            case "themeclassroll":
                if (this.getNumberOfThemes(move.system.theme_class) == 0) {
                    return false;
                }
                break;
            case "noroll":
            case "standard":
                break;
            case "SHB":
                break;
            default:
                rolltype;
                throw new Error(`Unknown Move Type ${rolltype}`);
        }
        if (move.system.abbreviation == "FLASH" && !this.hasFlashbackAvailable()) {
            return false;
        }
        if (move.hasEffectClass("MIST") && this.getNumberOfThemes("Mist") <= 0) {
            return false;
        }
        if (move.hasEffectClass("MYTHOS") && this.getNumberOfThemes("Mythos") <= 0) {
            return false;
        }
        return true;
    }
    purgeInvalidItems() {
        //@ts-expect-error invalid doc stuff which isn't a part of foundry types
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        const invalid = Array.from(this.items.invalidDocumentIds);
        //@ts-expect-error invalid doc stuff which isn't a part of foundry types
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        invalid.forEach(id => this.items.getInvalid(id).delete());
    }
    async createLoadoutTheme() {
        const themebook = CityDB.getLoadoutThemebook();
        if (!themebook) {
            throw new Error("Can't create Loadout theme: No valid Loadout theme exists");
        }
        const system = {
            themebook_id: themebook.id,
            themebook_name: themebook.name,
            unspent_upgrades: 0,
            nascent: false,
        };
        const obj = {
            name: "__LOADOUT__",
            type: "theme",
            system
        };
        console.log("Loadout theme created");
        return await this.createNewItem(obj);
    }
    async createLoadoutTag() {
        const theme = this.loadout;
        if (!theme) {
            throw new Error(`Can't find Loadout Theme`);
        }
        const obj = {
            name: "Unnamed Loadout Tag",
            type: "tag",
            system: {
                subtype: "loadout",
                crispy: false,
                question_letter: "_",
                custom_tag: true,
                theme_id: theme.id,
            }
        };
        return await this.createNewItem(obj);
    }
    async createLoadoutWeakness(masterTagId) {
        const theme = this.loadout;
        if (!theme) {
            throw new Error(`Can't find Loadout Theme`);
        }
        const masterTag = this.loadout.tags().find(x => x.id == masterTagId);
        if (!masterTag) {
            throw new Error(`Can't find Master Tag: ${masterTagId}`);
        }
        const obj = {
            name: "Unnamed Weakness Tag",
            type: "tag",
            system: {
                subtype: "weakness",
                crispy: false,
                question_letter: "_",
                custom_tag: true,
                parentId: masterTagId,
                theme_id: theme.id,
            }
        };
        return await this.createNewItem(obj);
    }
    async toggleLoadoutTagActivation(loadoutTagId) {
        const theme = this.loadout;
        if (!theme) {
            throw new Error(`Can't find Loadout Theme`);
        }
        const tag = theme.tags().find(x => x.id == loadoutTagId);
        if (!tag) {
            throw new Error(`No such tag exists on loadout theme with Id ${loadoutTagId}`);
        }
        return await tag.toggleLoadoutActivation();
    }
    async setEssence(essence) {
        if (essence.systemName) {
            await this.update({ "system.essence.systemName": essence.systemName });
        }
        else {
            await this.update({ "system.essence.systemName": essence.id });
        }
        return this;
    }
    async setEssenceBurn(val, sound = true) {
        if (val && !this.system.essence.isBurned && sound) {
            void CityHelpers.playBurn();
        }
        await this.update({ "system.essence.isBurned": val });
    }
    get isEssenceBurned() {
        switch (this.system.type) {
            case "character":
                return this.system.essence.isBurned;
            case "threat":
            case "crew":
                break;
            default:
                this.system;
        }
        return false;
    }
    async clearEssence() {
        await this.update({ "system.essence": "" });
        return this;
    }
    get essence() {
        if (this.system.type != "character") {
            return undefined;
        }
        const ess = CityDB.getEssenceBySystemName(this.system.essence.systemName);
        if (ess) {
            return ess;
        }
        return CityDB.getEssence(this.system.essence.systemName);
    }
} //end of class
Hooks.on("updateActor", async (act) => {
    const actor = act;
    if (actor.isDanger()) {
        await actor.updateCollectiveStatus();
    }
});
