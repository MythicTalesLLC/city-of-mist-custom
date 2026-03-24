export const MIST_ENGINE_EFFECT_TYPES_LIST = [
    "attack",
    "disrupt",
    "influence",
    "weaken",
    "bestow",
    "create",
    "enhance",
    "restore",
    "advance",
    "set-back",
    "discover",
    "extra-feat",
];
export const MIST_ENGINE_EFFECTS = Object.fromEntries(MIST_ENGINE_EFFECT_TYPES_LIST.map(x => [x, `MistEngine.rollEffects.effect.${x}`]));
