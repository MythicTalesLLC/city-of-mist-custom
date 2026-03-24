// ============================================================================
// CoM – Set Default Icons by Item Type
// ============================================================================
// Maps the 11 custom icon images to their corresponding City of Mist item
// types.  Works two ways:
//
//   CUSTOM FORK  (MythicTales city-of-mist-custom):
//     Calls game.settings.set() for each key — PERSISTENT across sessions.
//     Run this macro ONCE after uploading the images.
//
//   VANILLA TARAGNOR SYSTEM:
//     Registers a preCreateItem hook for the current browser session.
//     Run this macro each time you load Foundry, or install World Scripter
//     and set it to auto-run on startup.
//
// SETUP
// ─────
// 1. In Foundry, open the File Manager (any file picker → Browse).
// 2. Create a folder under your world or in the root, e.g.:
//       worlds/<your-world>/assets/icons/com/
// 3. Upload the 11 JPGs from your local Downloads folder into that folder.
// 4. Update BASE_PATH below to match where you uploaded them.
//
// FILE → ITEM TYPE MAPPING (auto-detected from filenames)
//   abilities.jpg   → essence
//   clues.jpg       → clue
//   gm_moves.jpg    → gmmove
//   improvements.jpg→ improvement
//   juice.jpg       → juice
//   player_moves.jpg→ move
//   spectrum.jpg    → spectrum
//   status.jpg      → status
//   tags.jpg        → tag
//   theme.jpg       → theme, themekit
//   themebook.jpg   → themebook
// ============================================================================

(async () => {
    // ── CONFIG — Edit this to match where you uploaded the images ─────────────
    const BASE_PATH = "worlds/your-world/assets/icons/com"; // ← UPDATE THIS

    // ── Type → Icon path mapping ──────────────────────────────────────────────
    const TYPE_ICON_MAP = {
        theme:        `${BASE_PATH}/theme.jpg`,
        themekit:     `${BASE_PATH}/theme.jpg`,
        themebook:    `${BASE_PATH}/themebook.jpg`,
        tag:          `${BASE_PATH}/tags.jpg`,
        improvement:  `${BASE_PATH}/improvements.jpg`,
        status:       `${BASE_PATH}/status.jpg`,
        spectrum:     `${BASE_PATH}/spectrum.jpg`,
        clue:         `${BASE_PATH}/clues.jpg`,
        juice:        `${BASE_PATH}/juice.jpg`,
        move:         `${BASE_PATH}/player_moves.jpg`,
        gmmove:       `${BASE_PATH}/gm_moves.jpg`,
        essence:      `${BASE_PATH}/abilities.jpg`,
    };

    // ── Detect which system is active ─────────────────────────────────────────
    const CUSTOM_FORK_SETTING = "defaultIcon_item_theme";
    let useSettings = false;
    try {
        game.settings.get("city-of-mist", CUSTOM_FORK_SETTING);
        useSettings = true;
    } catch (_e) {
        // setting key doesn't exist — vanilla taragnor system
    }

    // ── Path: custom fork — write to persistent settings ─────────────────────
    if (useSettings) {
        const settingsMap = {
            defaultIcon_item_theme:        TYPE_ICON_MAP.theme,
            defaultIcon_item_themekit:     TYPE_ICON_MAP.themekit,
            defaultIcon_item_themebook:    TYPE_ICON_MAP.themebook,
            defaultIcon_item_tag:          TYPE_ICON_MAP.tag,
            defaultIcon_item_improvement:  TYPE_ICON_MAP.improvement,
            defaultIcon_item_status:       TYPE_ICON_MAP.status,
            defaultIcon_item_spectrum:     TYPE_ICON_MAP.spectrum,
            defaultIcon_item_clue:         TYPE_ICON_MAP.clue,
            defaultIcon_item_juice:        TYPE_ICON_MAP.juice,
            defaultIcon_item_move:         TYPE_ICON_MAP.move,
            defaultIcon_item_gmmove:       TYPE_ICON_MAP.gmmove,
            defaultIcon_item_essence:      TYPE_ICON_MAP.essence,
        };
        let saved = 0;
        for (const [key, val] of Object.entries(settingsMap)) {
            await game.settings.set("city-of-mist", key, val);
            saved++;
        }
        ui.notifications.info(
            `✓ CoM default icons saved to system settings (${saved} types). ` +
            `Icons will apply to all newly created items — no re-run needed.`
        );
        return;
    }

    // ── Path: vanilla taragnor — register preCreateItem hook for this session ─
    const DEFAULT_ITEM_IMG = "icons/svg/item-bag.svg";

    // Remove any previously registered handler to avoid stacking duplicates
    if (window._comDefaultIconHook) {
        Hooks.off("preCreateItem", window._comDefaultIconHook);
    }

    window._comDefaultIconHook = (item, data) => {
        if (!data.img || data.img === DEFAULT_ITEM_IMG) {
            const icon = TYPE_ICON_MAP[item.type];
            if (icon) item.updateSource({ img: icon });
        }
    };

    Hooks.on("preCreateItem", window._comDefaultIconHook);

    ui.notifications.info(
        `✓ CoM default icons registered for this session (${Object.keys(TYPE_ICON_MAP).length} types). ` +
        `Re-run this macro after each reload, or use World Scripter to auto-run it.`
    );
})();
