export class DBAccessor {
    static comp_actors = [];
    static comp_items = [];
    static init() {
        Hooks.once("ready", async () => {
            //@ts-ignore
            if (typeof Babele !== "undefined") {
                Hooks.once("babele.ready", async () => {
                    await this._loadPacks();
                });
            }
            else {
                await this._loadPacks();
            }
            this._loadPacks();
            this._initHooks();
            console.log("Database initialized");
            Hooks.callAll("DB Ready");
        });
    }
    static _initHooks() {
        Hooks.on("updateCompendium", this.onUpdateCompendium.bind(this));
        this.initHooks();
    }
    static initHooks() {
        //virtual
    }
    static filterItems(fn) {
        return DBAccessor.allItems().filter(fn);
    }
    static filterActors(fn) {
        return DBAccessor.allActors().filter(fn);
    }
    static filterItemsByType(type) {
        return DBAccessor.filterItems(x => x.type == type);
    }
    static filterActorsByType(type) {
        return DBAccessor.filterActors(x => x.type == type);
    }
    static allItems() {
        return DBAccessor.getAllByType("Item");
    }
    static allActors() {
        return DBAccessor.getAllByType("Actor");
    }
    static getActor(id) {
        return this.getActorById(id);
    }
    // static getActorById (id:string) {
    // 	return this.findById(id, "Actor");
    // }
    // static getItemById (id:string) {
    // 	return this.findById(id, "Item");
    // }
    static findById(id, type) {
        let retarr;
        switch (type) {
            case "Actor":
                retarr = DBAccessor.filterActors(x => x.id == id);
                break;
            case "Item":
                retarr = DBAccessor.filterItems(x => x.id == id);
                break;
            default:
                throw new Error(`Unsupported Type ${type}`);
        }
        if (retarr.length == 0) {
            return null;
        }
        return retarr[0];
    }
    static getAllByType(type) {
        const base_items = DBAccessor.getBaseItemsByType(type);
        const compendium_items = DBAccessor.getCompendiumItemsByType(type);
        return base_items.concat(compendium_items);
    }
    static getBaseItemsByType(type) {
        switch (type) {
            case "Actor": return Array.from(game.actors);
            case "Item": return Array.from(game.items);
            default: throw new Error(`Unsupported Type ${type}`);
        }
    }
    static getCompendiumItemsByType(type) {
        switch (type) {
            case "Actor": return DBAccessor.comp_actors;
            case "Item": return DBAccessor.comp_items;
            default: throw new Error(`Unsupported Type ${type}`);
        }
    }
    static async _loadPacks() {
        DBAccessor.comp_items = await this.getCompendiumDataByType("Item");
        DBAccessor.comp_actors = await this.getCompendiumDataByType("Actor");
        this.loadPacks();
    }
    static async loadPacks() {
        //virtual, designed to be extended
    }
    static getElementById(id, supertype = "Item") {
        return this.getAllByType(supertype)
            .find(x => x.id == id);
    }
    static getItemById(id) {
        return this.getElementById(id, "Item");
    }
    static getActorById(id) {
        return this.getElementById(id, "Actor");
    }
    static async getCompendiumDataByType(type) {
        const pack_finder = ((e) => e.documentName == type);
        const packs = game.packs.filter(pack_finder);
        let compendium_content = [];
        for (const pack of packs) {
            const packContent = (await pack.getDocuments());
            compendium_content = compendium_content.concat(packContent);
        }
        return compendium_content;
    }
    static async onUpdateCompendium(compendium) {
        console.debug("Updating Compendium");
        switch (compendium.documentName) {
            case "Actor":
            case "Item":
                await this.loadPacks();
            default: return;
        }
    }
    static namesort(a, b) {
        return a.name.localeCompare(b.name);
    }
    static findItem({ actor, itemId }) {
        if (actor) {
            const foundActor = this.findActor(actor);
            if (!foundActor) {
                return undefined;
            }
            const item = foundActor.items.find(x => x.id == itemId);
            if (!item) {
                return undefined;
            }
            return item;
        }
        return this.getItemById(itemId);
    }
    static findToken(acc) {
        if (!acc) {
            return undefined;
        }
        const { scene, tokenId } = acc;
        if (scene != null) {
            const sc = game.scenes.get(scene);
            if (!sc) {
                throw new Error(`Scene Id ${scene} doesn't exist`);
            }
            const tok = sc.tokens.get(tokenId);
            if (!tok) {
                throw new Error(`Token Id ${tokenId} doesn't exist`);
            }
            if (!tok.actor) {
                throw new Error(`No actor on Token Id ${tokenId}`);
            }
            return tok;
        }
        const sc = game.scenes.find(x => x.tokens.get(tokenId) != null);
        if (!sc) {
            throw new Error(`Couldn't find tokenId ${tokenId} on any scene`);
        }
        const tok = sc.tokens.get(tokenId);
        if (!tok.actor) {
            throw new Error(`No actor on Token Id ${tokenId}`);
        }
        return tok;
    }
    static findActor(accessor) {
        if (accessor.token != undefined) {
            const token = this.findToken(accessor.token);
            return token?.actor;
        }
        return this.getActorById(accessor.actorId);
    }
    static getUniversalItemAccessor(item) {
        return {
            actor: (item.parent) ? this.getUniversalActorAccessor(item.parent) : undefined,
            itemId: item.id,
        };
    }
    static getUniversalActorAccessor(actor) {
        if (actor.token && actor.token.object) {
            return {
                actorId: actor.id,
                token: this.getUniversalTokenAccessor(actor.token.object),
            };
        }
        for (const comb of game.combat?.combatants ?? []) {
            if (comb.actor == actor && comb.token.actorLink) {
                return {
                    actorId: actor.id,
                    token: this.getUniversalTokenAccessor(comb.token),
                };
            }
        }
        return {
            actorId: actor.id,
            token: undefined
        };
    }
    static getUniversalTokenAccessor(tok) {
        if (tok instanceof Token) {
            tok = tok.document;
        }
        return {
            scene: tok.parent.id,
            tokenId: tok.id,
        };
    }
    static accessorEq(a, b) {
        if ("tokenId" in a && "tokenId" in b) {
            return a.tokenId == b.tokenId;
        }
        if ("actorId" in a && "actorId" in b) {
            return a.actorId == b.actorId && a.token?.tokenId == a.token?.tokenId;
        }
        if ("itemId" in a && "itemId" in b) {
            return a.itemId == b.itemId && a.actor?.actorId == b.actor?.actorId && a.actor?.token?.tokenId == b.actor?.token?.tokenId;
        }
        return false;
    }
} //End of class
// Should inherit these to a subclass
// Hooks.once("ready", DBAccessor.init);
