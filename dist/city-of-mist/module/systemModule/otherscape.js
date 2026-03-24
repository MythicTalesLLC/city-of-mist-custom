import { CityItemSheetSmall } from "../city-item-sheet.js";
import { localize } from "../city.js";
import { CityDB } from "../city-db.js";
import { CitySettings } from "../settings.js";
import { MistEngineSystem } from "./mist-engine.js";
const PATH = "systems/city-of-mist";
export class OtherscapeSystem extends MistEngineSystem {
    themeCardTemplate = "systems/city-of-mist/templates/otherscape/theme-card.hbs";
    get localizationStarterName() {
        return "Otherscape";
    }
    async downtimeTemplate(actor) {
        const templateData = { actor };
        return await renderTemplate(`${PATH}/templates/dialogs/pc-downtime-chooser-otherscape.hbs`, templateData);
    }
    get name() { return "otherscape"; }
    get localizationString() { return localize("CityOfMist.settings.system.1"); }
    headerTable = {
        character: "systems/city-of-mist/templates/otherscape/pc-sheet-header.hbs",
        threat: "",
        crew: ""
    };
    themeTypes() {
        return {
            "Loadout": {
                localization: "Otherscape.terms.loadoutTheme.name",
                sortOrder: 100,
                increaseLocalization: "Otherscape.terms.upgrade",
                decreaseLocalization: "Otherscape.terms.decay",
                identityName: "Otherscape.terms.crewIdentity",
                specials: ["loadout"],
            },
            "Noise": {
                localization: "Otherscape.terms.noise",
                sortOrder: 2,
                increaseLocalization: "Otherscape.terms.upgrade",
                decreaseLocalization: "Otherscape.terms.decay",
                identityName: "Otherscape.terms.itch",
            },
            "Self": {
                localization: "Otherscape.terms.self",
                sortOrder: 3,
                increaseLocalization: "Otherscape.terms.upgrade",
                decreaseLocalization: "Otherscape.terms.decay",
                identityName: "Otherscape.terms.identity",
            },
            "Mythos-OS": {
                localization: "Otherscape.terms.mythos",
                sortOrder: 1,
                increaseLocalization: "Otherscape.terms.upgrade",
                decreaseLocalization: "Otherscape.terms.decay",
                identityName: "Otherscape.terms.ritual",
            },
            //rewriting mythos is necessary due to a bug with older versions
            "Mythos": {
                localization: "Otherscape.terms.mythos",
                sortOrder: 1,
                increaseLocalization: "Otherscape.terms.upgrade",
                decreaseLocalization: "Otherscape.terms.decay",
                identityName: "Otherscape.terms.ritual",
            },
            "Crew-OS": {
                localization: "Otherscape.terms.crew",
                sortOrder: 5,
                increaseLocalization: "Otherscape.terms.upgrade",
                decreaseLocalization: "Otherscape.terms.decay",
                identityName: "Otherscape.terms.crewIdentity",
                specials: ["crew"],
            }
        };
    }
    async onChangeTo() {
        await super.onChangeTo();
        const settings = CitySettings;
        await settings.set("baseSystem", "otherscape");
        await settings.set("system", "otherscape");
        await settings.set("movesInclude", "otherscape");
    }
    async determineEssence(actor) {
        if (!CitySettings.get("autoEssence"))
            return;
        const essence = OtherscapeSystem.determineEssenceFromThemes(actor.mainThemes);
        if (essence) {
            await actor.setEssence(essence);
        }
        return essence;
    }
    static determineEssenceFromThemes(themes) {
        const themeTypes = themes.reduce((acc, theme) => {
            const themeType = theme.getThemebookOrTK().system.subtype;
            if (acc.includes(themeType) || !themeType)
                return acc;
            acc.push(themeType);
            return acc;
        }, []);
        let essence = undefined;
        switch (themeTypes.length) {
            case 0: return;
            case 1:
                switch (themeTypes[0]) {
                    case "Noise":
                        return CityDB.getEssenceBySystemName("Singularity");
                    case "Self":
                        return CityDB.getEssenceBySystemName("Real");
                    case "Mythos":
                        return; //can't defuined essence
                }
            case 2:
                switch (true) {
                    case !themeTypes.includes("Mythos"): {
                        return CityDB.getEssenceBySystemName("Cyborg");
                    }
                    case !themeTypes.includes("Noise"): {
                        return CityDB.getEssenceBySystemName("Spiritualist");
                    }
                    case !themeTypes.includes("Self"): {
                        return CityDB.getEssenceBySystemName("Transhuman");
                    }
                }
                break;
            case 3:
                return CityDB.getEssenceBySystemName("Nexus");
            default:
                break;
        }
        return essence;
    }
    async activate() {
        super.activate();
        for (const [name, data] of Object.entries(this.systemSettings())) {
            game.settings.register("city-of-mist", name, data);
        }
    }
    async registerItemSheets() {
        super.registerItemSheets();
        Items.registerSheet("city", CityItemSheetSmall, { types: ["essence"], makeDefault: true });
    }
    async _setHooks() {
        super._setHooks();
        Hooks.on("themeCreated", async (actor, theme) => {
            if (!this.isActive())
                return;
            if (actor.system.type != "character")
                return;
            if (actor.mainThemes.length < 4)
                return;
            //Nexus Theme Effect
            const oldEssence = actor.essence;
            const newEssence = await this.determineEssence(actor);
            if (newEssence == undefined) {
                console.log(`Unable to determine essence for ${actor.name}`);
                return;
            }
            if (actor.isOwner && oldEssence?.system.systemName == "Nexus" && newEssence?.systemName == "Nexus") {
                await theme.update({ "system.nascent": false });
            }
        });
    }
    getEssence(actor) {
        return actor.essence?.system.systemName;
    }
    gameTerms() {
        return {
            collective: "Otherscape.terms.scale",
            buildUpPoints: "Otherscape.terms.evolutionPoints",
            evolution: "Otherscape.terms.evolution",
        };
    }
    async updateRollOptions(html, options, dialog) {
        await super.updateRollOptions(html, options, dialog);
        const essence = this.getEssence(dialog.actor);
        const self = $(html).find("#add-self").prop("checked");
        const mythos = $(html).find("#add-mythos").prop("checked");
        const noise = $(html).find("#add-noise").prop("checked");
        const tt = [];
        if (self) {
            tt.push("Self");
        }
        if (mythos) {
            tt.push("Mythos");
        }
        if (noise) {
            tt.push("Noise");
        }
        if (essence == "Real" && self) {
            options.noPositiveTags = true;
        }
        options.themeTypes = tt;
    }
    async renderRollDialog(dialog) {
        await super.renderRollDialog(dialog);
        const essence = this.getEssence(dialog.actor);
        const move = CityDB.getMoveById(dialog.move_id);
        if (!move)
            return;
        if (move.system.category == "SHB")
            return;
        const selfLoc = localize("Otherscape.dialog.addSelf");
        const mythosLoc = localize("Otherscape.dialog.addMythos");
        const noiseLoc = localize("Otherscape.dialog.addNoise");
        const selfCheck = `
		<div>
		<label class="dialog-label" for="add-self"> ${selfLoc} </label>
		<input id="add-self" type="checkbox" ${false ? "checked" : ""} >
		</div>
		`;
        const mythosCheck = `
		<div>
		<label class="dialog-label" for="add-mythos"> ${mythosLoc} </label>
		<input id="add-mythos" type="checkbox" ${false ? "checked" : ""} >
		</div>
`;
        const noiseCheck = `
		<div>
		<label class="dialog-label" for="add-noise"> ${noiseLoc} </label>
		<input id="add-noise" type="checkbox" ${false ? "checked" : ""} >
		</div>
`;
        switch (essence) {
            case "Spiritualist": {
                const element = `
				<div>
					${selfCheck}
					${mythosCheck}
				</div>
				`;
                dialog.html.find(".essence-effects").append(element);
                break;
            }
            case "Cyborg": {
                const element = `;
				<div>
					${noiseCheck}
					${selfCheck}
					</div>
				`;
                dialog.html.find(".essence-effects").append(element);
                break;
            }
            case "Real": {
                const element = `<div>${selfCheck}</div>`;
                dialog.html.find(".essence-effects").append(element);
                break;
            }
            case "Singularity": {
                const element = `<div>${noiseCheck}</div>`;
                dialog.html.find(".essence-effects").append(element);
                break;
            }
            case "Nexus":
            case "Conduit":
            case "Avatar":
            case "Transhuman":
            case undefined:
                break;
            default:
                essence;
        }
    }
    systemSettings() {
        return {
            ...super.systemSettings(),
            "autoEssence": {
                name: localize("Otherscape.settings.autoEssence.name"),
                hint: localize("Otherscape.settings.autoEssence.hint"),
                scope: "client",
                config: true,
                type: Boolean,
                default: true,
                restricted: false
            }
        };
    }
}
