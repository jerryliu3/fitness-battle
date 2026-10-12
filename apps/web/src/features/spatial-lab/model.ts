/** Synthetic weekly-distance fixtures. Independent of production effort scoring. */
export const spatialIds = [
  "pursuit",
  "path",
  "circuit",
  "switchback",
  "replay",
] as const;
export type SpatialId = (typeof spatialIds)[number];
export type DistanceUnit = "km" | "mi";
export type CameraView = "follow" | "behind" | "above";
export interface Runner {
  id: string;
  name: string;
  initials: string;
  km: [number, number, number];
  you?: boolean;
  ghost?: boolean;
}
export const runners: Runner[] = [
  { id: "mina", name: "Mina Park", initials: "MP", km: [7.4, 16.8, 25.2] },
  { id: "theo", name: "Theo James", initials: "TJ", km: [6.2, 13.6, 22.4] },
  { id: "maya", name: "Maya Chen", initials: "MC", km: [6.4, 12.4, 20.1] },
  { id: "you", name: "You", initials: "JL", km: [5.9, 13.0, 19.2], you: true },
  { id: "leo", name: "Leo Santos", initials: "LS", km: [5.0, 11.0, 16.4] },
  { id: "priya", name: "Priya Shah", initials: "PS", km: [0, 5.6, 14.6] },
  { id: "niko", name: "Niko Reed", initials: "NR", km: [6.2, 6.2, 13.4] },
  { id: "ava", name: "Ava Lewis", initials: "AL", km: [0, 5.8, 12.2] },
  { id: "morgan", name: "Morgan Bell", initials: "MB", km: [4.8, 4.8, 11.0] },
  { id: "sam", name: "Sam Rivera", initials: "SR", km: [4.0, 4.0, 9.8] },
  { id: "ada", name: "Ada Wilson", initials: "AW", km: [0, 0, 8.2] },
  { id: "noah", name: "Noah Ellis", initials: "NE", km: [0, 7.0, 7.0] },
];
export const ghost: Runner = {
  id: "ghost",
  name: "Your previous week",
  initials: "PW",
  km: [5.2, 10.6, 16.0],
  ghost: true,
};
export const days = ["Monday", "Tuesday", "Thursday"] as const;
export const referenceKm = 30;
export const lapKm = 5;
export const milesPerKm = 1 / 1.609344;
export const clamp = (n: number, min: number, max: number) =>
  Math.min(max, Math.max(min, n));
