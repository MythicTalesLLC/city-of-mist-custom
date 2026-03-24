import { SystemModule } from "./config/system-module.js";
import { StatusMath } from "./status-math.js";
import { localize } from "./city.js";
import { localizeS } from "./tools/handlebars-helpers.js";
import { CityDB } from "./city-db.js";
import { CityActor } from "./city-actor.js";
import { ClueChatCards } from "./clue-cards.js";
import { SelectedTagsAndStatus } from "./selected-tags.js";
import { CityDialogs } from "./city-dialogs.js";
import { CityHelpers } from "./city-helpers.js";
import { TagAndStatusCleanupSessionM } from "./city-sessions.js";
import { CitySockets } from "./city-sockets.js";
import { CityLogger } from "./city-logger.js";
import { CitySettings } from "./settings.js";
export class CityItem extends Item {
    getCrack() {
        return this.system.crack.reduce((acc, i) => acc + i, 0);
    }
    getAttention() {
        return this.system.attention.reduce((acc, i) => acc + i, 0);
    }
    /*
    Options for effect_class on improvmeents;
        THEME_DYN_SELECT: select a type of core move that is now dynamite when using tags from this theme.
        THEME_DYN_FACE: WHen using tag from this theme, face danger is dyanmtie
        THEME_DYN_HIT: WHen using tag from this theme, HWAYG is dyanmtie
        THEME_DYN_CHANGE: WHen using tag from this theme, CtG is dyanmtie
        OPTION_FACE_X: X is some number 0-9, unlocks extra options in moves (future)
        THEME_TAG_SELECT: used to tell choice type to select a tag

*/
    hasEffectClass(cl) {
        return this.effect_classes.includes(cl);
    }
    canImprove() {
        return SystemModule.themeIncreaseName(this).length > 0;
    }
    hasMotivation() {
        return SystemModule.themeIdentityName(this).length > 0;
    }
    isAutoDynamite() {
        return this.hasEffectClass("AUTODYN");
    }
    get description() {
        switch (true) {
            case this.isTag():
                try {
                    const TBOrTK = this.getThemebookOrTK();
                    if (TBOrTK && TBOrTK.isThemeKit()) {
                        const x = this.subtype;
                        switch (x) {
                            case "power":
                            case "weakness": {
                                const tags = TBOrTK.themekit_getTags(x);
                                return tags.find(x => x.tagname == this.name)?.description ?? "";
                            }
                            default:
                                return this.system.description;
                        }
                    }
                    else {
                        return this.system.description;
                    }
                }
                catch (e) {
                    console.error(e);
                }
                break;
            case this.isImprovement():
                {
                    //special case here for damaged data that came from a bug where the name was getting copied as the description for themebook improvments
                    if (this.name == this.system.description) {
                        const TB = this.getThemebookAbsolute();
                        if (!TB) {
                            return "";
                        }
                        const improvements = TB.themebook_getImprovements();
                        const index = improvements.findIndex(imp => imp.name == this.name);
                        if (index == -1) {
                            return "";
                        }
                        return SystemModule.active.localizedThemeBookData(TB, "improvement-description", index);
                    }
                }
                break;
            default:
                break;
        }
        if ("description" in this.system) {
            return SystemModule.active.localizedDescription(this);
            // return this.system.description;
        }
        return "";
    }
    get effect_classes() {
        if ("effect_class" in this.system) {
            return this?.system?.effect_class?.split(" ") ?? [];
        }
        return [];
    }
    get submoves() {
        if (!this.parent) {
            return [];
        }
        if (this.system.type != "gmmove") {
            return [];
        }
        return this.parent.getGMMoves().
            filter(tag => tag.system.superMoveId == this.id);
    }
    get subtags() {
        if (!this.parent) {
            return [];
        }
        if (this.system.type != "tag") {
            return [];
        }
        return this.parent.getTags().
            filter(tag => tag.system.parentId == this.id);
    }
    get baseTags() {
        if (!this.parent) {
            return [];
        }
        if (this.system.type != "theme") {
            return [];
        }
        return this.parent.getTags(this.id)
            .filter(x => !x.system.parentId);
    }
    get isMissingParent() {
        return this.system.type == "tag" &&
            this.system.subtagRequired
            && !this.system.parentId;
    }
    get isShowcased() {
        return ("showcased" in this.system && this.system?.showcased) ?? false;
    }
    isDowntimeTriggeredMove() {
        return this.system.subtype == "downtime";
    }
    get subtype() {
        switch (true) {
            case this.isThemeBook(): return this.system.subtype;
            case this.isThemeKit(): {
                let themebook = null;
                try {
                    themebook = this.getThemebookOrTK();
                }
                catch (e) {
                    console.log(e);
                }
                return themebook?.subtype ?? this.system.subtype;
            }
            case this.isStatus(): return "";
            case this.isTag(): return this.system.subtype;
            default:
                if ("subtype" in this.system) {
                    return this.system.subtype;
                }
        }
        return "";
    }
    /** returns true if tag or improvement is part of a theme kit
    */
    isPartOfThemeKit() {
        if (this.system.type != "tag" && this.system.type != "improvement") {
            return false;
        }
        const TBOrTK = this.getThemebookOrTK();
        if (!TBOrTK) {
            return false;
        }
        if (this.isTag() && this.isBonusTag()) {
            return false;
        }
        return TBOrTK.isThemeKit();
    }
    usesThemeKit() {
        return this.system.type == "theme" && this.getThemebookOrTK() && this.getThemebookOrTK()?.isThemeKit();
    }
    isStoryTag() {
        return this.isTag() && this.subtype == "story";
    }
    isPowerTag() {
        return this.isTag() && this.subtype == "power";
    }
    isTag() { return this.system.type == "tag"; }
    isImprovement() { return this.system.type == "improvement"; }
    ;
    isTheme() { return this.system.type == "theme"; }
    ;
    isThemeKit() { return this.system.type == "themekit"; }
    isThemeBook() { return this.system.type == "themebook"; }
    isExtraTheme() { return this.system.isExtra; }
    isMove() { return this.system.type == "move"; }
    isGMMove() { return this.system.type == "gmmove"; }
    isClue() { return this.system.type == "clue"; }
    isSpectrum() { return this.system.type == "spectrum"; }
    isEssence() { return this.system.type == "essence"; }
    isRelationshipTag() {
        return this.system.type == "tag" && this.system.subtype == "relationship";
    }
    get systemCompatiblity() {
        switch (this.system.type) {
            case "themebook":
            case "move":
                return this.system.system_compatiblity;
            case "themekit": {
                const tb = this.getThemebookOrTK();
                if (tb) {
                    return tb.systemCompatiblity;
                }
                return this.system.system_compatiblity;
            }
            case "tag": {
                const tb = this.getThemebookOrTK();
                if (tb) {
                    return tb.systemCompatiblity;
                }
                return "any";
            }
            case "improvement": {
                const tb = this.getThemebookOrTK();
                if (tb) {
                    return tb.systemCompatiblity;
                }
                return this.system.system_compatiblity;
            }
            case "theme": {
                const tb = this.getThemebookOrTK();
                if (tb) {
                    return tb.systemCompatiblity;
                }
                return "any";
            }
            case "clue":
            case "juice":
                return "any"; // technically this should only be CoM but I'm including it for potential mixed rules customs
            case "spectrum":
            case "journal":
            case "status":
            case "gmmove":
                return "any";
            case "essence":
                return this.system.system_compatiblity;
            default:
                this.system;
                return "any";
        }
    }
    isCompatible(system = SystemModule.active.name) {
        const compat = this.systemCompatiblity;
        if (compat == "any") {
            return true;
        }
        return compat == system;
    }
    isImprovementActivated(move_id) {
        const move = CityHelpers.getMoveById(move_id);
        const moveAbbr = move ? move.system.abbreviation : "NULL_MOVE";
        if (!this.system.effect_class) {
            return false;
        }
        if (this.hasEffectClass(`ALWAYS_DYN_${moveAbbr}`)) {
            return true;
        }
        const theme = this.parent?.getTheme(this.system.theme_id);
        if (theme) {
            const hasThemeTagActivated = SelectedTagsAndStatus
                .getPlayerActivatedTagsAndStatusItems()
                .filter(x => x.system.type == "tag" && x.system.theme_id == theme.id)
                .length > 0;
            if (this.hasEffectClass(`THEME_DYN_${moveAbbr}`)) {
                return hasThemeTagActivated;
            }
            if (this.hasEffectClass("THEME_DYN_SELECT") && this.system.choice_item == (move ? move.name : "NULL_MOVE")) {
                return hasThemeTagActivated;
            }
            return false;
        }
    }
    isWeaknessTag() {
        return this.isTag() && this.subtype == "weakness";
    }
    getActivatedEffect() {
        // console.log(`Getting Activated Efect for ${this.name}`);
        if (this.system.effect_class.includes("DYN")) {
            return { dynamite: true };
        }
        return {};
    }
    getChoiceType() {
        if (this.system.effect_class?.includes("THEME_DYN_SELECT")) {
            return "core_move";
        }
        if (this.system.effect_class?.includes("THEME_TAG_SELECT")) {
            return "theme_tag";
        }
        else {
            return "";
        }
    }
    getThemeType() {
        // return logos/mythos
        const themebook = this.getThemebookOrTK();
        if (themebook == null) {
            console.log(`Can't find themebook for theme ${this.name}`);
            throw new Error("ERROR Can't find themebook!");
        }
        if (themebook.isThemeKit()) {
            if (themebook.getThemebookOrTK()) {
                return themebook.getThemeType();
            }
            const subtype = themebook.system.subtype;
            if (!subtype) {
                return "Crew";
            }
            return subtype;
        }
        if (themebook.system.subtype != undefined) {
            const bookType = themebook.system.subtype;
            if (bookType) {
                return bookType;
            }
            const myType = this.system.subtype;
            if (myType) {
                return myType;
            }
            const list = SystemModule.active.themeTypes();
            const val = Object.keys(list).at(0);
            if (val) {
                return val;
            }
        }
        throw new Error(`Can't get theme type of ${this.name}`);
    }
    canHaveVariableThemeType() {
        if (this.isThemeBook()) {
            return this.system.subtype == "";
        }
        if (this.isThemeKit()) {
            if (this.system.subtype != "") {
                return false;
            }
            const realTB = this.getThemebookOrTK();
            if (realTB) {
                return realTB.canHaveVariableThemeType();
            }
            return this.system.subtype == "";
        }
        const themebook = this.getThemebookOrTK();
        if (!themebook) {
            throw new Error("ERROR Can't find themebook!");
        }
        return themebook.canHaveVariableThemeType();
    }
    async toggleThemeType() {
        if (!this.canHaveVariableThemeType()) {
            return;
        }
        const themes = SystemModule.active.themeTypes();
        const list = Object.keys(themes).filter(x => {
            const r = themes[x];
            if (!r) {
                return false;
            }
            if (!r.increaseLocalization) {
                return false;
            }
            if (!r.identityName) {
                return false;
            }
            return !r.specials || !r.specials.includes("loadout");
        });
        const current = this.getThemeType();
        const index = list.indexOf(current);
        let newChoice;
        if (index == -1) {
            newChoice = list[0];
        }
        if (index == -1 || index + 1 >= list.length) {
            newChoice = list[0];
        }
        else {
            newChoice = list[index + 1];
        }
        await this.update({ "system.subtype": newChoice });
    }
    /** always gets an actual themebook or null */
    getThemebookAbsolute() {
        if (this.isTag() || this.isImprovement()) {
            const theme = this.theme;
            if (!theme) {
                return null;
            }
            return theme.getThemebookAbsolute();
        }
        if (this.isTheme() || this.isThemeKit()) {
            const maybeTB = this.getThemebookOrTK();
            if (!maybeTB) {
                return null;
            }
            if (maybeTB.isThemeBook()) {
                return maybeTB;
            }
            return maybeTB.getThemebookAbsolute();
        }
        if (this.isThemeBook()) {
            return this;
        }
        this;
        return null;
    }
    /** gets themebook or themekit from a theme or themekit */
    getThemebookOrTK() {
        if (this.isTag() || this.isImprovement()) {
            const theme = this.theme;
            if (!theme) {
                return null;
            }
            return theme.getThemebookOrTK();
        }
        const actor = this.parent;
        if (!actor && this.system.type != "themekit") {
            Debug(this);
            return null;
        }
        const id = this.system.themebook_id;
        const name = this.system.themebook_name;
        if (!name && !id) {
            return null;
        }
        try {
            const tb = actor?.items?.find(x => x.id == id) ??
                CityDB.getThemebook(name, id);
            if (!tb) {
                console.error(`Can't find themebook for ${this.system.themebook_id} on ${this.name}`);
                return null;
            }
            return tb;
        }
        catch (e) {
            console.error(e);
            return null;
        }
    }
    /** @deprecated use getThemebookOrTK or getThemebookAbsolute instead
    gets themebook or themekit from a theme or themekit
     */
    getThemebook() {
        const actor = this.parent;
        if (!actor && this.system.type != "themekit") {
            Debug(this);
            return null;
        }
        const id = this.system.themebook_id;
        const name = this.system.themebook_name;
        if (!name && !id) {
            return null;
        }
        try {
            const tb = actor?.items?.find(x => x.id == id) ??
                CityDB.getThemebook(name, id);
            if (!tb) {
                console.error(`Can't find themebook for ${this.system.themebook_id} on ${this.name}`);
                return null;
            }
            return tb;
        }
        catch (e) {
            console.error(e);
            return null;
        }
    }
    get mainTags() {
        if (this.system.type != "theme") {
            throw new Error("Can only get mainTags of a theme");
        }
        return this.tags().filter(x => !x.system.parentId);
    }
    tags() {
        if (!this.parent) {
            return [];
        }
        return this.parent.items.filter(x => x.system.type == "tag" && x.system.theme_id == this.id);
    }
    improvements() {
        if (!this.parent) {
            return [];
        }
        return this.parent.items.filter(x => x.system.type == "improvement" && x.system.theme_id == this.id);
    }
    /** returns the amount of Build Up points a theme is worth
    */
    getBuildUpValue() {
        const tagValue = this.tags().reduce((a, tag) => tag.upgradeCost() + a, 0);
        const impValue = this.improvements().reduce((a, imp) => a + imp.upgradeCost(), 0);
        return Math.max(0, impValue + tagValue - 3);
    }
    developmentLevel() {
        //for themes
        const powertags = this.tags().filter(x => x.system.subtype == "power" && !x.isBonusTag());
        const weaktags = this.tags().filter(x => x.system.subtype == "weakness");
        const attention = this.attention() / 100; //setup as a decimal tie-breaker
        const improvements = this.improvements();
        const unspent = this.system.unspent_upgrades;
        const devel = powertags.length - Math.max(0, weaktags.length - 1) + improvements.length + unspent + attention;
        if (Number.isNaN(devel)) {
            throw new Error("NAN");
        }
        return devel;
    }
    /** gets the relevant question from a themebook
    type is "power" or "weakness"
    */
    getQuestion(type, letter) {
        if (this.system.type != "themebook") {
            throw new Error("Can only be run on a themebook");
        }
        switch (type) {
            case "power":
                break;
            case "weakness":
                break;
            default: throw new Error(`bad type: ${type}`);
        }
        const system = this.system[`${type}_questions`][letter];
        if (system == "_DELETED_") {
            throw new Error("Question is deleted");
        }
        return system.question;
    }
    // async addPowerTag(this: ThemeKit) {
    // 	if (!this.isThemeKit())
    // 		throw new Error("trying to add power tag to non-theme kit");
    // 	// const powerTags = Array.from(Object.values({...this.system.power_tagstk}));
    // 	const powerTags = this.system.power_tagstk;
    // 	const letters = Array.from("ABCDEFGHIJ");
    // 	const letter = letters.reduce( (acc, l) => {
    // 		if (acc) return acc;
    // 		if (powerTags.some( x=> x.letter == l)) return acc;
    // 		return l;
    // 	}, null);
    // 	if (!letter) {
    // 		ui.notifications.error("Max number of power tags reached");
    // 		return;
    // 	}
    // 	const description = "";
    // 	powerTags.push( {tagname: "Unnamed Tag", letter, description});
    // 	powerTags.sort( (a,b) => a.letter.localeCompare(b.letter));
    // 	const powerTagsObj = Object.assign({}, powerTags);
    // 	await this.update({ "system.power_tagstk": "x"});
    // 	await this.update({ "system.power_tagstk": powerTagsObj});
    // }
    // async addWeaknessTag(this: ThemeKit) {
    // 	if (!this.isThemeKit())
    // 		throw new Error("trying to add tag to non-theme kit");
    // 	const weakTags = this.system.weakness_tagstk;
    // 	const letters = Array.from("ABCDE");
    // 	const letter = letters.reduce( (acc, l) => {
    // 		if (acc) return acc;
    // 		if (weakTags.some( x=> x.letter == l)) return acc;
    // 		return l;
    // 	}, null);
    // 	if (!letter) {
    // 		ui.notifications.error("Max number of weakness tags reached");
    // 		return;
    // 	}
    // 	const description = "";
    // 	weakTags.push( {tagname: "Unnamed Tag", letter, description});
    // 	weakTags.sort( (a,b) => a.letter.localeCompare(b.letter));
    // 	await this.update( {"system.weakness_tagstk": 0});
    // 	const weakTagsObj = Object.assign({}, weakTags);
    // 	// console.log(weakTagsObj);
    // 	await this.update( {"system.weakness_tagstk": weakTagsObj});
    // }
    /** add an improvement to a theme kit
    */
    async addImprovement() {
        if (!this.isThemeKit()) {
            throw new Error("trying to add tag to non-theme kit");
        }
        const imps = Array.from(Object.values(this.system.improvements));
        const description = "";
        imps.push({
            name: "Unnamed Improvement",
            description,
            uses: 0,
            effect_class: ""
        });
        //clear the object
        await this.update({ "system.improvements": 0 });
        const impObj = Object.assign({}, imps);
        await this.update({ "system.improvements": impObj });
    }
    /** delete a tag or improvement from a themekit
    type : "power" || "weakness" || "improvement"
     */
    async deleteTagOrImprovement(index, type = "power") {
        //NOTE: MAY HAVE ERRORS, was rewritten for TS
        switch (type) {
            case "power": {
                const tags = Array.from(Object.values(this.system.power_tagstk));
                tags.splice(index, 1);
                tags.sort((a, b) => a.letter.localeCompare(b.letter));
                const tagsObj = Object.assign({}, tags);
                await this.update({ "system.power_tagstk": tagsObj });
                console.log(tagsObj);
                break;
            }
            case "weakness": {
                const tags = Array.from(Object.values(this.system.weakness_tagstk));
                tags.splice(index, 1);
                tags.sort((a, b) => a.letter.localeCompare(b.letter));
                const tagsObj = Object.assign({}, tags);
                await this.update({ "system.weakness_tagstk": tagsObj });
                break;
            }
            case "improvement": {
                const improvements = Array.from(Object.values(this.system.improvements));
                improvements.splice(index, 1);
                const impObj = Object.assign({}, improvements);
                await this.update({ "system.improvements": impObj });
                break;
            }
        }
        // tags.splice(index, 1);
        // if ("letter" in tags[0]) {
        // 	tags.sort( (a,b) => a.letter!.localeCompare(b.letter!));
        // }
        // const tagsObj = Object.assign({}, tags);
        // let clearObj  = {};
        // clearObj[`system.${listname}`]  = 0;
        // let updateObj  = {};
        // updateObj[`system.${listname}`]  = tagsObj;
        // await this.update(clearObj);
        // await this.update(updateObj);
        // await this.update( "system.
    }
    expendsOnUse() {
        switch (this.system.type) {
            case "tag": return this.isTemporary();
            case "status": return this.isTemporary();
            case "juice": return true;
            case "clue": return true;
            default: return false;
        }
    }
    upgradeCost() {
        switch (this.system.type) {
            case "tag":
                return this.isBonusTag() ? 0 : 1;
            case "improvement":
                return 1;
            default:
                throw new Error(`Trying to get upgrade cost of ${this.system.type}`);
        }
    }
    isBonusTag() {
        return this.system.question == "_" || this.system.custom_tag;
    }
    async destroyThemeMessage() {
        await CityLogger.rawHTMLLog(this.parent, await this.printDestructionManifest(0), false);
    }
    async destructionTest() {
        return CityLogger.rawHTMLLog(this.parent, await this.printDestructionManifest(0), false);
    }
    async printDestructionManifest(BUImpGained = 0) {
        //used on themes and returns html string
        const BUGenerated = this.getBuildUpValue();
        const tagdata = this.tags();
        const impdata = this.improvements();
        const templateData = {
            BUGenerated, owner: this.parent, theme: this, tags: tagdata, improvements: impdata, BUImpGained
        };
        const manifest = await foundry.applications.handlebars.renderTemplate("systems/city-of-mist/templates/theme-destruction.html", templateData);
        return manifest.replaceAll("\n", "");
    }
    get crack() {
        if (!("crack" in this.system)) {
            throw new Error(`Can't get crack on ${this.system.type}`);
        }
        const crack = this.system?.crack;
        return crack.reduce((acc, v) => acc + v, 0);
    }
    get fade() {
        return this.crack;
    }
    get milestone() {
        if (!("crack" in this.system)) {
            throw new Error(`Can't get crack on ${this.system.type}`);
        }
        const milestones = this.system?.crack;
        return milestones.reduce((acc, v) => acc + v, 0);
    }
    get powerTags() {
        if (!this.parent) {
            return [];
        }
        if (this.system.type == "theme" || this.system.type == "themekit") {
            return this.parent
                .getTags(this.id, "power")
                .sort((a, b) => {
                if (a.isBonusTag() && !b.isBonusTag()) {
                    return 1;
                }
                if (b.isBonusTag() && !a.isBonusTag()) {
                    return -1;
                }
                return a.system.question_letter.localeCompare(b.system.question_letter);
            });
        }
        return [];
    }
    /** The A tag for otherscape that names a theme */
    get headerTag() {
        const header = this.powerTags[0];
        if (!header) {
            return [];
        }
        return [header];
    }
    /** The secondary tags other than main in Otherscape*/
    get otherPowerTags() {
        const tags = this.powerTags;
        tags.shift();
        return tags;
    }
    async addFade(amount = 1) {
        //Proboably doesn't work for non 1 values
        const arr = this.system.crack;
        const moddata = CityHelpers.modArray(arr, amount);
        const newArr = moddata[0];
        await this.update({ system: { crack: newArr } });
        return !!moddata[1];
    }
    async removeFade(amount = -1) {
        //Proboably doesn't work for non 1 values
        const arr = this.system.crack;
        if (arr[0] == 0) {
            return false;
        } //Can't remove if there's no crack
        const moddata = CityHelpers.modArray(arr, -amount);
        const newArr = moddata[0];
        await this.update({ system: { crack: newArr } });
        return !!moddata[1];
    }
    async addMilestone(amount = 1) {
        const arr = this.system.milestone;
        const trackName = SystemModule.themeThirdTrackName(this);
        const moddata = CityHelpers.modArray(arr, amount);
        const newArr = moddata[0];
        await this.update({ system: { milestone: newArr } });
        await CityHelpers.modificationLog(this.parent, `${trackName} Gained `, this, `Current ${this.milestone}`);
        return !!moddata[1];
    }
    async removeMilestone(amount = -1) {
        const arr = this.system.milestone;
        const trackName = SystemModule.themeThirdTrackName(this);
        if (arr[0] == 0) {
            return false;
        } //Can't remove if there's no crack
        const moddata = CityHelpers.modArray(arr, -amount);
        const newArr = moddata[0];
        await this.update({ system: { milestone: newArr } });
        await CityHelpers.modificationLog(this.parent, `${trackName} Removed `, this, `Current ${this.milestone}`);
        return !!moddata[1];
    }
    async resetFade() {
        let unspent_upgrades = this.system.unspent_upgrades;
        unspent_upgrades--;
        const crack = [0, 0, 0];
        await this.update({ system: { crack, unspent_upgrades } });
    }
    async addAttention(amount = 1) {
        //Proboably doesn't work for non 1 values
        const arr = this.system.attention;
        const moddata = CityHelpers.modArray(arr, amount);
        const newArr = moddata[0];
        let extra_upgrades = moddata[1];
        let unspent_upgrades = this.system.unspent_upgrades + extra_upgrades;
        let nascent = this.system.nascent;
        if (nascent && arr[0] == 0) {
            extra_upgrades++;
            unspent_upgrades++;
        }
        else if (extra_upgrades > 0) {
            nascent = false;
        }
        await this.update({ system: { attention: newArr, unspent_upgrades, nascent } });
        await CityHelpers.modificationLog(this.parent, `Attention Gained `, this, `Current ${this.getAttention()}`);
        return extra_upgrades;
    }
    async removeAttention(amount = 1) {
        //Proboably doesn't work for non 1 values
        const arr = this.system.attention;
        const moddata = CityHelpers.modArray(arr, -amount);
        const newArr = moddata[0];
        let extra_upgrades = moddata[1];
        let unspent_upgrades = this.system.unspent_upgrades + extra_upgrades;
        let nascent = this.system.nascent;
        if (nascent && newArr[0] == 0) {
            extra_upgrades--;
            unspent_upgrades--;
        }
        else if (extra_upgrades > 0) {
            nascent = false;
        }
        await this.update({ system: { attention: newArr, unspent_upgrades, nascent } });
        await CityHelpers.modificationLog(this.parent, `Attention removed`, this, `Current ${this.getAttention()}`);
        return extra_upgrades;
    }
    attention() {
        return this.system.attention.reduce((acc, x) => acc + x, 0);
    }
    async incUnspentUpgrades() {
        return await this.update({ "system.unspent_upgrades": this.system.unspent_upgrades + 1 });
    }
    async burnTag(state = 1) {
        if (!this.parent) {
            throw new Error("Can't burn a parentless tag");
        }
        if (this.isOwner) {
            await this.update({ "system.burn_state": state });
            await this.update({ "system.burned": state > 0 });
            if (state == 3) {
                void CityHelpers.playBurn();
            }
        }
        else {
            const session = new TagAndStatusCleanupSessionM("burn", this.id, this.parent.id, this.parent.tokenId, state != 0);
            await CitySockets.execSession(session);
            if (state == 3) {
                void CityHelpers.playBurn();
            }
            await CityHelpers.playBurn();
        }
    }
    get isBurnable() {
        return !this.isBurned() && !this.isWeaknessTag();
    }
    isBurned() {
        switch (this.system.type) {
            case "tag":
                return this.system.burned && this.system.burn_state != 0;
            default:
                return false;
        }
    }
    getImprovements() {
        if (!this.parent) {
            return [];
        }
        return this.parent.getImprovements(this.id);
    }
    getImprovementUses() {
        return (this.system.uses?.max) > 0 ? this.system.uses.current : Infinity;
    }
    async decrementImprovementUses() {
        const uses = this.getImprovementUses();
        if (uses <= 0) {
            throw new Error(`Trying to Decrement 0 uses on ${this.name}`);
        }
        if (uses > 999) {
            return;
        }
        const newUses = uses - 1;
        await this.update({ "system.uses.current": newUses });
        if (newUses <= 0) {
            await this.update({ "system.uses.expended": true });
        }
    }
    async refreshImprovementUses() {
        const uses = this.getImprovementUses();
        if (uses > 999) {
            return false;
        }
        if (this.getImprovementUses() == this.system?.uses?.max) {
            return false;
        }
        await this.update({ "system.uses.current": this.system?.uses?.max });
        await this.update({ "system.uses.expended": false });
        return true;
    }
    get tier() {
        if (this.system.type != "status") {
            return 0;
        }
        return this.system.tier;
    }
    get pips() {
        if (this.system.type != "status") {
            return 0;
        }
        return this.system.pips;
    }
    async addStatus(tier, options) {
        const newName = options?.newName ?? this.name;
        const statusData = StatusMath.add(this, tier);
        await CityLogger.reportStatusAdd(this.parent, tier, this, { name: newName, ...statusData }, this);
        const status = await this.update({ name: newName, system: statusData });
        if (options.createdBy) {
            const arr = status.system.createdBy ?? [];
            for (const tagAcc of options.createdBy) {
                if (!arr
                    .some(x => CityDB.accessorEq(tagAcc, x))) {
                    arr.push(tagAcc);
                }
            }
            if (arr.length) {
                await status.update({ "system.createdBy": arr });
            }
        }
        return status;
    }
    /**shows status tier and pips potentially as a string*/
    get tierString() {
        if (this.system.type != 'status') {
            return "";
        }
        const displaySetting = CitySettings.get("statusDisplay");
        const system = CitySettings.get("statusAdditionSystem");
        switch (displaySetting) {
            case "tier-only":
                break;
            case "tier+pips":
                if (system == "mist-engine") {
                    break;
                }
                return new Handlebars.SafeString(`${this.system.tier}.${this.system.pips}`);
            case "tier+circles": {
                if (system != "mist-engine") {
                    break;
                }
                let pips = this.system.pips + (this.system.tier > 0 ? 1 << (this.system.tier - 1) : 0);
                const arr = [];
                while (pips > 0) {
                    arr.push(pips & 1 ? 1 : 0);
                    pips = pips >> 1;
                }
                const dots = arr.map(x => x
                    ? '<span class="filled-circle tracker-circle"></span>'
                    : '<span class="empty-circle-status tracker-circle"></span>').join("");
                return new Handlebars.SafeString(`<span class="dotStatus">${this.system.tier} ${dots} </span>`);
            }
        }
        return new Handlebars.SafeString(String(this.system.tier));
    }
    get pipString() {
        if (this.system.type != 'status') {
            return "";
        }
        if (CitySettings.isOtherscapeStatuses()) {
            let pips = this.system.pips + (this.system.tier > 0 ? 1 << (this.system.tier - 1) : 0);
            const arr = [];
            while (pips > 0) {
                arr.push(pips & 1 ? 1 : 0);
                pips = pips >> 1;
            }
            return arr.map(x => x
                ? '<span class="filled-circle tracker-circle"></span>'
                : '<span class="empty-circle-status tracker-circle"></span>').join("");
        }
        else {
            return `${this.system.pips} pips`;
        }
    }
    async subtractStatus(tier, replacename = null) {
        const newName = replacename ?? this.name;
        const statusData = StatusMath.subtract(this, tier);
        if (statusData.tier == 0) {
            await this.delete();
            return;
        }
        await CityLogger.reportStatusSubtract(this.parent, tier, this, { name: newName, ...statusData }, this);
        return await this.update({ name: newName, system: statusData });
    }
    /** returns the amount of status card boxes checked by a status, otherwise returns 0 for non-status
    works only for City of Mist style status and not Otherscape which has the potential for disjoint checked boxes
    */
    get boxesChecked() {
        if (this.system.type != "status") {
            return 0;
        }
        let { tier } = this.system;
        const { pips } = this.system;
        if (tier <= 0) {
            return 0;
        }
        let total = 1;
        while (--tier >= 1) {
            total += tier;
        }
        return total + pips;
    }
    /** sets the tier and pips based on the amount of status boxes checked, requires city of Mist system to do correctly, and assumes linear boxes.
    DOES NOT WORK WITH OTHERSCAPE
     */
    async setBoxesChecked(boxes) {
        boxes = Math.round(boxes);
        if (boxes <= 0) {
            await this.update({
                "system.pips": 0,
                "system.tier": 0
            });
            return;
        }
        let tier = 0;
        while (boxes >= tier) {
            boxes -= Math.max(1, tier++);
        }
        const pips = boxes;
        await this.update({
            "system.pips": pips,
            "system.tier": tier
        });
    }
    async addStatus_ME(tier, newname) {
        const pips = this.system.pips + (this.system.tier > 0 ? 1 << (this.system.tier - 1) : 0);
        while (pips & (1 << tier - 1)) {
            tier++;
            if (tier > 10) {
                throw new Error("Overflow");
            }
        }
        const newpips = pips + (1 << tier - 1);
        return await this.refreshStatus_otherscape(newpips, newname);
    }
    async refreshStatus_otherscape(newpips, newname = this.name) {
        let pips = newpips;
        let tier = 0;
        while (pips) {
            pips = pips >> 1;
            tier++;
        }
        pips = newpips - (tier > 0 ? (1 << tier - 1) : 0);
        return await this.update({ name: newname, system: { pips, tier } });
    }
    async decUnspentUpgrades() {
        const newval = this.system.unspent_upgrades - 1;
        if (newval < 0) {
            console.warn(`Possible Error: Theme ${this.name} lowered to ${newval} upgrade points`);
        }
        return await this.update({ "system.unspent_upgrades": newval });
    }
    async setField(field, val) {
        const system = {};
        system[field] = val;
        return await this.update({ system });
    }
    static generateMoveText(movedata, result, power = 1) {
        const numRes = CityItem.convertTextResultToNumeric(result);
        const sys = movedata.system;
        let html = "";
        html += localizeS(sys.always).toString();
        if (numRes == 2) {
            html += localizeS(sys.onSuccess).toString();
        }
        if (numRes == 3) {
            html += localizeS(sys.onDynamite).toString();
        }
        if (numRes == 1) {
            html += localizeS(sys.onPartial).toString();
        }
        if (numRes == 0) {
            html += localizeS(sys.onMiss).toString();
        }
        return CityItem.substitutePower(html, power);
    }
    static substitutePower(txt, power) {
        txt = txt.replace("PWR+3", String(Math.max(1, power + 3)));
        txt = txt.replace("PWR+2", String(Math.max(1, power + 2)));
        txt = txt.replace("PWR+1", String(Math.max(1, power + 1)));
        txt = txt.replace("PWRM4", String(Math.max(4, power)));
        txt = txt.replace("PWRM3", String(Math.max(3, power)));
        txt = txt.replace("PWRM2", String(Math.max(2, power)));
        txt = txt.replace("PWR/2", String(Math.max(1, Math.floor(power / 2))));
        txt = txt.replace("PWR", String(Math.max(1, power)));
        return txt;
    }
    static generateMoveList(movedata, result, power = 1) {
        const lists = movedata.system.listConditionals;
        const filterList = lists.filter(x => CityItem.meetsCondition(x.condition, result));
        return filterList.map(x => {
            const localizedText = `${localizeS(x.text).toString()}`;
            const origText = x.text;
            const text = CityItem.substitutePower(localizedText, power);
            const cost = x.cost; //change for some moves
            return { origText, text, cost };
        });
    }
    static getMaxChoices(movedata, result, power = 1) {
        const effectClass = movedata.system.effect_class ?? "";
        let resstr = null;
        switch (result) {
            case "Dynamite":
                resstr = "DYN";
                break;
            case "Success":
                resstr = "HIT";
                break;
            case "Partial":
                resstr = "PAR";
                break;
            case "Failure":
                resstr = "MIS";
                break;
            default:
                result;
                throw new Error(`Unknown Result ${result}`);
        }
        //TODO: replace wtih regex
        const str = "CHOICE" + resstr;
        if (effectClass.includes(str + "1")) {
            return 1;
        }
        if (effectClass.includes(str + "2")) {
            return 2;
        }
        if (effectClass.includes(str + "3")) {
            return 3;
        }
        if (effectClass.includes(str + "4")) {
            return 4;
        }
        if (effectClass.includes(str + "PWR")) {
            return power;
        }
        return Infinity;
    }
    static convertTextResultToNumeric(result) {
        switch (result) {
            case "Dynamite": return 3;
            case "Success": return 2;
            case "Partial": return 1;
            case "Failure": return 0;
            default: throw new Error(`Unknown Result ${result}`);
        }
    }
    static meetsCondition(cond, result) {
        const numRes = CityItem.convertTextResultToNumeric(result);
        switch (cond) {
            case "gtPartial": return numRes >= 1;
            case "gtSuccess": return numRes >= 2;
            case "eqDynamite": return numRes == 3;
            case "eqPartial": return numRes == 1;
            case "eqSuccess": return numRes == 2;
            case "Always": return true;
            case "Miss": return numRes == 0;
            default:
                cond;
                throw new Error(`Unkonwn Condition ${cond}`);
        }
    }
    versionIsLessThan(version) {
        if ("version" in this.system) {
            return String(this.system.version) < String(version);
        }
        return false;
    }
    async updateVersion(version) {
        version = String(version);
        if (this.versionIsLessThan(version)) {
            console.debug(`Updated version of ${this.name} to ${version}`);
            return await this.update({ "system.version": version });
        }
        if (this.versionIsLessThan(version)) {
            console.warn(`Failed attempt to downgrade version of ${this.name} to ${version}`);
        }
    }
    isHelpHurt() {
        if (this.system.type != "juice") {
            return false;
        }
        const subtype = this.system?.subtype;
        return subtype == "help" || subtype == "hurt";
    }
    isJournal() {
        return this.system.type == "journal";
    }
    getSubtype() {
        return this.system.type == "juice" && this.system?.subtype;
    }
    /** On juice object tell who the juice targets
    */
    getTarget() {
        const targetId = this.system?.targetCharacterId;
        if (targetId) {
            return game.actors.get(targetId);
        }
        else {
            return null;
        }
    }
    /** Returns true if actorId matches the target of the juice object
    */
    targets(actorId) {
        return this.getTarget()?.id === actorId;
    }
    getTargetName() {
        const target = this.getTarget();
        if (target) {
            return target.name;
        }
        else {
            return "";
        }
    }
    isHurt() { return this.isJuice() && this.getSubtype() == "hurt"; }
    isHelp() { return this.isJuice() && this.getSubtype() == "help"; }
    isUntypedJuice() { return this.isJuice() && !this.getSubtype(); }
    isJuice() { return this.system.type == "juice"; }
    isStatus() { return this.system.type == "status"; }
    get isBuildUpImprovement() {
        return (this.system.type == "improvement" && !this.system.theme_id);
    }
    isTemporary() {
        if (this.system.temporary) {
            return true;
        }
        if (this.system.type == "tag") {
            return this.system.crispy;
        }
        return false;
    }
    isPermanent() {
        if (this.system.permanent) {
            return true;
        }
        if (this.system.type == "tag") {
            return this.isPowerTag() || this.isWeaknessTag();
        }
        return false;
    }
    get localizedName() {
        return SystemModule.active.localizedName(this);
    }
    getDisplayedName() {
        switch (this.system.type) {
            case "journal":
                return `${this.system.question}`;
            case "juice": {
                const juice = this;
                if (!juice.isHelpHurt()) {
                    return juice.name;
                }
                if (juice.isHelp()) {
                    return `Help ${juice.getTargetName()} (${juice.parent.name})`;
                }
                if (juice.isHurt()) {
                    return `Hurt ${juice.getTargetName()} (${juice.parent.name})`;
                }
                throw new Error("Something odd happened?");
            }
            case "improvement": {
                let x = localizeS(this.name);
                if (this.system?.locale_name) {
                    x = localizeS(this.system.locale_name);
                }
                if (this.system.choice_item) {
                    return `${x.toString()} (${this.system.choice_item})`;
                }
                else {
                    return x.toString();
                } //tehcincally a SafeString conversion but it should stil lwork fine
            }
            case "theme":
                if (CitySettings.get("themeStyle") == "mist-engine") {
                    return this.headerTag[0]?.getDisplayedName() ?? this.name;
                }
                break;
            default:
                if ("locale_name" in this.system && this.system.locale_name) {
                    return localizeS(this.system.locale_name).toString();
                }
                else {
                    return this.name.toString();
                }
        }
        return this.name;
    }
    get displayedName() {
        return this.getDisplayedName();
    }
    get directoryName() {
        switch (this.system.type) {
            case "tag":
                return this.name;
            case "status":
                return `${this.displayedName}-${this.tier}`;
            default:
                return this.name;
        }
    }
    get isLocal() {
        return this.parent instanceof CityActor;
    }
    async spend(amount = 1) {
        const curr = this.getAmount();
        if (amount > curr) {
            console.error("${this.name}: Trying to spend more ${this.type} (${amount}) than you have ${curr}");
        }
        const obj = await this.update({ "system.amount": curr - amount });
        if (curr - amount <= 0) {
            return await this.delete();
        }
        return obj;
    }
    async deleteTemporary() {
        if (!this.isTemporary()) {
            console.warn(`trying to delete non-temporary tag ${this.name}`);
            return false;
        }
        if (this.isOwner) {
            await CityHelpers.playBurn();
            await this.delete();
            return;
        }
        const session = new TagAndStatusCleanupSessionM("delete", this.id, this.parent.id, this.parent.tokenId);
        await CitySockets.execSession(session);
        await CityHelpers.playBurn();
    }
    getAmount() {
        return this.system.amount;
    }
    get theme() {
        if (this.isTag() || this.isImprovement()) {
            if (!this.parent) {
                return null;
            }
            const theme = (this.parent).getTheme(this.system.theme_id);
            if (!theme) {
                return null;
            }
            return theme;
        }
        return null;
    }
    /** @deprecated use getThemebookAbsolute() or getThemebookOrTK()
    returns themebook or themekit
    */
    get themebook() {
        if (this.isTag() || this.isImprovement()) {
            if (!this.theme) {
                return null;
            }
            return this.theme.getThemebookOrTK();
        }
        try {
            if (this.isTheme() || this.isThemeKit()) {
                return this.getThemebookOrTK();
            }
        }
        catch (e) {
            console.error(e);
            return null;
        }
        return null;
    }
    get weaknessTags() {
        if (this.isTheme() || this.isThemeBook()) {
            return this.parent.items.filter(x => x.isWeaknessTag() && x.theme == this);
        }
        console.warn(`trying to use get weaknesstags on improprer type: ${this.system.type}`);
        return [];
    }
    async reloadImprovementFromCompendium() {
        const themeId = this.system.theme_id;
        const owner = this.parent;
        if (!owner) {
            return;
        }
        let max_uses = 0, description, effect_class;
        if (themeId) {
            const theme = owner.getTheme(themeId);
            if (!theme) {
                console.log(`Deleting Dead Improvement ${this.name} (${owner.name})`);
                await this.delete();
                return null;
            }
            const themebook = theme.getThemebookOrTK();
            if (!themebook) {
                throw new Error("Couldn't find Themebook");
            }
            if (themebook.system.type == "themekit") {
                throw new Error(`Expecting Themebook for improvement ${this.name} but found Themekit instead`);
            }
            const impobj = themebook.system.improvements;
            for (const ind in impobj) {
                const item = impobj[ind];
                if (item == "_DELETED_") {
                    continue;
                }
                if (item.name == this.name) {
                    const imp = item;
                    max_uses = imp.uses ?? 0;
                    description = imp.description;
                    effect_class = imp.effect_class;
                    break;
                }
            }
        }
        else {
            const BUList = CityHelpers.getBuildUpImprovements();
            const imp = BUList.find(x => x.name == this.name);
            if (!imp) {
                throw new Error(`Can't find MoE ${this.name}`);
            }
            description = imp.system.description;
            max_uses = imp.system.uses.max;
            effect_class = imp.system.effect_class;
        }
        if (!description) {
            throw new Error(`Can't find improvement ${this.name}`);
        }
        const curruses = this.system.uses.current;
        const updateObj = {
            system: {
                uses: {
                    current: curruses ?? max_uses,
                    max: max_uses,
                    expended: (curruses ?? max_uses) < 1 && max_uses > 0,
                },
                description: description,
                chosen: true,
                effect_class: effect_class ?? "",
            }
        };
        return await this.update(updateObj);
    }
    async spendClue() {
        if (this.getAmount() <= 0) {
            throw new Error("Can't spend clue with no amount");
        }
        if (CitySettings.useClueBoxes()) {
            await ClueChatCards.postClue({
                actorId: this.parent?.id ?? "",
                metaSource: this,
                method: this.system.method,
                source: this.system.source,
            });
        }
        else {
            const templateData = { actor: this.parent, clue: this };
            const html = await foundry.applications.handlebars.renderTemplate("systems/city-of-mist/templates/parts/clue-use-no-card.hbs", templateData);
            await CityLogger.sendToChat2(html, { actor: this.parent?.id });
        }
        await this.spend();
    }
    /** gets the tags from a themekit
    type: "power" || "weakness"
     */
    themekit_getTags(type = "power") {
        if (type == "bonus") {
            return [];
        }
        const tags = this.system[`${type}_tagstk`];
        if (!tags) {
            return [];
        }
        return tags
            .filter(x => x.tagname != "")
            .map((x, i) => ({
            ...x,
            letter: x.letter ?? "ABCDEFGHIJ".charAt(i)
        }));
    }
    /** gets improvements as an array from a themebook*/
    themekit_getImprovements() {
        const imps = this.system.improvements;
        if (!imps) {
            return [];
        }
        const arr = Array.from(Object.values(imps));
        let baseImps = [];
        if (this.system.use_tb_improvements) {
            console.log("Using TB imnprovements");
            if (!this.getThemebookOrTK()) {
                console.warn(`No themebook found for themekit ${this.name}`);
                return [];
            }
            baseImps = this.getThemebookOrTK().themebook_getImprovements();
        }
        const retImps = baseImps
            .concat(arr)
            .map((x, i) => {
            return {
                ...x,
                number: i
            };
        });
        return retImps;
    }
    /** convert the tag questions to an array instead of an object also dealing with backwards compatibility stuff
    */
    themebook_getTagQuestions(type = "power") {
        const questionObj = this.system[`${type}_questions`];
        if (!questionObj) {
            return [];
        }
        return Object.entries(questionObj)
            .map(([letter, data]) => {
            let question = "ERROR";
            let subtag = false;
            if (typeof data == "string") {
                question = data;
                subtag = false;
            }
            else if (typeof data == "object") {
                ({ question, subtag } = data);
            }
            if (question == "ERROR" || !question) {
                question = SystemModule.active.localizedThemeBookData(this, `${type}-question`, letter);
            }
            return { letter, question, subtag };
        }).filter(item => !item.question.includes("_DELETED_"));
    }
    themebook_getImprovements() {
        const improvementsObj = this.system.improvements;
        return Object.entries(improvementsObj)
            .flatMap(([number, data], index) => {
            if (data == "_DELETED_") {
                return [];
            }
            const name = data.name ? data.name : SystemModule.active.localizedThemeBookData(this, "improvement-name", index);
            const description = data.description ? data.description : SystemModule.active.localizedThemeBookData(this, "improvement-description", index);
            return [
                {
                    number,
                    name,
                    description,
                    uses: data.uses,
                    effect_class: data.effect_class,
                }
            ];
        });
    }
    async GMMovePopUp(actor = this.parent) {
        if (this.system.type != "gmmove") {
            throw new Error("Type is not GM move");
        }
        const { html, options } = await this.prepareToRenderGMMove(actor);
        if (await CityDialogs.GMMoveTextBox(this.displayedName, html, options) && actor) {
            await actor.executeGMMove(this, actor);
        }
    }
    /** returns Promise<{taglist, statuslist, html and options}>
     **/
    async prepareToRenderGMMove(actor = this.parent) {
        //TODO: X substitution
        if (!actor) {
            throw new Error(`No parent for GMMove ${this.name}`);
        }
        const html = await foundry.applications.handlebars.renderTemplate("systems/city-of-mist/templates/parts/gmmove-part.hbs", { actor, move: this });
        const { taglist, statuslist } = this.formatGMMoveText(actor);
        const options = { token: null,
            speaker: {
                actor: actor.id,
                alias: actor.getDisplayedName()
            }
        };
        return { html, options, taglist, statuslist };
    }
    formatGMMoveText(actor, options = { showPrivate: false }) {
        const text = CityHelpers.newlineSubstitution(this.system.description);
        if (!actor) {
            throw new Error(`No actor provided on move ${this.name}`);
        }
        let collectiveSize = actor?.system?.collectiveSize ?? 0;
        collectiveSize = Number(collectiveSize);
        if (Number.isNaN(collectiveSize)) {
            collectiveSize = 0;
        }
        let displayedText = this.applyHeader(text);
        if (!options?.showPrivate) {
            displayedText = CityHelpers.removeWithinBraces(displayedText);
        }
        else {
            displayedText = CityHelpers.formatWithinBraces(displayedText);
        }
        const { html: taghtml, taglist, statuslist: neostatuslist } = CityHelpers.unifiedSubstitution(displayedText, collectiveSize);
        const { html: statushtml, statuslist: extrastatuslist } = CityHelpers.autoAddstatusClassSubstitution(taghtml);
        let html = CityHelpers.statusClassSubstitution(statushtml);
        if (actor) {
            const nameSubstitutions = {
                "name": actor.displayedName,
                "pr0": actor.pronouns[0] ?? "",
                "pr1": actor.pronouns[1] ?? "",
                "pr2": actor.pronouns[2] ?? "",
            };
            html = CityHelpers.nameSubstitution(html, nameSubstitutions);
        }
        const statuslist = neostatuslist.concat(extrastatuslist)
            .map(x => {
            const numTier = Number.isNaN(Number(x.tier)) ? -999 : Number(x.tier);
            return {
                ...x, tier: numTier
            };
        });
        return { html, taglist, statuslist };
    }
    applyHeader(text) {
        switch (this.moveHeader) {
            case "symbols": return this.applyHeader_symbol(text);
            case "text": return this.applyHeader_text(text);
            default: return text;
        }
    }
    get moveHeader() {
        if (this.system.type != "gmmove") {
            return "";
        }
        switch (this.system.header) {
            case "text": return "text";
            case "symbols": return "symbols";
            case "none": return "none";
            default: break;
        }
        return CitySettings.GMMoveHeaderSetting();
    }
    applyHeader_symbol(text) {
        let local;
        let icon;
        switch (this.system.subtype) {
            case "soft": {
                local = localize("CityOfMist.terms.softMove");
                icon = `<i class="fa-solid fa-chevron-right"></i>`;
                break;
            }
            case "hard": {
                local = localize("CityOfMist.terms.hardMove");
                icon = `<i class="fa-solid fa-angles-right"></i>`;
                break;
            }
            case "intrusion": {
                local = localize("CityOfMist.terms.intrusion");
                icon = `<i class="fa-solid fa-circle-exclamation"></i>`;
                break;
            }
            case "custom": {
                local = localize("CityOfMist.terms.customMove");
                icon = `<i class="fa-solid fa-circle-dot"></i>`;
                break;
            }
            case "downtime": {
                local = localize("CityOfMist.terms.downtimeMoves");
                icon = `<i class="fa-solid fa-bed"></i>`;
                break;
            }
            case "entrance": {
                local = localize("CityOfMist.terms.enterScene");
                icon = `<i class="fa-solid fa-door-open"></i>`;
                break;
            }
            default: console.error(`Unknown subtype: ${this.system.subtype}`);
        }
        const symbol = `<span title="${local}"> ${icon}</span>`;
        return symbol + " " + text;
    }
    applyHeader_text(text) {
        let local;
        switch (this.system.subtype) {
            case "soft":
                local = localize("CityOfMist.settings.gmmoveheaders.soft");
                return local + " " + text;
            case "hard":
                local = localize("CityOfMist.settings.gmmoveheaders.hard");
                return local + " " + text;
            case "intrusion":
                local = localize("CityOfMist.settings.gmmoveheaders.intrusion");
                return local + " " + text;
            case "custom":
                return `${text}`;
            case "downtime":
                local = localize("CityOfMist.settings.gmmoveheaders.downtime");
                return local + " " + text;
            case "entrance":
                local = localize("CityOfMist.settings.gmmoveheaders.entrance");
                return local + " " + text;
            default: console.error(`Unknown subtype: ${this.system.subtype}`);
        }
        return text;
    }
    isLoadoutTheme() {
        return this.name == "__LOADOUT__";
        // return (this.themebook as Themebook).system.subtype == "Loadout";
    }
    isSystemCompatible(system = SystemModule.active.name) {
        if (this.system.system_compatiblity == "any") {
            return true;
        }
        return this.system.system_compatiblity.includes(system);
    }
    async toggleLoadoutActivation() {
        const active = this.system.activated_loadout;
        const toggled = !active;
        await CityHelpers.playLoadoutToggle(toggled);
        await this.update({ "system.activated_loadout": toggled });
        // const subtags = this.parent!.loadout!.tags()
        // 	.filter(x=> x.system.parentId == this.id)
        // 	.forEach( tag => tag.update({"system.activated_loadout": toggled}));
        return toggled;
    }
    get motivationName() {
        if (!this.isTheme()) {
            console.error(`Can't get motivation from ${this.system.type}`);
            return "ERROR";
        }
        const tb = this.getThemebookOrTK();
        if (!tb) {
            console.error(`Couldn't get theme book for theme ${this.id}`);
            return "ERROR";
        }
        return SystemModule.themeIdentityName(this);
        // TODO: might need to restore custom motivations at some poiont
        // let motivation = tb.system.motivation;
        // if (!motivation) {
        // 	return SystemModule.themeIdentityName(this as Theme);
        // } else {
        // 	return localize (MOTIVATIONLIST[motivation]);
        // }
    }
    themeSortValue() {
        try {
            const themetype = this.getThemebookOrTK().system.subtype;
            if (!themetype) {
                return 100;
            }
            const theme = SystemModule.allThemeTypes()[themetype];
            return theme.sortOrder ?? 100;
        }
        catch (e) {
            console.log(e);
            return 1000;
        }
    }
    getThemePropertyTerm(term) {
        switch (term) {
            case "attention":
                return SystemModule.themeIncreaseName(this);
            case "fade":
                return SystemModule.themeDecreaseName(this);
            case "milestone":
                return SystemModule.themeThirdTrackName(this);
            default:
                ui.notifications.error(`Unknown Term: ${term}`);
                return "ERROR";
        }
    }
    static getCoMdefaultFade(themeType) {
        switch (themeType) {
            case "Logos":
                return "crack";
            case "Mythos":
                return "fade";
            case "Mist":
                return "crack";
            case "Crew":
                return "crew";
            default:
                return "decay";
        }
    }
    async createSubMove() {
        const parent = this.parent;
        if (!parent) {
            throw new Error(`Can't create subtag if there is no parent of ${this.name}`);
        }
        return await parent.createNewGMMove("Unnamed Sub-Move", {
            "superMoveId": this.id,
            "hideName": true,
            "header": "symbols",
            "subtype": "hard",
        });
    }
    isBeingDeleted() {
        return this.getFlag("city-of-mist", "pendingDelete") == true;
    }
    static numIndexToLetter(index) {
        return "ABCDEFGHIJKLM".at(index);
    }
    hasCustomThemebook() {
        const tbOrTk = this.getThemebookOrTK();
        if (!tbOrTk) {
            return false;
        }
        switch (tbOrTk.system.type) {
            case "themekit": {
                const tb = tbOrTk.getThemebookOrTK();
                if (!tb) {
                    return false;
                }
                return tb.isLocal;
            }
            case "themebook": {
                const tb = tbOrTk;
                return tb.isLocal;
            }
        }
    }
    async addCreatingTagOrStatus(creator) {
        const acc = CityDB.getUniversalItemAccessor(creator);
        const arr = this.system.createdBy ? this.system.createdBy : [];
        if (arr.find(x => CityDB.accessorEq(x, acc))) {
            return;
        }
        arr.push(acc);
        await this.update({ "system.createdBy": arr });
    }
    get creators() {
        switch (this.system.type) {
            case "tag":
            case "status":
                return (this.system.createdBy ?? [])
                    .map(x => CityDB.findItem(x))
                    .filter(x => x != undefined);
            default:
                return [];
        }
    }
    canCreateTags() {
        return SystemModule.active.canCreateTags(this);
        //switch( this.system.system_compatiblity) {
        //	case "city-of-mist":
        //		//TODO: May fix this later, but given the breadth of moves that can create things, some through dynamite results, it's best to just allow it for everything.
        //		return true;
        //	case "otherscape":
        //		return this.name == "Tracked Outcome";
        //	case "legend":
        //		return this.name == "Tracked Outcome";
        //	default:
        //		console.warn(`Unknown System compatiblity for ${this.name}: ${this.system.system_compatiblity}`);
        //		return true;
        //}
    }
    get systemName() {
        if ("systemName" in this.system && this.system.systemName) {
            return this.system.systemName;
        }
        if ("abbreviation" in this.system && this.system.abbreviation) {
            return this.system.abbreviation;
        }
        return this.name;
    }
}
