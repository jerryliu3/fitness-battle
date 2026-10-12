import { athletes, previousWeek } from "../design-lab/data";
import { runners, type Runner } from "../spatial-lab/model";

export const brandIds = ["volt", "form", "even", "current"] as const;
export type BrandId = (typeof brandIds)[number];
export const viewIds = ["track", "field", "splits", "athlete"] as const;
export type ViewId = (typeof viewIds)[number];
export type TrackMode = "lanes" | "pursuit";
export type CameraMode = "follow" | "above" | "avatar";
export type SkinId = "amber" | "umber" | "rose";
export type KitId = "electric" | "midnight" | "coral";
export type HairId = "crop" | "bun" | "cap";
export interface AvatarLook {
  skin: SkinId;
  kit: KitId;
  hair: HairId;
}
export const skins: Record<SkinId, string> = {
  amber: "#c28a61",
  umber: "#68432f",
  rose: "#e0ad92",
};
export const kits: Record<KitId, string> = {
  electric: "#d4f343",
  midnight: "#4264ce",
  coral: "#ef6f58",
};
export const initialLook: AvatarLook = {
  skin: "amber",
  kit: "electric",
  hair: "crop",
};

// Nine stable lanes. Lane 5 belongs to you; placement never changes with rank.
export const laneRunners: Runner[] = [
  runners[0]!,
  runners[1]!,
  runners[2]!,
  runners[4]!,
  runners[3]!,
  runners[5]!,
  runners[6]!,
  runners[7]!,
  runners[8]!,
];
export const you = laneRunners[4]!;
export const milestoneLabels = [
  "Starting line",
  "Monday",
  "Tuesday",
  "Thursday",
] as const;

/** Presentation interpolation includes a real zero origin; never fitness scoring. */
export function interpolateFromStart(
  series: readonly number[],
  time: number,
): number {
  const values = [0, ...series],
    t = Math.max(0, Math.min(3, time)),
    i = Math.min(2, Math.floor(t));
  return (
    Math.round((values[i]! + (values[i + 1]! - values[i]!) * (t - i)) * 1000) /
    1000
  );
}
export function distanceFor(runner: Runner, time: number, extraKm = 0): number {
  return (
    Math.round(
      (interpolateFromStart(runner.km, time) +
        (runner.you ? Math.max(0, extraKm) : 0)) *
        1000,
    ) / 1000
  );
}
export function effortFor(time: number): number {
  return interpolateFromStart(athletes.find((a) => a.you)!.checkpoints, time);
}
export function priorEffortFor(time: number): number {
  return interpolateFromStart(previousWeek, time);
}
export function placeFor(id: string, time: number, extraKm = 0): number {
  const runner = laneRunners.find((r) => r.id === id);
  if (!runner) return 0;
  return (
    1 +
    laneRunners.filter(
      (r) =>
        distanceFor(r, time, extraKm) >
        distanceFor(runner, time, extraKm) + 0.000001,
    ).length
  );
}
export function gapFor(runner: Runner, time: number, extraKm = 0): number {
  return (
    Math.round(
      (distanceFor(runner, time, extraKm) - distanceFor(you, time, extraKm)) *
        1000,
    ) / 1000
  );
}
export function gapLabel(runner: Runner, time: number, extraKm = 0): string {
  const gap = gapFor(runner, time, extraKm);
  return runner.you
    ? "Your distance"
    : Math.abs(gap) < 0.001
      ? "Level with you"
      : `${Math.abs(gap).toFixed(Math.abs(gap) < 1 ? 2 : 1)} km ${gap > 0 ? "ahead" : "behind"}`;
}
export function milestoneAt(time: number): string {
  return Number.isInteger(time)
    ? milestoneLabels[time]!
    : "Between imports · interpolated";
}
export function worldZ(km: number): number {
  return km === 0 ? 0 : -km * 9;
}
export function trackWindow(
  distance: number,
  span: number,
  pan: number | null,
  overviewPeak?: number,
): { min: number; max: number } {
  if (overviewPeak !== undefined)
    return { min: 0, max: Math.max(5, Math.ceil(overviewPeak / 5) * 5) };
  const min =
    pan === null ? Math.max(0, distance - span * 0.28) : Math.max(0, pan);
  return { min, max: min + span };
}
export function trackY(
  distance: number,
  min: number,
  max: number,
  height: number,
): number {
  return height - 54 - ((distance - min) / (max - min)) * (height - 132);
}

