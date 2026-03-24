import { CitySettings } from "../settings.js";
import { DebugTools } from "../tools/debug.js";
import { localize } from "../city.js";
import { SystemModule } from "./system-module.js";

export type System = keyof ReturnType<typeof SYSTEM_CHOICES>;


export function SYSTEM_CHOICES() : SYSTEM_NAMES {
	return SystemModule.systemChoices();
	// return {
	// 	"city-of-mist": localize("CityOfMist.settings.system.0"),
	// 	"otherscape": localize("CityOfMist.settings.system.1"),
	// 	"legend": localize("CityOfMist.settings.system.2"),
	// } as const;
}

export function CITY_SETTINGS() {
	return {
		"system": {
			name: localize("CityOfMist.settings.system.name"),
			hint: localize("CityOfMist.settings.system.hint"),
			scope: "world",
			config: true,
			type: String,
			default: "city-of-mist",
			choices: {
				...SYSTEM_CHOICES(),
				// "city-of-mist": localize("CityOfMist.settings.system.0"),
				// "otherscape": localize("CityOfMist.settings.system.1"),
				// "legend": localize("CityOfMist.settings.system.2"),
				"custom": localize("CityOfMist.settings.system.3"),
			},
			restricted: true,
			onChange: (newSystem: string) => {
				CitySettings.refreshSystem(newSystem as System);
				delayedReload();
			},
		},
		"gritMode": {
			name: localize("CityOfMist.settings.gritMode.name"),
			hint: localize("CityOfMist.settings.gritMode.hint"),
			scope: "world",
			config: true,
			type: Boolean,
			default: false,
			restricted: true
		},

		"weaknessCap": {
			name: localize("CityOfMist.settings.weaknessCap.name"),
			hint: localize("CityOfMist.settings.weaknessCap.hint"),
			scope: "world",
			config: true,
			type: Number,
			default: 9999,
			choices: {
				9999 : "None",
				3: "+3",
				2: "+2",
				1: "+1",
				0: "+0"
			},
			restricted: true,
		},

		"statusDisplay": {
			name: localize("CityOfMist.settings.statusDisplay.name"),
			hint: localize("CityOfMist.settings.statusDisplay.hint"),
			scope: "client",
			config: true,
			type: String,
			default: "tier-only",
			choices: {
				"tier-only" : localize("CityOfMist.settings.statusDisplay.0"),
				"tier+pips": localize("CityOfMist.settings.statusDisplay.1"),
				"tier+circles": localize("CityOfMist.settings.statusDisplay.2"),

			},
			restricted: false,
			onChange: (_newval:string) => {
			}
		},

		"maxWeaknessTags": {
			name: localize("CityOfMist.settings.maxWeaknessTags.name"),
			hint: localize("CityOfMist.settings.maxWeaknessTags.hint"),
			scope: "world",
			config: true,
			type: Number,
			default: 9999,
			choices: {
				9999 : "Unlimited",
				3: "3",
				2: "2",
				1: "1",
			},
			restricted: true
		},

		"maxRollCap": {
			name: localize("CityOfMist.settings.maxRollCap.name"),
			hint: localize("CityOfMist.settings.maxRollCap.hint"),
			scope: "world",
			config: true,
			type: Number,
			default: 9999,
			choices: {
				9999 : "None",
				5: "+5",
				4: "+4",
				3: "+3",
				2: "+2",
			},
			restricted: true
		},

		"monologueAttention": {
			name: localize("CityOfMist.settings.monologueAttention.name"),
			hint: localize("CityOfMist.settings.monologueAttention.hint"),
			scope: "world",
			config: true,
			type: Boolean,
			default: false,
			restricted: true
		},

		"loggedActions": {
			name: localize("CityOfMist.settings.loggedActions.name"),
			hint: localize("CityOfMist.settings.loggedActions.hint"),
			scope: "world",
			config: true,
			type: Boolean,
			default: false,
			restricted: true
		},

		"autoWeakness": {
			name: localize("CityOfMist.settings.autoWeakness.name"),
			hint: localize("CityOfMist.settings.autoWeakness.hint"),
			scope: "world",
			config: true,
			type: Boolean,
			default: true,
			restricted: true
		},

		"autoAwardImpForWeakness": {
			name: localize("CityOfMist.settings.autoAwardWeaknessImp.name"),
			hint: localize("CityOfMist.settings.autoAwardWeaknessImp.hint"),
			scope: "world",
			config: true,
			type: Boolean,
			default: true,
			restricted: true
		},

		"execEntranceMoves": {
			name: localize("CityOfMist.settings.execEntranceMoves.name"),
			hint: localize("CityOfMist.settings.execEntranceMoves.hint"),
			scope: "world",
			config: true,
			type: String,
			default: "none",
			choices: {
				"none" : localize("CityOfMist.settings.execEntranceMoves.0"),
				"ask": localize("CityOfMist.settings.execEntranceMoves.1"),
				"auto": localize("CityOfMist.settings.execEntranceMoves.2")
			},
			restricted: true
		},

		"tokenToolTip": {
			name: localize("CityOfMist.settings.tokenToolTip.name"),
			hint: localize("CityOfMist.settings.tokenToolTip.hint"),
			scope: "world",
			config: true,
			type: Boolean,
			default: true,
			restricted: false
		},

		"trackerSort": {
			name: localize("CityOfMist.settings.trackerSort.name"),
			hint: localize("CityOfMist.settings.trackerSort.hint"),
			scope: "world",
			config: true,
			type: String,
			default: "alpha",
			choices: {
				"alpha" : localize("CityOfMist.settings.trackerSort.0"),
				"pc_alpha": localize("CityOfMist.settings.trackerSort.1"),
				"tag_sort":localize("CityOfMist.settings.trackerSort.2"),
			},
			restricted: true
		},

		"enhancedActorDirectory": {
			name: localize("CityOfMist.settings.enhancedActorDirectory.name"),
			hint: localize("CityOfMist.settings.enhancedActorDirectory.hint"),
			scope: "world",
			config: true,
			type: Boolean,
			default: true,
			restricted: true,
			onChange: () => {
				delayedReload();
			}
		},

		"soundEffects": {
			name: localize("CityOfMist.settings.soundEffects.name"),
			hint: localize("CityOfMist.settings.soundEffects.hint"),
			scope: "client",
			config: true,
			type: Boolean,
			default: true,
			restricted: false,
		},

		"clueBoxes": {
			name: localize("CityOfMist.settings.clueBoxes.name"),
			hint: localize("CityOfMist.settings.clueBoxes.hint"),
			scope: "world",
			config: true,
			type: String,
			choices: {
				"none" : localize("CityOfMist.settings.clueBoxes.0"),
				"whisper": localize("CityOfMist.settings.clueBoxes.1"),
				"public":localize("CityOfMist.settings.clueBoxes.2"),
			},
			default: "public",
			restricted: true,
			onChange: () =>	delayedReload()
		},

		"gmmoveheaders": {
			name: localize("CityOfMist.settings.gmmoveheaders.name"),
			hint: localize("CityOfMist.settings.gmmoveheaders.hint"),
			scope: "world",
			config: true,
			type: String,
			default: "none",
			choices: {
				"none" : localize("CityOfMist.settings.gmmoveheaders.choice0"),
				"symbols": localize("CityOfMist.settings.gmmoveheaders.choice1"),
				"text": localize("CityOfMist.settings.gmmoveheaders.choice2")
			},
			restricted: true,
		},

		"tagReview": {
			name: localize("CityOfMist.settings.tagReview.name"),
			hint: localize("CityOfMist.settings.tagReview.hint"),
			scope: "world",
			config: true,
			type: Boolean,
			default: true,
			restricted: true,
		},

		"flashyLevelUp": {
			name: localize("CityOfMist.settings.flashyLevelUp.name"),
			hint: localize("CityOfMist.settings.flashyLevelUp.hint"),
			scope: "client",
			config: true,
			type: Boolean,
			default: false,
			restricted: false,
		},

		"sceneTagWindow": {
			name: localize("CityOfMist.settings.sceneTagWindow.name"),
			hint: localize("CityOfMist.settings.sceneTagWindow.hint"),
			scope: "client",
			config: true,
			type: String,
			default: "full",
			choices: {
				"none" : localize("CityOfMist.settings.sceneTagWindow.choice0"),
				"omitEmpty": localize("CityOfMist.settings.sceneTagWindow.choice1"),
				"full": localize("CityOfMist.settings.sceneTagWindow.choice2")
			},
			restricted: false,
			onChange: () => delayedReload()
		},

		"sceneTagWindowPos": {
			name: localize("CityOfMist.settings.sceneTagWindowPosition.name"),
			hint: localize("CityOfMist.settings.sceneTagWindowPosition.hint"),
			//NOTE: FOR SOME REASON scop wil not shift to client
			scope: "client",
			config: true,
			type: String,
			default: "left",
			requiresReload: true,
			restricted: false,
			choices: {
				"left" : localize("CityOfMist.settings.sceneTagWindowPosition.choice0"),
				"right": localize("CityOfMist.settings.sceneTagWindowPosition.choice1"),
				"hide": localize("CityOfMist.settings.sceneTagWindowPosition.choice2")
			},
		},

		"handleTempItems": {
			name: localize("CityOfMist.settings.handleTempItems.name"),
			hint: localize("CityOfMist.settings.handleTempItems.hint"),
			scope: "world",
			config: true,
			type: String,
			default: "all",
			choices: {
				"none" : localize("CityOfMist.settings.handleTempItems.choice0"),
				"tagOnly": localize("CityOfMist.settings.handleTempItems.choice1"),
				"all": localize("CityOfMist.settings.handleTempItems.choice2")
			},
			restricted: true,
		},

		"autoFail_autoSuccess": {
			name: localize("CityOfMist.settings.autofail.name"),
			hint: localize("CityOfMist.settings.autofail.hint"),
			scope: "world",
			config: true,
			type: Boolean,
			default: true,
			restricted: true,
		},

		"devMode": {
			name: localize("CityOfMist.settings.devMode.name"),
			hint: localize("CityOfMist.settings.devMode.hint"),
			scope: "world",
			config: true,
			type: Boolean,
			default: false,
			restricted: true,
			onChange: () => {
				delayedReload();
			}
		},
	} as const;

}

