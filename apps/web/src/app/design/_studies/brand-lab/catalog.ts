/** Review fixtures only. Production scoring, entitlement and theme modules do not import this file. */
export type BrandFamily = "territory" | "baseline" | "neutral";
export type BrandView = "product" | "campaign" | "locker";
export type AppView = "Home" | "Compete" | "Crew" | "Athlete";
export type WeekId = "current" | "previous";
export type SkinId =
  | "classic"
  | "mint"
  | "lilac"
  | "arcade"
  | "glacier"
  | "night";
export interface BrandConcept {
  id: string;
  name: string;
  family: BrandFamily;
  className: string;
  premise: string;
  headline: string;
  heading: string;
  eyebrow: string;
  rankTitle: string;
  chart: "line" | "area" | "bars" | "step";
  colors: readonly [string, string, string, string];
  fonts: string;
  emberName: string;
  traits: readonly string[];
  role: string;
  editorial?: string;
  recommendation?: string;
}

export const BRAND_CONCEPTS: readonly BrandConcept[] = [
  {
    id: "the-pass",
    name: "The Pass",
    family: "territory",
    className: "pass",
    premise: "The chase first · precise / athletic",
    headline: "CLOSE\nTHE GAP.",
    heading: "Close the gap.",
    eyebrow: "YOUR NEXT OVERTAKE",
    rankTitle: "The weekly field",
    chart: "line",
    colors: ["#15251e", "#c4f54f", "#f3f5ec", "#778576"],
    fonts: "Barlow Condensed + DM Sans",
    emberName: "The challenger",
    traits: ["Matte polymer", "Alert", "Forward lean"],
    role: "Anticipation, position changes, personal wins.",
  },
  {
    id: "after-hours",
    name: "After Hours",
    family: "territory",
    className: "after",
    premise: "Your next move first · dark / electric",
    headline: "YOUR DAY\nISN’T DONE.",
    heading: "Your day isn’t done.",
    eyebrow: "CLOCK OUT. MOVE UP.",
    rankTitle: "Your field tonight",
    chart: "area",
    colors: ["#162afa", "#ff7262", "#f4f5ff", "#0d1548"],
    fonts: "Syne + DM Sans",
    emberName: "The spark",
    traits: ["Printed sticker", "Cheeky", "Angular"],
    role: "Session invitations and crew energy.",
  },
  {
    id: "rival-club",
    name: "Rival Club",
    family: "territory",
    className: "rival",
    premise: "The field first · editorial / club identity",
    headline: "Good rivals.\nBetter athletes.",
    heading: "The weekly field",
    eyebrow: "EAST SIDE / CLUB RECORD",
    rankTitle: "The rivalry register",
    chart: "line",
    colors: ["#601b35", "#d7b775", "#fff6d8", "#3856b9"],
    fonts: "Fraunces + DM Sans",
    emberName: "The club companion",
    traits: ["Screenprint", "Sporting pride", "Emblem-ready"],
    role: "Club welcomes, weekly honours, merchandise.",
    editorial: "Four athletes. One week. Someone worth chasing.",
  },
  {
    id: "good-pressure",
    name: "Good Pressure",
    family: "territory",
    className: "pressure",
    premise: "Encouragement first · soft / expressive",
    headline: "A little rivalry.\nA lot more you.",
    heading: "Look at you go.",
    eyebrow: "A LITTLE FRIENDLY RIVALRY",
    rankTitle: "Your friendly competition",
    chart: "bars",
    colors: ["#30134a", "#dfcffa", "#fff8ef", "#fb582c"],
    fonts: "DM Sans + expressive rounded lettering",
    emberName: "The friendly nudge",
    traits: ["Foam clay", "Joyful", "Squash & stretch"],
    role: "Welcome, encouragement, shared celebrations.",
  },
  {
    id: "marginal-gains",
    name: "Marginal Gains",
    family: "territory",
    className: "margin",
    premise: "Comparison first · measured / structured",
    headline: "Small gains.\nReal ground.",
    heading: "Progress, in context.",
    eyebrow: "RUNNING / WEEKLY TOTAL",
    rankTitle: "Field observations",
    chart: "step",
    colors: ["#083c43", "#72e8be", "#e7faef", "#799b9b"],
    fonts: "Space Grotesk + IBM Plex Mono",
    emberName: "The observant guide",
    traits: ["Matte ceramic", "Composed", "Chamfered"],
    role: "Useful milestones and contextual insight.",
  },
  {
    id: "proof-of-work",
    name: "Proof of Work",
    family: "territory",
    className: "proof",
    premise: "The effort record first · tactile / direct",
    headline: "THE\nWORK\nSHOWS.",
    heading: "The work shows.",
    eyebrow: "EFFORT / ON RECORD",
    rankTitle: "Weekly standings",
    chart: "bars",
    colors: ["#272525", "#ecf249", "#f0eeea", "#95928b"],
    fonts: "Archivo Black + IBM Plex Mono",
    emberName: "The earned stamp",
    traits: ["Riso ink", "Honest", "Hand-drawn"],
    role: "Session receipts and weekly records.",
    editorial: "LATEST COUNTED SESSION / SATURDAY / EASY RUN / 5.2 KM",
  },
  {
    id: "the-weekly-sport",
    name: "The Weekly Sport",
    family: "territory",
    className: "weekly",
    premise: "The storyline first · bold / sporting",
    headline: "YOUR WEEK.\nSTILL IN PLAY.",
    heading: "Still in play.",
    eyebrow: "THIS WEEK / THE CHASE",
    rankTitle: "The standings",
    chart: "line",
    colors: ["#19191c", "#ef3138", "#fffdf3", "#c0c6cb"],
    fonts: "Barlow Condensed + IBM Plex Mono",
    emberName: "The comeback fan",
    traits: ["Graphic halftone", "Energetic", "Decisive"],
    role: "Weekly recaps and sporting highlights.",
  },
  {
    id: "higher-ground",
    name: "Higher Ground",
    family: "territory",
    className: "ground",
    premise: "Your trajectory first · airy / composed",
    headline: "There is\nmore in you.",
    heading: "Room to grow.",
    eyebrow: "YOUR WEEK, TAKING SHAPE",
    rankTitle: "People on your horizon",
    chart: "area",
    colors: ["#183a30", "#9cdde7", "#e6f1ee", "#b5bfa3"],
    fonts: "Fraunces + Space Grotesk",
    emberName: "The quiet optimist",
    traits: ["Frosted resin", "Hopeful", "Open silhouette"],
    role: "Reflection, personal progress, return moments.",
  },
  {
    id: "play-forward",
    name: "Play Forward",
    family: "territory",
    className: "play",
    premise: "Progress in play · tactile / dimensional",
    headline: "REAL EFFORT.\nNEXT LEVEL.",
    heading: "Make your next move.",
    eyebrow: "REAL EFFORT / OPEN DIVISION",
    rankTitle: "The weekly field",
    chart: "bars",
    colors: ["#251346", "#f941a1", "#f8f1ff", "#cbf14f"],
    fonts: "Syne + Space Grotesk",
    emberName: "The playful rival",
    traits: ["Designer vinyl", "Playful", "Stepped bevel"],
    role: "Position changes and achievement celebrations.",
  },
  {
    id: "chain-reaction",
    name: "Chain Reaction",
    family: "territory",
    className: "chain",
    premise: "The crew first · warm / connected",
    headline: "Your move\nmoves someone.",
    heading: "Your move matters.",
    eyebrow: "EAST SIDE / YOUR CONTRIBUTION",
    rankTitle: "Your crew, in motion",
    chart: "bars",
    colors: ["#342344", "#f8ce43", "#fffbea", "#f46d50"],
    fonts: "DM Sans + expressive linked lettering",
    emberName: "The momentum maker",
    traits: ["Flocked felt", "Generous", "Welcoming"],
    role: "Crew invitations and shared milestones.",
    editorial: "East Side / Four people moving the week forward.",
  },
  {
    id: "current-ember",
    name: "Current Ember",
    family: "baseline",
    className: "current",
    premise: "The familiar star · warm / lightly dimensional",
    headline: "Small star.\nReal momentum.",
    heading: "A little spark goes far.",
    eyebrow: "YOUR WEEK / YOUR EMBER",
    rankTitle: "Your weekly field",
    chart: "bars",
    colors: ["#2d3430", "#f5c451", "#fafbf8", "#e5e9df"],
    fonts: "DM Sans + the current Ember",
    emberName: "The original spark",
    traits: ["Existing vector rig", "Golden face", "Orange side planes"],
    role: "The current character, placed in a calmer Chain Reaction-inspired world.",
    editorial: "Your people. Your effort. Your original little star.",
  },
  {
    id: "everyday-club",
    name: "Everyday Club",
    family: "neutral",
    className: "everyday",
    premise: "Warm neutral foundation · expressive personal star",
    headline: "Your effort.\nYour character.",
    heading: "Your week, in good company.",
    eyebrow: "YOUR RUNNING WEEK",
    rankTitle: "Your weekly field",
    chart: "bars",
    colors: ["#282f2c", "#f1c75b", "#fafaf7", "#e6e8e1"],
    fonts: "DM Sans · warm humanist",
    emberName: "One star, many expressions",
    traits: ["Quiet surfaces", "Soft depth", "Personal finishes"],
    role: "A warm, familiar companion whose skin belongs to the athlete.",
    recommendation:
      "The warmer, softer comparison: familiar surfaces with a little tactile depth.",
  },
  {
    id: "open-field",
    name: "Open Field",
    family: "neutral",
    className: "open",
    premise: "Warm neutral foundation · clear sporting context",
    headline: "Room for every\nversion of you.",
    heading: "Find your next move.",
    eyebrow: "YOUR RUNNING WEEK",
    rankTitle: "People in your field",
    chart: "area",
    colors: ["#282f2c", "#f1c75b", "#fafaf7", "#e6e8e1"],
    fonts: "DM Sans + Space Grotesk",
    emberName: "Your field companion",
    traits: ["Airy grid", "Fixed lane identity", "Quiet contrast"],
    role: "Colorful skins stay expressive on a calm, legible sporting field.",
    recommendation:
      "Selected direction: Open Field’s sporting structure with Everyday Club’s warm white, charcoal and gold.",
  },
  {
    id: "pocket-arena",
    name: "Pocket Arena",
    family: "neutral",
    className: "pocket",
    premise: "Cloud neutral foundation · small tactile rewards",
    headline: "A little more play.\nA lot more you.",
    heading: "Make the week your own.",
    eyebrow: "YOUR RUNNING WEEK",
    rankTitle: "Your weekly field",
    chart: "bars",
    colors: ["#322c3d", "#dcd5ec", "#f8f7fa", "#e8e4ee"],
    fonts: "DM Sans + restrained dimensional details",
    emberName: "A simpler playful star",
    traits: ["Small bevels", "Clear silhouette", "Gentle tactility"],
    role: "Play Forward’s satisfying depth with a much simpler Ember silhouette.",
    recommendation:
      "Choose this for Play Forward’s physical feel without the loud palette or complex mascot.",
  },
];

