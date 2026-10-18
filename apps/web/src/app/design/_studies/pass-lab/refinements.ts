export type RefinedFamily = "afterimage" | "open-track" | "twin-trails";
export type RefinedSpec = {
  id: string; name: string; family: RefinedFamily; note: string;
  dark: boolean; gold: boolean; slow: "dense" | "none" | "normal" | "equal" | "subtle";
  ember?: boolean; lanes?: boolean; echoes?: boolean;
  shape?: "circle-outline" | "circle-solid" | "ember-face" | "ember-outline";
  palette?: { bg: string; main: string; peer: string };
};

export const REFINEMENTS: readonly RefinedSpec[] = [
  { id: "echo-density", name: "Different speeds", family: "afterimage", note: "Tight, slow echoes behind the rival; a longer, more widely spaced wake behind you.", dark: false, gold: false, slow: "dense" },
  { id: "echo-solo", name: "Only you leave a wake", family: "afterimage", note: "The rival stays clean. All the motion belongs to the passing racer.", dark: false, gold: false, slow: "none" },
  { id: "echo-gold-light", name: "Gold / daylight", family: "afterimage", note: "Your racer and its echoes take the theme gold. The rival is muted sage.", dark: false, gold: true, slow: "dense" },
  { id: "echo-gold-dark", name: "Gold / after dark", family: "afterimage", note: "The same gold identity against charcoal, with a pale sage rival.", dark: true, gold: true, slow: "dense" },
  { id: "echo-ember-light", name: "Ember / daylight", family: "afterimage", note: "The actual Ember contour replaces the circle in both the head and every echo.", dark: false, gold: true, slow: "none", ember: true },
  { id: "echo-ember-dark", name: "Ember / after dark", family: "afterimage", note: "Golden Ember contours against charcoal; the rival has a quiet, dense wake.", dark: true, gold: true, slow: "dense", ember: true },
  { id: "echo-lanes-light", name: "Marked lanes / daylight", family: "afterimage", note: "Three open vertical rules ground the echoes in an unmistakable race.", dark: false, gold: true, slow: "dense", lanes: true },
  { id: "echo-lanes-dark", name: "Marked lanes / after dark", family: "afterimage", note: "The same lane-marked identity, with gold and sage on charcoal.", dark: true, gold: true, slow: "dense", lanes: true },
  { id: "track-open-light", name: "No finish line", family: "open-track", note: "Just three vertical lines. The bottom border is gone, so the field stays open.", dark: false, gold: false, slow: "none", lanes: true },
  { id: "track-echo-light", name: "Track + afterimage", family: "open-track", note: "Filled tokens retain Open Track’s clarity; contour wakes add the sense of passing.", dark: false, gold: true, slow: "dense", lanes: true, echoes: true },
  { id: "track-open-dark", name: "Gold on charcoal", family: "open-track", note: "An open track and a solid gold leading token, with no bottom border or echoes.", dark: true, gold: true, slow: "none", lanes: true },
  { id: "track-echo-dark", name: "Night track + afterimage", family: "open-track", note: "Gold, filled tokens and flowing contours. The most direct meeting of both favourites.", dark: true, gold: true, slow: "dense", lanes: true, echoes: true },
];

export const TWIN_REFINEMENT: RefinedSpec = { id: "twin-flow", name: "Twin trails", family: "twin-trails", note: "A continuous tail with a backward-moving pulse inside it.", dark: false, gold: true, slow: "normal" };

export function refinementColors(spec: RefinedSpec) {
  return {
    bg: spec.palette?.bg ?? (spec.dark ? "#282f2c" : "#fafaf7"),
    main: spec.palette?.main ?? (spec.gold ? "#f1c75b" : "#282f2c"),
    peer: spec.palette?.peer ?? (spec.dark ? "#b7c7bb" : "#819486"),
    ink: spec.dark ? "#fafaf7" : "#282f2c",
    rule: spec.dark ? "#647168" : "#c7d1c3",
  };
}