// **************************************************
// ***************   DEV SETTINGS  **************** *
// **************************************************


function showDevSettings() : boolean {
	//@ts-ignore
	return game.settings.get('city-of-mist', "system") == "custom";

}

export function DEV_SETTINGS() {
	//@ts-ignore
	const SHOW_DEV_SETTINGS = showDevSettings();
	return {
		"baseSystem": {
			name: localize("CityOfMist.settings.baseSystem.name"),
			hint: localize("CityOfMist.settings.baseSystem.hint"),
			scope: "world",
			//@ts-ignore
			config: SHOW_DEV_SETTINGS,
			type: String,
			default: "city-of-mist",
			choices: {...SYSTEM_CHOICES()},
			restricted: true,
			onChange: (newval: string) => {
				const curr = CitySettings.get("system");
				if (curr != newval && curr != "custom") {
					CitySettings.set("system", "custom");
					delayedReload();
				}
			}
		},

		"tagCreationCost": {
			name: localize("CityOfMist.settings.tagCreationCost.name"),
			hint: localize("CityOfMist.settings.tagCreationCost.hint"),
			scope: "world",
			//@ts-ignore
			config: SHOW_DEV_SETTINGS,
			type: Number,
			default: 2,
			choices:
			{
				1: "1",
				2: "2",
				3: "3",
			},
			restricted: true,
			onChange: (_newval: string) => { }
		},

		"statusCreationCost": {
			name: localize("CityOfMist.settings.statusCreationCost.name"),
			hint: localize("CityOfMist.settings.statusCreationCost.hint"),
			scope: "world",
			//@ts-ignore
			config: SHOW_DEV_SETTINGS,
			type: Number,
			default: 1,
			choices:
			{
				1: "1",
				2: "2",
				3: "3",
			},
			restricted: true,
			onChange: (_newval: string) => { }
		},

		"movesInclude": {
			name: localize("CityOfMist.settings.movesInclude.name"),
			hint: localize("CityOfMist.settings.movesInclude.hint"),
			scope: "world",
			config: SHOW_DEV_SETTINGS,
			type: String,
			default: "city-of-mist",
			choices: {
				...SYSTEM_CHOICES(),
				// "city-of-mist": localize("CityOfMist.settings.system.0"),
				// "otherscape": localize("CityOfMist.settings.system.1"),
				// "legend": localize("CityOfMist.settings.system.2"),
				"none": localize("CityOfMist.settings.movesInclude.none"),
			},
			restricted: true,
			onChange: () => {
				CitySettings.set("system", "custom");
				delayedReload();
			}
		},

		"statusAdditionSystem": {
			name: localize("CityOfMist.settings.statusAdditionSystem.name"),
			hint: localize("CityOfMist.settings.statusAdditionSystem.hint"),
			scope: "world",
			config: SHOW_DEV_SETTINGS,
			type: String,
			default: "classic",
			choices: {
				"classic" : localize("CityOfMist.settings.statusAdditionSystem.0"),
				"classic-commutative": localize("CityOfMist.settings.statusAdditionSystem.1"),
				"mist-engine": localize("CityOfMist.settings.statusAdditionSystem.3"),

			},
			restricted: true,
			onChange: (_newval:string) => {
				game.settings.set('city-of-mist', "system", "custom");
			}
		},


		"loadoutTheme": {
			name: localize("CityOfMist.settings.loadout.name"),
			hint: localize("CityOfMist.settings.loadout.hint"),
			scope: "world",
			config: SHOW_DEV_SETTINGS,
			type: Boolean,
			default: false,
			restricted: true,
		},

		"tagBurn": {
			name: localize("CityOfMist.settings.tagBurn.name"),
			hint: localize("CityOfMist.settings.tagBurn.hint"),
			scope: "world",
			config: SHOW_DEV_SETTINGS,
			type: String,
			default: "classic",
			choices: {
				"classic" : localize("CityOfMist.settings.tagBurn.0"),
				"mist-engine": localize("CityOfMist.settings.tagBurn.1"),
			},
			restricted: true,
			onChange: () => {
				game.settings.set('city-of-mist', "system", "custom");
			}
		},

		"altPower": {
			name: localize("CityOfMist.settings.altPower.name"),
			hint: localize("CityOfMist.settings.altPower.hint"),
			scope: "world",
			config: SHOW_DEV_SETTINGS,
			type: Boolean,
			default: false,
			restricted: true,
			onChange: () => {
				game.settings.set('city-of-mist', "system", "custom");
			}
		},

		"themeStyle": {
			name: localize("CityOfMist.settings.themeStyle.name"),
			hint: localize("CityOfMist.settings.themeStyle.hint"),
			scope: "world",
			config: SHOW_DEV_SETTINGS,
			type: String,
			default: "city-of-mist",
			choices: {
				"city-of-mist" : localize("CityOfMist.settings.themeStyle.0"),
				"mist-engine": localize("CityOfMist.settings.themeStyle.1"),
			},
			restricted: true,
			onChange: () => {
				game.settings.set('city-of-mist', "system", "custom");
			}
		},

		"collectiveMechanics": {
			name: localize("CityOfMist.settings.collectiveMechanics.name"),
			hint: localize("CityOfMist.settings.themeStyle.hint"),
			scope: "world",
			config: SHOW_DEV_SETTINGS,
			type: String,
			default: "city-of-mist",
			choices: {
				"city-of-mist" : localize("CityOfMist.settings.themeStyle.0"),
				"mist-engine": localize("CityOfMist.settings.themeStyle.1"),
			},
			restricted: true,
			onChange: () => {
				game.settings.set('city-of-mist', "system", "custom");
			}
		},

		"debugMode": {
			name: localize("CityOfMist.settings.debugMode.name"),
			hint: localize("CityOfMist.settings.debugMode.hint"),
			scope: "world",
			config: SHOW_DEV_SETTINGS,
			type: Boolean,
			default: false,
			restricted: true,
			onChange: (val:boolean) => {
				DebugTools.setDebugMode(val);
			},
		},

		"version": {
			name: "Version",
			hint: "Version number",
			scope: "world",
			config: false,
			type: String,
			default: "",
			restricted: true,
		},


	} as const;

}

