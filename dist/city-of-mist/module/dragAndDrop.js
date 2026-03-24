import { CityItem } from "./city-item.js";
import { STATUS_CATEGORIES } from "./config/status-categories.js";
import { CityDialogs } from "./city-dialogs.js";
import { SceneTags } from "./scene-tags.js";
import { CityDB } from "./city-db.js";
import { CityHelpers } from "./city-helpers.js";
export class DragAndDrop {
    static init() { }
    static async draggedElement(event) {
        const dragging = $(document).find(".dragging");
        if (dragging.length == 1) {
            return dragging;
        }
        const itemObject = TextEditor.getDragEventData(event.originalEvent);
        if (itemObject && itemObject.type == "Item") {
            //@ts-expect-error using unknwon function not in foundrytypes
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
            const item = await Item.implementation.fromDropData(itemObject);
            return item;
        }
        Debug(itemObject ?? "No Item Object");
        Debug(event);
        console.warn("Something went wrong with dragging");
        throw new Error("Something went wrong with Dragging");
    }
    static async dropTagOnActor(textTag, actor, options = {}) {
        await actor.createStoryTag(textTag, true, options);
    }
    static getDraggableType(draggable) {
        return draggable.data("draggableType");
    }
    static async dropDraggableOnSceneTags(draggable, dragOptions = {}) {
        if (!game.user.isGM) {
            return;
        }
        if (draggable instanceof CityItem) {
            return this._dropItemDropTypeDraggableOnSceneTags(draggable, dragOptions);
        }
        return this._dropBasicTypeDraggableOnSceneTags(draggable, dragOptions);
    }
    static async _dropItemDropTypeDraggableOnSceneTags(item, dragOptions = {}) {
        const draggableType = item.system.type;
        switch (draggableType) {
            case "status": {
                const statusOptions = {
                    tier: item.tier,
                    mergeWithStatus: dragOptions.mergeStatus,
                };
                await SceneTags.statusDrop(item.name, statusOptions);
                break;
            }
            case "tag": {
                await SceneTags.createSceneTag(item.name, true, dragOptions);
                break;
            }
            default:
                Debug(item);
                throw new Error(`Type ${item.system.type} is not supported for dragging here`);
        }
    }
    static async _dropBasicTypeDraggableOnSceneTags(draggable, dragOptions = {}) {
        const draggableType = DragAndDrop.getDraggableType(draggable);
        const options = {
            ...(draggable.data("options") ?? {})
        }; //copy is required because JQuery makes a cache of the data and will read phantom data in other places
        switch (draggableType) {
            case "status": {
                const name = String(draggable.data("name") ?? "name unknown");
                const statusOptions = options;
                if (dragOptions.mergeStatus) {
                    statusOptions.mergeWithStatus = dragOptions.mergeStatus;
                }
                await SceneTags.statusDrop(name, statusOptions);
                break;
            }
            case "tag":
                await SceneTags.createSceneTag(draggable.text(), true, options);
                break;
            case "gmmove":
            case "threat":
                break;
            default:
                draggableType;
                break;
        }
    }
    static async dropDraggableOnActor(draggable, actor, dragOptions = {}) {
        if (!actor.isOwner) {
            return;
        }
        if (draggable instanceof CityItem) {
            return this._dropItemDraggableOnActor(draggable, actor, dragOptions);
        }
        const options = {
            ...(draggable.data("options") ?? {})
        }; //copy is required because JQuery makes a cache of the data and will read phantom data in other places
        const draggableType = DragAndDrop.getDraggableType(draggable);
        const name = String(draggable.data("name") ?? "name unknown");
        switch (draggableType) {
            case "status": {
                const statusOptions = options;
                if (dragOptions.mergeStatus) {
                    statusOptions.mergeWithStatus = dragOptions.mergeStatus;
                }
                await this.statusDrop(actor, name, statusOptions);
                break;
            }
            case "tag": {
                await this.dropTagOnActor(name, actor, options);
                break;
            }
            case "gmmove": {
                const move_id = draggable.data("moveId");
                const owner_id = draggable.data("ownerId");
                if (owner_id == actor.id) {
                    return;
                } // can't add a move on actor that already has it
                const owner = CityDB.getActorById(owner_id);
                const move = owner.getGMMove(move_id);
                if (!move) {
                    throw new Error(`Couldn't find move Id ${move_id} in ${owner_id}`);
                }
                await actor.createNewGMMove(move.name, move.system);
                //TODO: make draggable GM moves
                break;
            }
            case "threat":
                break;
            default:
                draggableType;
                console.warn(`Unknown draggableType: ${draggableType}`);
        }
    }
    static async _dropItemDraggableOnActor(item, actor, dragOptions) {
        switch (item.system.type) {
            case "tag":
                await this.dropTagOnActor(item.name, actor, dragOptions);
                break;
            case "status":
                const statusOptions = {
                    mergeStatus: dragOptions.mergeStatus,
                    tier: item.tier,
                };
                await this.statusDrop(actor, item.name, statusOptions);
                break;
            default:
                throw new Error(`Unknown draggableType: ${item.system.type}`);
        }
    }
    static async statusDrop(actor, name, options) {
        const tier = options.tier;
        if (!tier || tier < 0) {
            throw new Error(`Tier is not valid ${tier}`);
        }
        const retval = await (options.mergeWithStatus
            ? CityDialogs.mergeWithStatusDialog(options.mergeWithStatus, name, options)
            : CityDialogs.statusDropDialog(actor, name, { ...options, tier }));
        if (retval == null) {
            return null;
        }
        switch (retval.action) {
            case 'create':
                const { tier, pips } = retval;
                const status = await actor.createNewStatus(retval.name, tier, pips);
                await CityHelpers.modificationLog(actor, "Created", status, `tier  ${retval.tier}`);
                return status;
            case 'add':
            case 'merge': {
                const origStatus = actor.getStatus(retval.statusId);
                options.newName = retval.name;
                await origStatus.addStatus(retval.tier, options);
                return origStatus;
            }
            case "subtract": {
                const origStatus = actor.getStatus(retval.statusId);
                options.newName = retval.name;
                await origStatus.subtractStatus(retval.tier, options.newName);
                return origStatus;
            }
            case "override": {
                const status = actor.getStatus(retval.statusId);
                const origName = status.name;
                const { name } = retval;
                await status.update({ name, system: { ...retval } });
                await CityHelpers.modificationLog(actor, `Overrode Status: ${origName} with ${name} tier  ${retval.tier}`);
                return status;
            }
            default:
                retval;
                throw new Error(`Unknown action : ${retval?.action}`);
        }
    }
    static addDragFunctionality(html) {
        html.find('.draggable').on("dragstart", DragAndDrop.dragStart);
        html.find('.draggable').on("dragend", DragAndDrop.dragEnd);
    }
    static async dragStart(event) {
        event.stopPropagation();
        $(event.currentTarget).addClass("dragging");
        return true;
    }
    static async dragEnd(event) {
        event.stopPropagation();
        $(event.currentTarget).removeClass("dragging");
        return true;
    }
    static initCanvasDropping() {
        //@ts-ignore
        const old = DragDrop.prototype._handleDrop;
        //@ts-ignore
        DragDrop.prototype._handleDrop = function (event) {
            const dragged = $(document).find(".dragging");
            if (dragged.length == 0) {
                old.call(this, event);
                return;
            }
            event.preventDefault();
            const { clientX: x, clientY: y } = event;
            //@ts-ignore
            const { x: evX, y: evY } = canvas.canvasCoordinatesFromClient({ x, y });
            //@ts-ignore
            const tokens = canvas.tokens.objects.children
                .filter((maybeTok) => maybeTok instanceof Token);
            const token = tokens.find((tok) => {
                //@ts-ignore
                const { x, y, width, height } = tok.bounds;
                if (evX >= x && evX < x + width
                    && evY >= y && evY < y + height) {
                    return true;
                }
                return false;
            });
            if (!token) {
                return;
            }
            const actor = token.document.actor;
            DragAndDrop.dropDraggableOnActor(dragged, actor);
        };
    }
    static htmlDraggableStatus(name, options) {
        const tier = options.tier;
        let nameExtra = "";
        const autoStatus = options.autoApply ? "auto-status" : "";
        nameExtra += (options.category && options.category != "none") ? game.i18n.localize(STATUS_CATEGORIES[options.category]) : "";
        const nameParens = nameExtra.length ? `(${nameExtra})` : "";
        return `<span draggable="true" class="narrated-status-name draggable ${autoStatus}" data-draggable-type="status" data-name='${name}' data-tier='${tier}' data-options='${JSON.stringify(options)}'>${name}-<span class="status-tier">${tier} ${nameParens}</span></span>`;
    }
    static htmlDraggableTag(name, options) {
        return `<span draggable="true" class="narrated-story-tag draggable" data-name='${name}' data-draggable-type="tag" data-options='${JSON.stringify(options)}'>${name}</span>`;
    }
}
DragAndDrop.initCanvasDropping();
Hooks.on("canvasReady", DragAndDrop.init);
//@ts-ignore
window.DragAndDrop = DragAndDrop;
