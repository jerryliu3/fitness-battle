/** Top-to-bottom order for immersive field controls (view switcher, layers menu, follow lock). */
export const FIELD_ARENA_CHROME_ORDER = ["view", "options", "ground", "follow"] as const;

export type FieldArenaChromeSlot = (typeof FIELD_ARENA_CHROME_ORDER)[number];

/** Slots published by the map layer (parent adds `view`). */
export type FieldMapChromeSlot = Extract<FieldArenaChromeSlot, "options" | "follow">;