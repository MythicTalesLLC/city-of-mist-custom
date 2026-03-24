import { localizeS } from "../tools/handlebars-helpers.js";
import { CityItemSheetLarge } from "../city-item-sheet.js";
import { CityItemSheetSmall } from "../city-item-sheet.js";
import { CityCharacterSheet } from "../city-character-sheet.js";
import { CityThreatSheet } from "../city-threat-sheet.js";
import { CityCrewSheet } from "../city-crew-sheet.js";
import { SystemModule } from "../config/system-module.js";
import { localize } from "../city.js";
import { CitySettings } from "../settings.js";
export class BaseSystemModule {
    localizedName(doc) {
        if ("locale_name" in doc.system && doc.system.locale_name) {
            return localizeS(doc.system.locale_name).toString();
        }
        const lnName = this.lookupLocalizationProperty(doc, "name");
        if (lnName) {
            return lnName;
        }
        return doc.name;
    }
    localizedDescription(doc) {
        if ("description" in doc.system) {
            const description = doc.system.description;
            if (description.startsWith("#")) {
                return localizeS(description).toString();
            }
            if (!description) {
                const lnDescription = this.lookupLocalizationProperty(doc, "description");
                if (lnDescription) {
                    return lnDescription;
                }
                return description ?? "";
            }
            return description;
        }
        return "";
    }
    localizedThemeBookData(tb, field, numOrLetter) {
        let target = "";
        switch (field) {
            case "power-question":
                target = `questions.power.${numOrLetter}`;
                break;
            case "weakness-question":
                target = `questions.weakness.${numOrLetter}`;
                break;
            case "improvement-name":
                target = `improvement.${numOrLetter}.name`;
                break;
            case "improvement-description":
                target = `improvement.${numOrLetter}.description`;
                break;
        }
        const loc = this.lookupLocalizationProperty(tb, target);
        if (loc) {
            return loc;
        }
        if (field == "improvement-name") {
            return `Improvement #${numOrLetter}`;
        }
        const pageRefTarget = `pageref`;
        const pageRef = this.lookupLocalizationProperty(tb, pageRefTarget);
        if (pageRef) {
            return pageRef;
        }
        return "";
    }
    lookupLocalizationProperty(doc, property) {
        let sysName = "";
        switch (true) {
            case "systemName" in doc
                && doc.systemName.length > 0:
                sysName = doc.systemName;
                break;
            case ("systemName" in doc.system
                && typeof doc.system.systemName == "string"
                && doc.system.systemName.length > 0):
                sysName = doc.system.systemName;
                break;
            default:
                sysName = "generic";
        }
        const locName = this.localizationStarterName;
        const locStr = `${locName}.${doc.system.type}.${sysName}.${property}`;
        const x = localize(locStr);
        if (x != locStr) {
            return x;
        }
        return "";
    }
    directoryName(actor) {
        return actor.name;
    }
    get settings() {
        return CitySettings;
    }
    loadoutThemeName() {
        return localize(`${this.localizationStarterName}.terms.loadoutTheme.name`);
    }
    collectiveTermName() {
        return localize(`${this.localizationStarterName}.terms.collective`);
    }
    canCreateTags(move) {
        return move.hasEffectClass("CREATE_TAGS");
    }
    isActive() {
        return SystemModule.active == this;
    }
    loadTemplates() {
        loadTemplates([this.themeCardTemplate]);
    }
    unregisterCoreSheets() {
        Actors.unregisterSheet("core", ActorSheet);
        Items.unregisterSheet("core", ItemSheet);
    }
    registerActorSheets() {
        Actors.registerSheet("city", CityCharacterSheet, { types: ["character"], makeDefault: true });
        Actors.registerSheet("city", CityCrewSheet, { types: ["crew"], makeDefault: true });
        Actors.registerSheet("city", CityThreatSheet, { types: ["threat"], makeDefault: true });
    }
    registerItemSheets() {
        Items.registerSheet("city", CityItemSheetLarge, { types: ["themebook", "themekit", "move"], makeDefault: true });
        Items.registerSheet("city", CityItemSheetSmall, { types: ["tag", "improvement", "status", "juice", "clue", "gmmove", "spectrum"], makeDefault: true });
        // Items.registerSheet("city", CityItemSheet, {types: [], makeDefault: true});
    }
    registerSheets() {
        this.registerActorSheets();
        this.registerItemSheets();
    }
    async activate() {
        this.loadTemplates();
        this.registerSheets();
        await this._setHooks();
        SystemModule.setActiveStyle(this);
    }
    async _setHooks() {
        Hooks.on("updateRollDialog", this.updateRollOptions.bind(this));
        Hooks.on("renderRollDialog", this.renderRollDialog.bind(this));
    }
    async updateRollOptions(_html, _options, _dialog) {
    }
    async renderRollDialog(_dialog) {
    }
    themeCardTemplateLocation(_theme) {
        return this.themeCardTemplate;
    }
    async sheetHeader(actor) {
        const templateLoc = this.headerTable[actor.system.type];
        if (!templateLoc) {
            const msg = `No sheet header provided for ${actor.system.type}`;
            console.log(msg);
            // ui.notifications.error(msg);
            return `ERROR: ${msg}`;
        }
        return await renderTemplate(templateLoc, { actor });
    }
    systemSettings() {
        return {};
    }
    ;
}
;
