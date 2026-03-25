import { BaseSystemModule } from "./baseSystemModule.js";


export abstract class CoMTypeSystem extends BaseSystemModule {

	protected override themeCardTemplate = "systems/city-of-mist-ii/templates/parts/theme-display.html";

	async onChangeTo() : Promise<void> {
		const settings = this.settings;
		await settings.set( "statusAdditionSystem", "classic");
		await settings.set("tagBurn", "classic");
		await settings.set("altPower", false);
		await settings.set("loadoutTheme", false);
		await settings.set("themeStyle", "city-of-mist-ii");
		await settings.set("autoFail_autoSuccess", false);
		await settings.set("collectiveMechanics", "city-of-mist-ii");
		await settings.set("statusDisplay", "tier-only");

	}

}