export function distanceAt(runner: Runner, time: number, extraKm = 0): number {
  const t = clamp(time, 0, 2),
    i = Math.min(1, Math.floor(t)),
    fraction = t - i;
  const distance =
    runner.km[i]! +
    (runner.km[i + 1]! - runner.km[i]!) * fraction +
    (runner.you ? clamp(extraKm, 0, 8) : 0);
  return Math.round(distance * 1000) / 1000;
}
export function gapKm(runner: Runner, time: number, extraKm = 0): number {
  return (
    Math.round(
      (distanceAt(runner, time, extraKm) -
        distanceAt(runners[3]!, time, extraKm)) *
        1000,
    ) / 1000
  );
}
export function rankAt(id: string, time: number, extraKm = 0): number {
  const person = runners.find((r) => r.id === id);
  if (!person) return 0;
  const total = distanceAt(person, time, extraKm);
  return (
    1 +
    runners.filter((r) => distanceAt(r, time, extraKm) > total + 1e-6).length
  );
}
export function orderedAt(time: number, extraKm = 0): Runner[] {
  return [...runners].sort(
    (a, b) =>
      distanceAt(b, time, extraKm) - distanceAt(a, time, extraKm) ||
      a.id.localeCompare(b.id),
  );
}
export function distancePosition(
  km: number,
  min: number,
  max: number,
  width: number,
): number {
  return ((km - min) / (max - min)) * width;
}
export function formatDistance(
  km: number,
  unit: DistanceUnit,
  digits = 1,
): string {
  return (km * (unit === "mi" ? milesPerKm : 1)).toFixed(digits);
}
export function formatGap(
  runner: Runner,
  time: number,
  extraKm: number,
  unit: DistanceUnit,
): string {
  const gap = gapKm(runner, time, extraKm);
  if (Math.abs(gap) < 0.001)
    return runner.you ? "Your position" : "Level with you";
  return `${formatDistance(Math.abs(gap), unit, gap < 1 && gap > -1 ? 2 : 1)} ${unit} ${gap > 0 ? "ahead" : "behind"}`;
}
export function cutoffLabel(time: number): string {
  return Number.isInteger(time)
    ? days[time]!
    : `${days[Math.floor(time)]} → ${days[Math.ceil(time)]} · replay interpolation`;
}
export interface SpatialDirection {
  name: string;
  label: string;
  headline: string;
  intro: string;
  mechanism: string;
  advantage: string;
  risk: string;
  test: string;
}
export const spatialDirections: Record<SpatialId, SpatialDirection> = {
  pursuit: {
    name: "Pursuit",
    label: "01 / IN THE RACE",
    headline: "The gap feels real.",
    intro:
      "Look ahead. Maya is 0.9 km beyond your week. Turn around to see who's behind.",
    mechanism:
      "A genuine perspective scene: weekly mileage differences set depth. Switch follow, rear, or aerial camera, select an avatar, and preview extra distance.",
    advantage:
      "Strongest emotional sense of catching someone. Ahead/behind is immediate.",
    risk: "Perspective deliberately compresses distant gaps. A runner's apparent size is not a precise ruler or live location.",
    test: "Can someone identify the closest rival and read the exact gap without assuming everyone is currently exercising?",
  },
  path: {
    name: "Distance path",
    label: "02 / SPACE BETWEEN",
    headline: "A rank is not a gap.",
    intro:
      "Positions use actual weekly distance. Small gaps stay small; big gaps finally look big.",
    mechanism:
      "A calibrated horizontal path. Zoom around yourself, pan the window, select a runner, or switch to a bird's-eye vertical path.",
    advantage:
      "Most accurate and simplest gap reading. Directly challenges equally spaced rank rows.",
    risk: "Close totals crowd markers. Labels need separate lanes and a precise list fallback.",
    test: "Can someone explain why the 3rd-to-4th gap differs from the 4th-to-5th gap?",
  },
  circuit: {
    name: "Circuit",
    label: "03 / LAPS TOGETHER",
    headline: "Your week, on a loop.",
    intro:
      "Every virtual lap represents 5 km of the week. Orbit the miniature track and inspect a runner's full total.",
    mechanism:
      "An orbitable 3D circuit, accumulated distance converted to lap count and within-lap position. Select runners and change the camera.",
    advantage:
      "Most tangible social sporting object. Works well for a compact, playful field.",
    risk: "Lap wrap can hide who's ahead. Full distance and lap count must accompany the avatar.",
    test: "Can people distinguish someone just ahead across the start line from someone a full lap behind?",
  },
  switchback: {
    name: "Switchback",
    label: "04 / THE BIG PICTURE",
    headline: "See the shape of the field.",
    intro:
      "A synthetic 30 km course makes progress explorable. Follow the route or orbit to see the whole field.",
    mechanism:
      "A genuine 3D curved trail. Positions use distance along the curve's arc length, not rank or evenly spaced control points.",
    advantage:
      "Best spatial overview and exploratory craft. Gaps belong to a continuous course.",
    risk: "Bends and height can distort screen-space gaps. This is not a real route, geography, or elevation report.",
    test: "Can someone find themselves, their nearest rival, and explain the difference between route distance and screen distance?",
  },
  replay: {
    name: "Week replay",
    label: "05 / HOW IT HAPPENED",
    headline: "Every move changes the picture.",
    intro:
      "Rewind imported milestones to see when your week crossed another person's. Play only when you choose.",
    mechanism:
      "A bird's-eye lane replay. A timeline moves athletes according to cumulative distance; activity stamps explain your position changes.",
    advantage:
      "Most connected to automatic syncing. It shows why order changed instead of only announcing a rank.",
    risk: "Interpolation may suggest a simultaneous race. Milestone states and interpolated movement must be labeled.",
    test: "Can someone explain Tuesday's pass and Thursday's reversal from the counted activities, without treating the replay as GPS?",
  },
};