export interface EmberSkin {
  id: SkinId;
  name: string;
  description: string;
  owned: boolean;
  palette: { gold: string; light: string; edge: string; ink: string };
  requirement?: string;
}
export const EMBER_SKINS: readonly EmberSkin[] = [
  {
    id: "classic",
    name: "Classic",
    description: "The original golden Ember.",
    owned: true,
    palette: {
      gold: "#ffc629",
      light: "#ffd648",
      edge: "#e98a06",
      ink: "#234039",
    },
  },
  {
    id: "mint",
    name: "Mint",
    description: "A fresh, quiet sporting finish.",
    owned: true,
    palette: {
      gold: "#a8dac5",
      light: "#c6eedb",
      edge: "#659d87",
      ink: "#234039",
    },
  },
  {
    id: "lilac",
    name: "Lilac",
    description: "Soft color with a friendly edge.",
    owned: true,
    palette: {
      gold: "#c8b6e5",
      light: "#e1d4f5",
      edge: "#9a7bb7",
      ink: "#3c2851",
    },
  },
  {
    id: "arcade",
    name: "Arcade",
    description: "A simpler Play Forward: one purple face, one pink edge.",
    owned: true,
    palette: {
      gold: "#a58add",
      light: "#cbb8ee",
      edge: "#db6d9d",
      ink: "#2d1c47",
    },
  },
  {
    id: "glacier",
    name: "Glacier",
    description: "A frosted blue finish worth coming back for.",
    owned: false,
    palette: {
      gold: "#a6dce7",
      light: "#d2f0f5",
      edge: "#6aa7b6",
      ink: "#244844",
    },
    requirement: "Concept unlock: 4 active weeks · 2 of 4",
  },
  {
    id: "night",
    name: "Night",
    description: "Deep blue, with a bright and readable face.",
    owned: false,
    palette: {
      gold: "#4b6085",
      light: "#738db4",
      edge: "#2f3d5c",
      ink: "#fff7df",
    },
    requirement: "Concept unlock: 3 crew weeks · 1 of 3",
  },
];
export const APP_VIEWS: readonly AppView[] = [
  "Home",
  "Compete",
  "Crew",
  "Athlete",
];
export const WEEK_FIXTURES = {
  current: {
    period: "12–19 Oct · UTC",
    you: [3.2, 7.8, 7.8, 13.6, 18.4, 23.6],
    rival: [4.2, 9.5, 13, 15.1, 20, 24.8],
    past: [2.4, 6.1, 8.2, 12.3, 15.7, 20.4],
    days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    rows: [
      { name: "Maya", distance: 28.4 },
      { name: "Alex", distance: 24.8 },
      { name: "You", distance: 23.6 },
      { name: "Jordan", distance: 21 },
    ],
  },
  previous: {
    period: "5–12 Oct · UTC",
    you: [2.4, 6.1, 8.2, 12.3, 15.7, 20.4, 29.4],
    rival: [4.3, 8.2, 11.6, 17.2, 20.4, 25.1, 31.2],
    past: [2.1, 5.8, 8.1, 12, 15.2, 19.8, 26.3],
    days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    rows: [
      { name: "Maya", distance: 31.2 },
      { name: "You", distance: 29.4 },
      { name: "Alex", distance: 27.8 },
      { name: "Jordan", distance: 25.6 },
    ],
  },
} as const;
export const TERRITORY_ART: Record<string, string> = {
  "the-pass": "pass",
  "after-hours": "after",
  "rival-club": "rival",
  "good-pressure": "pressure",
  "marginal-gains": "margin",
  "proof-of-work": "proof",
  "the-weekly-sport": "weekly",
  "higher-ground": "ground",
  "play-forward": "play",
  "chain-reaction": "chain",
};
export const DEFAULT_CONCEPT = "open-field";
export function getConcept(id: string | null | undefined): BrandConcept {
  return (
    BRAND_CONCEPTS.find((c) => c.id === id) ??
    BRAND_CONCEPTS.find((c) => c.id === DEFAULT_CONCEPT)!
  );
}
export function getSkin(id: string | null | undefined): EmberSkin {
  return EMBER_SKINS.find((s) => s.id === id) ?? EMBER_SKINS[0];
}
export function parseSelection(
  concept: string | undefined,
  view: string | undefined,
) {
  return {
    concept: getConcept(concept).id,
    view:
      (["product", "campaign", "locker"] as const).find((v) => v === view) ??
      "product",
  };
}
export function weekSummary(week: WeekId) {
  const f = WEEK_FIXTURES[week],
    index = f.rows.findIndex((r) => r.name === "You"),
    self = f.rows[index],
    rival = f.rows[index - 1];
  return {
    total: self.distance,
    rank: index + 1,
    rival: rival.name,
    gap: Number((rival.distance - self.distance).toFixed(1)),
    crewTotal: Number(
      f.rows.reduce((sum, r) => sum + r.distance, 0).toFixed(1),
    ),
  };
}
export function dailyDistances(values: readonly number[]) {
  return values.map((value, i) =>
    Number((value - (values[i - 1] ?? 0)).toFixed(1)),
  );
}

export interface WardrobeState {
  preview: SkinId;
  equipped: SkinId;
}
/** Previewing a locked concept is allowed; equipping it is not. No production entitlements are implied. */
export function wardrobeReducer(
  state: WardrobeState,
  action:
    | { type: "preview"; skin: SkinId }
    | { type: "equip" }
    | { type: "cancel" },
): WardrobeState {
  if (action.type === "preview") return { ...state, preview: action.skin };
  if (action.type === "cancel") return { ...state, preview: state.equipped };
  return getSkin(state.preview).owned
    ? { preview: state.preview, equipped: state.preview }
    : state;
}
