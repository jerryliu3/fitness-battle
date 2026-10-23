/** Plain presentation fixtures for the IA study. Never written to account state. */
export const LAYOUT_CONCEPTS = [
  {
    id: "trail",
    name: "Trail",
    eyebrow: "01 / THE GUIDED JOURNEY",
    description:
      "A playful path, generous cards, and a clear next step. Details unfold in sheets.",
    color: "#54244f",
    accent: "#dbf16c",
    paper: "#f5f3f7",
    ink: "#25152c",
    muted: "#78697e",
    card: "#ffffff",
    layout: "Journey first · floating dock · bottom sheets",
  },
  {
    id: "index",
    name: "Index",
    eyebrow: "02 / THE ATHLETE’S JOURNAL",
    description:
      "An editorial training log. Compact rows, precise numbers, and a persistent section index.",
    color: "#24352b",
    accent: "#d4f580",
    paper: "#f5f7f4",
    ink: "#1c2a23",
    muted: "#6c7c72",
    card: "#ffffff",
    layout: "Split journal · indexed lists · detail panels",
  },
  {
    id: "orbit",
    name: "Orbit",
    eyebrow: "03 / YOUR TRAINING SYSTEM",
    description:
      "A dark performance cockpit. Modular tiles put progress, comparisons, and signals together.",
    color: "#d6f775",
    accent: "#d6f775",
    paper: "#151b21",
    ink: "#f2f5f6",
    muted: "#9aabb6",
    card: "#222b33",
    layout: "Bento dashboard · visual metrics · command panels",
  },
  {
    id: "club",
    name: "Clubhouse",
    eyebrow: "04 / A CLUB YOU BELONG TO",
    description:
      "A lively club magazine. Oversized stories, overlapping portraits, and activity-led navigation.",
    color: "#503565",
    accent: "#dcfa79",
    paper: "#f0edf7",
    ink: "#322440",
    muted: "#7c6d8a",
    card: "#ffffff",
    layout: "Editorial feature · social rail · contextual menus",
  },
  {
    id: "focus",
    name: "Focus",
    eyebrow: "05 / ROOM TO MOVE",
    description:
      "A calm, task-led companion. One strong action with everything else neatly within reach.",
    color: "#26382d",
    accent: "#d4ee89",
    paper: "#fafbf8",
    ink: "#24352a",
    muted: "#768172",
    card: "#ffffff",
    layout: "Single task · stacked disclosures · full-height sheets",
  },
] as const;
export type LayoutConceptId = (typeof LAYOUT_CONCEPTS)[number]["id"];
export const PROTOTYPE_TABS = ["Home", "Arena", "Crew", "Athlete"] as const;
export type PrototypeTab = (typeof PROTOTYPE_TABS)[number];
export const PROTOTYPE_DAYS = [
  {
    day: "Today",
    date: "16 OCT",
    value: "Your next move",
    detail: "An easy 5 km · about 30 minutes",
    kind: "today",
  },
  {
    day: "Thu",
    date: "15 OCT",
    value: "6.2 km",
    detail: "Morning run · 36 min · GPS Tracked",
    kind: "past",
  },
  {
    day: "Wed",
    date: "14 OCT",
    value: "45 min",
    detail: "Strength · 1 session · Open",
    kind: "past",
  },
  {
    day: "Tue",
    date: "13 OCT",
    value: "8.4 km",
    detail: "Riverside run · 48 min · GPS Tracked",
    kind: "past",
  },
  {
    day: "Mon",
    date: "12 OCT",
    value: "4.0 km",
    detail: "Lunch walk · 42 min · GPS Tracked",
    kind: "past",
  },
  {
    day: "Sun",
    date: "11 OCT",
    value: "12.0 km",
    detail: "Long easy run · 72 min · GPS Tracked",
    kind: "past",
  },
  {
    day: "Sat",
    date: "10 OCT",
    value: "30 min",
    detail: "Mobility · 1 session · Open",
    kind: "past",
  },
  {
    day: "Fri",
    date: "09 OCT",
    value: "5.1 km",
    detail: "Easy run · 31 min · GPS Tracked",
    kind: "past",
  },
  {
    day: "Thu",
    date: "08 OCT",
    value: "40 min",
    detail: "Indoor bike · 1 session · Open",
    kind: "past",
  },
  {
    day: "Wed",
    date: "07 OCT",
    value: "7.0 km",
    detail: "Park loop · 42 min · GPS Tracked",
    kind: "past",
  },
  {
    day: "Tue",
    date: "06 OCT",
    value: "3.2 km",
    detail: "Evening walk · 32 min · GPS Tracked",
    kind: "past",
  },
] as const;
export const PROTOTYPE_PEOPLE = [
  { name: "Maya Chen", initials: "MC", km: 28.6, color: "#9b87b9", elo: 1284 },
  { name: "Jordan Lee", initials: "JL", km: 25.1, color: "#769b89", elo: 1261 },
  { name: "You", initials: "AL", km: 23.4, color: "#bddc59", elo: 1248 },
  { name: "Sam Rivera", initials: "SR", km: 21.8, color: "#c5a57b", elo: 1225 },
] as const;
export const PROTOTYPE_SPORTS = [
  {
    id: "running",
    name: "Running",
    family: "GPS",
    unit: "km",
    available: true,
  },
  {
    id: "cycling",
    name: "Cycling",
    family: "GPS",
    unit: "km",
    available: true,
  },
  {
    id: "walking",
    name: "Walking",
    family: "GPS",
    unit: "km",
    available: true,
  },
  {
    id: "trail",
    name: "Trail running",
    family: "GPS",
    unit: "km",
    available: false,
  },
  {
    id: "strength",
    name: "Strength",
    family: "Non-GPS",
    unit: "sessions",
    available: true,
  },
  {
    id: "swimming",
    name: "Swimming",
    family: "Non-GPS",
    unit: "sessions",
    available: false,
  },
  {
    id: "indoor",
    name: "Indoor exercise",
    family: "Non-GPS",
    unit: "minutes",
    available: false,
  },
  {
    id: "hr",
    name: "Heart rate",
    family: "Health",
    unit: "score",
    available: false,
  },
  {
    id: "sleep",
    name: "Sleep",
    family: "Health",
    unit: "score",
    available: true,
  },
] as const;

export function prototypeContest(sport: string) {
  const values: Record<
    string,
    {
      label: string;
      unit: string;
      total: number;
      previous: number;
      values: number[];
      score: string;
    }
  > = {
    running: {
      label: "Running",
      unit: "km",
      total: 23.4,
      previous: 19.6,
      values: [28.6, 25.1, 23.4, 21.8],
      score: "GPS Tracked",
    },
    cycling: {
      label: "Cycling",
      unit: "km",
      total: 84.2,
      previous: 76.5,
      values: [102.6, 91.3, 84.2, 78.1],
      score: "GPS Tracked",
    },
    walking: {
      label: "Walking",
      unit: "km",
      total: 18.6,
      previous: 15.2,
      values: [24.4, 21.2, 18.6, 17.4],
      score: "GPS Tracked",
    },
    strength: {
      label: "Strength",
      unit: "sessions",
      total: 3,
      previous: 2,
      values: [5, 4, 3, 2],
      score: "Open",
    },
    sleep: {
      label: "Sleep",
      unit: "score",
      total: 82,
      previous: 78,
      values: [89, 85, 82, 79],
      score: "Sleep score",
    },
  };
  return values[sport] ?? values.running!;
}
