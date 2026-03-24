import { localizeS } from "./handlebars-helpers.js";
export class HTMLTools {
    /** gets a data property by starting at the elementa nd working upwards up the HTML tree. If there is a default_value it will use that if it doesn't find twhat it's looking for, otherwise it will throw*/
    static getClosestData(eventOrJQObj, prop, default_value) {
        const target = ("currentTarget" in eventOrJQObj) ? eventOrJQObj.currentTarget : eventOrJQObj;
        if (!target) {
            throw new Error("No target");
        }
        const convert = function (string) {
            return Array.from(string).map(x => {
                if (x === x.toLowerCase()) {
                    return x;
                }
                else {
                    return "-" + x.toLowerCase();
                }
            }).join("");
        };
        if (prop === undefined) {
            throw new Error("Property name is undefined");
        }
        const cssprop = convert(prop);
        const data = $(target).closest(`[data-${cssprop}]`).data(prop);
        if (data != null) {
            return data;
        }
        else {
            if (default_value !== undefined) {
                // console.debug(`Get Closest Data return default value : ${default_value}`);
                return default_value;
            }
            throw new Error(`Couldn't find ${prop} property`);
        }
    }
    static getClosestDataNT(eventOrJQObj, prop, default_value) {
        try {
            const x = HTMLTools.getClosestData(eventOrJQObj, prop, default_value);
            return x;
        }
        catch {
            return null;
        }
    }
    static convertForm(str) {
        return Array.from(str).map(x => {
            if (x === x.toLowerCase()) {
                return x;
            }
            else {
                return "-" + x.toLowerCase();
            }
        }).join("");
    }
    static async editItemWindow(item) {
        await item.sheet.render(true);
        return await new Promise((keep, _brk) => {
            const checker = () => {
                const isOpen = item.sheet._state != -1; //window state check
                if (isOpen) {
                    setTimeout(checker, 500);
                }
                else {
                    keep(item);
                }
            };
            setTimeout(checker, 1000);
        });
    }
    // **************************************************
    // *****************   Dialogs  ****************** *
    // **************************************************
    /** brings up a confirmation window
    @param {string} title starting with a # will localize
    @param {string} text starting with a # will localize
    @param {{ defaultYes ?: boolean, onClose ?: "reject" | "yes" | "no"}} options
    */
    static async confirmBox(title, text, options = {}) {
        const templateData = { text: localizeS(text) };
        const html = await foundry.applications.handlebars.renderTemplate(`systems/${game.system.id}/module/tools/confirmation-dialog.hbs`, templateData);
        return await new Promise((conf, reject) => {
            Dialog.confirm({
                title: localizeS(title).toString(),
                content: html,
                yes: () => conf(true),
                no: () => conf(false),
                defaultYes: !!options?.defaultYes,
                rejectClose: true,
            }).catch(() => {
                switch (options?.onClose ?? "false") {
                    case "false":
                        conf(false);
                        break;
                    case "true":
                        conf(true);
                        break;
                    case "reject":
                        // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
                        reject("close");
                        break;
                    default: {
                        const msg = (`Unknown Option in options.onClose: ${options.onClose}`);
                        console.warn(msg);
                        // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
                        reject(msg);
                        break;
                    }
                }
            });
        });
    }
    static writeHTMLSelector(dataKey, initial, choices, label = "", localize = false) {
        if (Array.isArray(choices)) {
            choices = Object.fromEntries(choices.map(x => [String(x), String(x)]));
        }
        label = localize ? game.i18n.localize(label) : label;
        const selectItems = Object.entries(choices).map(([k, v]) => {
            if (v != k) {
                v = game.i18n.localize(v);
            }
            return `<option value="${k}"> ${v} </option>`;
        });
        return `<select class="key-${dataKey}">
		<label> ${label} </label>
		${selectItems.join("")}
		</select>`;
    }
    static async dynamicDialog(elements, title = "") {
        let html = "";
        for (const [k, v] of Object.entries(elements)) {
            const initial = v.initial;
            if (v.localize) {
                v.label = game.i18n.localize(v.label);
            }
            switch (typeof initial) {
                case "string":
                    if ("choices" in v) {
                        html += this.writeHTMLSelector(k, initial, v.choices, v.label, v.localize);
                        break;
                    }
                    html += `<div class="string-input key-${k}">
					<label> ${v.label} </label>
					<input type="text" value="${initial}">
					</div> `;
                    break;
                case "number":
                    if ("choices" in v) {
                        html += this.writeHTMLSelector(k, initial, v.choices, v.label, v.localize);
                        break;
                    }
                    html += `<div class="number-input key-${k}">
					<label> ${v.label} </label>
					<input type="number" value="${initial}">
					</div> `;
                    break;
                case "boolean":
                    html += `<div class="boolean-input key-${k}">
					<label> ${v.label} </label>
					<input type="checkbox" ${initial ? "checked" : ""}>
					</div> `;
                    break;
                default:
                    html += `UNRECOGNIZED TYPE ${typeof initial}`;
            }
        }
        html = `<br> <div> ${html} </div> <hr>`;
        return await new Promise((conf, reject) => {
            const x = new Dialog({
                title,
                content: html,
                render: (html) => {
                    const k = Object.keys(elements).at(0);
                    $(html).find(`key-${k}`).trigger("focus");
                },
                // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
                close: () => reject("close"),
                buttons: {
                    okay: {
                        label: "OK",
                        callback: (_html) => {
                            const ret = Object.entries(elements)
                                .map(([k, v]) => {
                                if (v.choices) {
                                    const data = $(`select.key-${k}`).find(":selected").val();
                                    if (typeof v.initial == "number") {
                                        return [k, Number(data)];
                                    }
                                    else {
                                        return [k, String(data)];
                                    }
                                }
                                switch (typeof v.initial) {
                                    case "string":
                                        {
                                            const str = String($(`.key-${k} input`).val());
                                            return [k, str];
                                        }
                                    case "number":
                                        {
                                            const num = Number($(`.key-${k} input`).val());
                                            return [k, num];
                                        }
                                    case "boolean":
                                        {
                                            const checked = $(`.key-${k} input`).is(":checked");
                                            return [k, checked];
                                        }
                                    default:
                                        throw new Error(`Unknown Tyep ${v.initial}`);
                                }
                            });
                            // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
                            conf(Object.fromEntries(ret));
                        }
                    }
                },
                default: "okay",
            }, {});
            x.render(true);
        });
    }
    static async ItemSelectionDialog(itemlist, data, title = "Select One", list_of_properties = []) {
        const revlist = itemlist.map(x => {
            return {
                id: x.id,
                data: [x.name].concat(list_of_properties.map(y => x.system[y])),
                description: x?.description ?? "",
            };
        });
        return await this.singleChoiceBox(revlist, title);
    }
    /** List is in the form of {id, data:[rows], description} returns null if abort or the id of the selection.
        */
    static async singleChoiceBox(list, headerText) {
        //List is in form of {id, data: [rows], description}
        const options = {};
        const templateData = { list };
        const html = await foundry.applications.handlebars.renderTemplate(`systems/${game.system.id}/module/tools/singleChoiceBox.hbs`, templateData);
        return await new Promise((conf, _reject) => {
            const dialog = new Dialog({
                title: `${headerText}`,
                content: html,
                buttons: {
                    one: {
                        icon: `<i class="fas fa-check"></i>`,
                        label: "Confirm",
                        callback: (htm) => {
                            const selection = [];
                            $(htm).find(".single-choice-box").find("input:checked").each(function () {
                                selection.push($(this).val());
                            });
                            if (selection.length > 1) {
                                throw new Error(`Problem with selection, Length is ${selection.length}`);
                            }
                            if (selection.length > 0) {
                                conf(selection[0]);
                            }
                            else {
                                conf(null);
                            }
                        }
                    },
                    two: {
                        icon: `<i class="fas fa-times"></i>`,
                        label: "Cancel",
                        callback: () => conf(null)
                    }
                },
                close: () => {
                    conf(null);
                },
            }, options);
            dialog.render(true);
        });
    }
    /** List is in the form of {id, data:[rows], description}
    returns null if abort or the id of the selection.
        */
    static async multiChoiceBox(list, headerText) {
        const options = {};
        const templateData = { list };
        const html = await foundry.applications.handlebars.renderTemplate(`systems/${game.system.id}/module/tools/multiChoiceBox.hbs`, templateData);
        return await new Promise((conf, _reject) => {
            const dialog = new Dialog({
                title: `${headerText}`,
                content: html,
                buttons: {
                    one: {
                        icon: `<i class="fas fa-check"></i>`,
                        label: "Confirm",
                        callback: (htm) => {
                            const selection = [];
                            $(htm).find(".multi-choice-box").find("input:checked").each(function () {
                                selection.push($(this).val());
                            });
                            if (selection.length > 0) {
                                conf(selection);
                            }
                            else {
                                conf(null);
                            }
                        }
                    },
                    two: {
                        icon: `<i class="fas fa-times"></i>`,
                        label: "Cancel",
                        callback: () => conf(null)
                    }
                },
                close: () => {
                    conf(null);
                },
            }, options);
            dialog.render(true);
        });
    }
    /** returns an array of actors */
    static async PCSelector(pclist, title = "Select PCs") {
        const list = pclist.map(actor => {
            return {
                id: actor.id,
                data: [actor.name],
                description: "",
            };
        });
        const ret = await this.multiChoiceBox(list, title);
        if (ret) {
            return ret;
        }
        else {
            return [];
        }
    }
    static div(cssClass) {
        if (typeof cssClass == "string") {
            cssClass = [cssClass];
        }
        const div = document.createElement('div');
        for (const cl of cssClass) {
            div.classList.add(cl);
        }
        return div;
    }
    // **************************************************
    // **************   EventHandlers  *************** *
    // **************************************************
    static middleClick(handler) {
        return function (event) {
            if (event.which == 2) {
                event.preventDefault();
                event.stopPropagation();
                return handler(event);
            }
        };
    }
    static rightClick(handler) {
        return function (event) {
            if (event.which == 3) {
                event.preventDefault();
                event.stopPropagation();
                return handler(event);
            }
        };
    }
    static getElementValue(element) {
        // Ensure we have a jQuery object
        if (!element || !(element instanceof jQuery)) {
            return undefined;
        }
        // Check if the element is a checkbox
        if (element.is(':checkbox')) {
            return element.is(':checked');
        }
        // Check if the element is a select (single or multiple)
        if (element.is('select')) {
            // If it's a multiple select box
            if (element.prop('multiple')) {
                const selectedValues = [];
                element.find('option:selected').each((_i, option) => {
                    selectedValues.push($(option).val());
                });
                return selectedValues.join(', '); // Join multiple selections with a comma
            }
            // Single select
            return element.val();
        }
        // Check if the element is an input or textarea
        if (element.is('input') || element.is('textarea')) {
            const inputType = element.attr('type');
            // Handle number inputs
            if (inputType === 'number') {
                const value = element.val();
                return value ? Number(value) : undefined;
            }
            // Handle other input types like text
            return element.val();
        }
        // In case of other unsupported types, return undefined
        return undefined;
    }
    static initCustomJqueryFunctions() {
        if (!jQuery.fn.middleclick) {
            jQuery.fn.middleclick = function (handler) {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
                this.mousedown(HTMLTools.middleClick(handler));
            };
        }
        if (!jQuery.fn.rightclick) {
            jQuery.fn.rightclick = function (handler) {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
                this.mousedown(HTMLTools.rightClick(handler));
            };
        }
        if (!jQuery.fn.getSelected) {
            jQuery.fn.getSelected = function () {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
                return HTMLTools.getElementValue(this);
            };
        }
    }
} // end of class
// Jquery Addons
HTMLTools.initCustomJqueryFunctions();
