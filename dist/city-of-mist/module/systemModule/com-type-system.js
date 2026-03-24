import { BaseSystemModule } from "./baseSystemModule.js";
export class CoMTypeSystem extends BaseSystemModule {
    themeCardTemplate = "systems/city-of-mist/templates/parts/theme-display.html";
    async onChangeTo() {
        const settings = this.settings;
        await settings.set("statusAdditionSystem", "classic");
        await settings.set("tagBurn", "classic");
        await settings.set("altPower", false);
        await settings.set("loadoutTheme", false);
        await settings.set("themeStyle", "city-of-mist");
        await settings.set("autoFail_autoSuccess", false);
        await settings.set("collectiveMechanics", "city-of-mist");
        await settings.set("statusDisplay", "tier-only");
    }
}
