/** Sport-neutral mascot options shared by web and mobile. */
export const MASCOTS = {
  "star-ember": {
    name: "Star Ember",
    description: "Star Ember, a smiling golden star with a flame-shaped tip",
  },
  "quiet-ace": {
    name: "Quiet Ace",
    description: "Quiet Ace, a smiling floating plum star",
  },
} as const;

export type MascotVariant = keyof typeof MASCOTS;

/** Change this to switch the default on both platforms. */
export const DEFAULT_MASCOT: MascotVariant = "star-ember";