export interface Brand {
  name: string;
  mood: string;
  heading: string;
  line: string;
  voice: string;
  companion: string;
  shape: string;
  palette: string;
  type: string;
  proof: string;
  risk: string;
  test: string;
  accent: string;
}
export const brands: Record<BrandId, Brand> = {
  volt: {
    name: "VOLT",
    mood: "Intense / competitive",
    heading: "Make your\nnext move.",
    line: "Your work. Your edge.",
    voice: "Short, assertive, forward-facing. “Move made.” “Close the gap.”",
    companion: "Dash — a sharp, aerodynamic hare. Confident, never needy.",
    shape:
      "Clipped corners, lightning cuts, diagonal eyes, slanted numerals, hard button bases.",
    palette: "Electric yellow / race blue / near-black",
    type: "Condensed display, italic numbers, compact uppercase labels",
    proof:
      "The hare's ear angle becomes the button corner, receipt notch, and progress marker.",
    risk: "Intensity can feel punishing. The character must celebrate recorded effort without demanding another workout.",
    test: "Does this feel motivating without making fourth place feel like a failure?",
    accent: "#d8f83b",
  },
  form: {
    name: "FORM",
    mood: "Serious / composed",
    heading: "Built by\nwhat you do.",
    line: "A record of your effort.",
    voice:
      "Direct, factual, understated. “Recorded.” “Compared at the same cutoff.”",
    companion:
      "Pillar — an architectural athlete emblem with a quiet, square silhouette.",
    shape:
      "Squared shoulders, structural rules, chamfered corners, inset labels, engraved numbers.",
    palette: "Signal orange / graphite / white",
    type: "Tightly set heavy sans, monospaced evidence, restrained display scale",
    proof:
      "Pillar's shoulder and foot geometry reappear in tabs, numbered entries, and the athlete plate.",
    risk: "Too much restraint can feel cold or professional-only. Evidence still needs human warmth.",
    test: "Does the serious identity feel accessible to an ordinary tracker user?",
    accent: "#ef6635",
  },
  even: {
    name: "EVEN",
    mood: "Neutral / warm",
    heading: "A good week,\nin the making.",
    line: "Keep your own rhythm.",
    voice: "Calm and plainspoken. “A little ahead.” “That one counted.”",
    companion:
      "Eddy — a grounded pebble runner, quietly pleased rather than exuberant.",
    shape:
      "Soft rectangles, sturdy outline, oval feet, modest smiles, rounded stamps.",
    palette: "Marigold / cocoa ink / pale lemon",
    type: "Rounded, substantial sans with generous sentence-case copy",
    proof:
      "Eddy's soft-square body becomes every surface; its oval feet become stamps and buttons.",
    risk: "Neutral can become bland unless the silhouette, outlines, and warm voice stay consistent.",
    test: "Can people remember the identity without needing a large mascot on every screen?",
    accent: "#f5c84b",
  },
  current: {
    name: "CURRENT",
    mood: "Modern / clear",
    heading: "Find your\nforward.",
    line: "Movement, made clear.",
    voice: "Light, precise, assured. “Your week, in view.” “See what changed.”",
    companion:
      "Flux — a continuous ribbon with a subtle face; more kinetic signature than cartoon sidekick.",
    shape:
      "Open loops, flowing strokes, white space, circular anchors, light inset controls.",
    palette: "Ultramarine / glacier blue / white",
    type: "Open geometric sans, light display weight, sparse uppercase annotations",
    proof:
      "The ribbon's loop becomes the wordmark, active nav ring, sync indicator, and result stamp.",
    risk: "A clean system can look generic if the ribbon signature and voice are reduced to decoration.",
    test: "Can users recognize a receipt or activity entry with the wordmark removed?",
    accent: "#335eee",
  },
};
