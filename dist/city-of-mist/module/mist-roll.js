import { CitySettings } from "./settings.js";
import { CityRoll } from "./city-roll.js";
import { CityDB } from "./city-db.js";
export class MistRoll extends Roll {
    constructor(dice_expr, data = {}, options) {
        super(dice_expr, data, options);
        this.options = {
            modifiers: options.modifiers ?? [],
            tags: options.tags ?? [],
            createdItems: [],
            extraFeats: [],
            moveId: options.moveId,
            canCreateTags: options.canCreateTags ?? false,
            forceShowPanel: options.forceShowPanel ?? false,
            ...this.options,
        };
    }
    get powerCostOfRollOptions() {
        const options = this.options;
        const tags = options.createdItems.filter(x => x.type == "tag").length;
        const statuses = options.createdItems
            .filter(x => x.type == "status")
            .reduce((a, x) => a + x.tier, 0);
        const other = options.extraFeats.length;
        return tags * CitySettings.tagCreationPowerCost() + statuses * CitySettings.statusCreationPowerCost() + other;
    }
    get move() {
        const move = CityDB.getMoveById(this.options.moveId);
        if (!move) {
            throw new Error("No Move found for roll");
        }
        return move;
    }
    get showPowerPanel() {
        if (CitySettings.getBaseSystem() == "city-of-mist") {
            return true;
        }
        const o = this.options;
        if (o.forceShowPanel)
            return true;
        const { total } = CityRoll.getTotal(this);
        return o.canCreateTags && total > 6;
    }
}
