import { localize } from "../city.js";
import { CitySettings } from "../settings.js";
import { CoMSystem } from "../systemModule/com-system.js";
import { CoMTypeSystem } from "../systemModule/com-type-system.js";
import { MistEngineSystem } from "../systemModule/mist-engine.js";
export class SystemModule {
    static baseClasses = [CoMTypeSystem, MistEngineSystem];
    static systems = new Map();
    static systemChoices() {
        const obj = {};
        for (const v of this.systems.values()) {
            obj[v.name] = v.localizationString;
        }
        return obj;
    }
    static get active() {
        const system = CitySettings.getBaseSystem();
        const sys = this.systems.get(system);
        if (sys)
            return sys;
        ui.notifications.error("No system module, defaulting to CoM");
        return new CoMSystem();
    }
    static registerRulesSystem(system) {
        // game.rulesSystems.set(system.name, system);
        this.systems.set(system.name, system);
        console.log(`Rules System Registered: ${system.name}`);
    }
    static async init() {
        window.SystemModule = this;
        try {
            Hooks.callAll("registerRulesSystemPhase", this);
        }
        catch (a) {
            const err = a;
            console.warn(`error ${err.name}: ${err.stack}`);
        }
    }
    static async setActive(systemName) {
        try {
            await CitySettings.set("baseSystem", systemName);
            await this.active.onChangeTo();
            await this.active.activate();
        }
        catch (e) {
            const err = e;
            console.log(`Error ${err.message}\n : ${err.stack} `);
            return false;
        }
        return true;
    }
    /** returns active theme types as localization object */
    static themeTypes() {
        return this.active.themeTypes();
    }
    /** return all theme types  as localization object*/
    static allThemeTypes() {
        let retobj = {};
        for (const [_k, v] of this.systems) {
            if (v == this.active)
                continue;
            retobj = foundry.utils.mergeObject(retobj, v.themeTypes());
        }
        if (this.active) {
            retobj = foundry.utils.mergeObject(retobj, this.active.themeTypes());
        }
        return retobj;
    }
    static themeDecreaseName(theme) {
        const themetype = theme.getThemeType();
        const thing = this.allThemeTypes()[themetype].decreaseLocalization;
        if (thing) {
            return localize(thing);
        }
        else {
            return "";
        }
    }
    static themeIncreaseName(theme) {
        const themetype = theme.getThemeType();
        const thing = this.allThemeTypes()[themetype].increaseLocalization;
        if (thing) {
            return localize(thing);
        }
        else {
            return "";
        }
    }
    static themeThirdTrackName(theme) {
        const themetype = theme.getThemeType();
        const thing = this.allThemeTypes()[themetype].milestoneLocalization ?? undefined;
        if (thing) {
            return localize(thing);
        }
        else {
            return "";
        }
    }
    static themeIdentityName(theme) {
        const themetype = theme.getThemeType();
        const thing = this.allThemeTypes()[themetype].identityName;
        if (thing) {
            return localize(thing);
        }
        else {
            return "";
        }
    }
    static setActiveStyle(system) {
        const body = $(document).find("body");
        for (const { name } of this.systems.values()) {
            const style = `style-${name}`;
            body.removeClass(style);
        }
        const newStyle = `style-${system.name}`;
        body.addClass(newStyle);
    }
    static isLoadoutThemeType(themeType) {
        if (!themeType)
            return false;
        const specials = this.allThemeTypes()[themeType].specials;
        if (!specials)
            return false;
        return specials.includes("loadout");
    }
}
window.SystemModule = SystemModule;
