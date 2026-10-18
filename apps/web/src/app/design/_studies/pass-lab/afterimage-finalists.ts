import type { RefinedSpec } from "./refinements";

export const FINALIST_SHAPES = [
  { id: "circle-outline", name: "Hollow circle", line: "The original contour, with an open centre." },
  { id: "circle-solid", name: "Solid circle", line: "A stronger head; the wake stays outlined." },
  { id: "ember-face", name: "Ember with a face", line: "Filled canonical Ember, always with eyes and a smile." },
  { id: "ember-outline", name: "Outlined Ember", line: "The same star contour, as open as the circle." },
] as const;
export type FinalistShape = typeof FINALIST_SHAPES[number]["id"];
export const FINALIST_BACKGROUNDS = [
  { id: "white", name: "White", color: "#ffffff" },
  { id: "grey", name: "Grey", color: "#e6e7e8" },
  { id: "black", name: "Black", color: "#151817" },
] as const;
export type FinalistBackground = typeof FINALIST_BACKGROUNDS[number]["id"];
export const FINALIST_PALETTES = [
  { id: "gold-silver", name: "Gold / silver", main: "#dfb451", peer: "#9fa5af", tag: "SOFTER ALTERNATIVE" },
  { id: "rich-gold-silver", name: "Rich gold / silver", main: "#dfad3c", peer: "#9fa5af", tag: "FINALIZED PALETTE" },
  { id: "club", name: "Theme yellow / sage", main: "#f1c75b", peer: "#819486", tag: "FAMILIAR" },
  { id: "cobalt", name: "Lemon / cobalt", main: "#f3d348", peer: "#547bc7", tag: "CRISP" },
  { id: "violet", name: "Gold / violet", main: "#dfb451", peer: "#9a80bc", tag: "EXPRESSIVE" },
  { id: "sky", name: "Sunshine / sky", main: "#ffd24c", peer: "#68a6c4", tag: "AIRY" },
  { id: "coral", name: "Rich gold / coral", main: "#dfad3c", peer: "#d38778", tag: "WARM" },
  { id: "teal", name: "Soft yellow / teal", main: "#f4d77c", peer: "#51938b", tag: "CALM" },
  { id: "silver", name: "Champagne / silver", main: "#dfc078", peer: "#9aabb9", tag: "QUIET" },
  { id: "two-golds", name: "Yellow / burnished gold", main: "#f5ce4f", peer: "#b98a36", tag: "TONAL" },
] as const;

// Locked form/background/motion; gold/silver is the working palette, with rich gold/silver retained beside it.
export const AFTERIMAGE_SELECTION = {
  shape: "circle-outline", palette: "rich-gold-silver", background: "white", trail: "subtle",
} as const;

export function finalistSpec(shape: FinalistShape, paletteId: string, backgroundId: FinalistBackground, trail: "equal" | "subtle"): RefinedSpec {
  const palette = FINALIST_PALETTES.find(p => p.id === paletteId) ?? FINALIST_PALETTES[0];
  const background = FINALIST_BACKGROUNDS.find(b => b.id === backgroundId) ?? FINALIST_BACKGROUNDS[0];
  return {
    id: `afterimage-${shape}-${palette.id}-${background.id}-${trail}`,
    name: `${FINALIST_SHAPES.find(s => s.id === shape)!.name} · ${palette.name} · ${background.name}`,
    family: "afterimage", shape, ember: shape.startsWith("ember"), dark: background.id === "black", gold: true,
    lanes: false, slow: trail, palette: { bg: background.color, main: palette.main, peer: palette.peer },
    note: trail === "equal" ? "Equal length, spacing and flow speed on both racers." : "The rival wake is about 11% shorter and flows about 22% more slowly. Four echoes on each racer.",
  };
}

export const FINALIST_BOARD = FINALIST_PALETTES.flatMap(p => FINALIST_BACKGROUNDS.map(b => finalistSpec("circle-outline", p.id, b.id, "subtle")));