export function delayedReload() {
	if (!isDelayedReload) {
		const msg = localize("CityOfMist.notification.reloadRequired" );
		ui.notifications.notify(msg);
		setTimeout(() =>  window.location.reload(), 4000);
	}
	isDelayedReload= true;
}

let isDelayedReload = false;

// **************************************************
// ***************   ICON SETTINGS  **************** *
// **************************************************

/** Default icon paths configurable per item/actor type.
 *  Keys follow the pattern: defaultIcon_<item|actor>_<type>
 *  An empty string means "use Foundry's built-in default". */
export function ICON_SETTINGS() {
	const icon = (label: string, hint: string) => ({
		name: label,
		hint,
		scope: "world" as const,
		config: true,
		type: String,
		default: "",
		restricted: true,
	});
	return {
		// ── Item types ──────────────────────────────────────────────────────
		"defaultIcon_item_theme": icon(
			"Default Icon: Theme",
			"Default icon path for newly created Theme items. Leave blank to use Foundry's default."),
		"defaultIcon_item_themekit": icon(
			"Default Icon: Theme Kit",
			"Default icon path for newly created Theme Kit items."),
		"defaultIcon_item_themebook": icon(
			"Default Icon: Themebook",
			"Default icon path for newly created Themebook items."),
		"defaultIcon_item_tag": icon(
			"Default Icon: Tag",
			"Default icon path for newly created Tag items."),
		"defaultIcon_item_improvement": icon(
			"Default Icon: Improvement",
			"Default icon path for newly created Improvement items."),
		"defaultIcon_item_status": icon(
			"Default Icon: Status",
			"Default icon path for newly created Status items."),
		"defaultIcon_item_spectrum": icon(
			"Default Icon: Spectrum",
			"Default icon path for newly created Spectrum items."),
		"defaultIcon_item_clue": icon(
			"Default Icon: Clue",
			"Default icon path for newly created Clue items."),
		"defaultIcon_item_juice": icon(
			"Default Icon: Juice",
			"Default icon path for newly created Juice items."),
		"defaultIcon_item_move": icon(
			"Default Icon: Move",
			"Default icon path for newly created Move items."),
		"defaultIcon_item_gmmove": icon(
			"Default Icon: GM Move",
			"Default icon path for newly created GM Move items."),
		"defaultIcon_item_essence": icon(
			"Default Icon: Essence",
			"Default icon path for newly created Essence items."),
		// ── Actor types ─────────────────────────────────────────────────────
		"defaultIcon_actor_character": icon(
			"Default Icon: Character (Actor)",
			"Default icon path for newly created Character actors."),
		"defaultIcon_actor_threat": icon(
			"Default Icon: Threat (Actor)",
			"Default icon path for newly created Threat actors."),
		"defaultIcon_actor_crew": icon(
			"Default Icon: Crew (Actor)",
			"Default icon path for newly created Crew actors."),
	} as const;
}

export type IconSettingsType = ReturnType<typeof ICON_SETTINGS>;

export type SettingsType = (ReturnType<typeof CITY_SETTINGS> & ReturnType<typeof DEV_SETTINGS> & IconSettingsType & OTHERSETTINGS);

 type SettingsChoicesSub<R extends Record<string, SelectSettings<any>>, K extends keyof R> = R[K]["choices"] extends Record<string, any> ? keyof R[K]["choices"] : InstanceType<R[K]["type"]>;

export type SettingsChoices<K extends keyof SettingsType> = SettingsChoicesSub<SettingsType, K>;

type a = SettingsChoices<"system">;
type b = SettingsChoices<"autoEssence">;
type k = keyof SettingsType;

declare global {
	type SelectSettings<T extends SettingConfig<any> = SettingConfig<any>> = T;
	interface SYSTEM_NAMES {
	}

	interface OTHERSETTINGS extends Record<string & {}, SelectSettings> {
	}
}

type CitySettingKeysBase = SettingsObjToSettingKeyType<SettingsType>;

interface CitySettingKeys extends CitySettingKeysBase {};


declare global {
	interface SettingNameSpace {
		"city-of-mist": CitySettingKeys,
	}
}



