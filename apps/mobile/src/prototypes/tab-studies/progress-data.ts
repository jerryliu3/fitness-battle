import type { StudyConcept } from "./kit";
export const progressConcepts = [
  {
    id: "portfolio",
    name: "Training Portfolio",
    thesis:
      "A single training balance and full-width chart, with metrics as a watchlist below.",
    tradeoff: "Very clear trend; the individual sessions sit one level deeper.",
  },
  {
    id: "calendar",
    name: "Calendar Lens",
    thesis:
      "The month is the navigation. Tap any date to move from rhythm to individual effort.",
    tradeoff: "Excellent recall, less immediate sense of long-term change.",
  },
  {
    id: "signals",
    name: "Signal Library",
    thesis:
      "A vertical library of inspectable metric instruments. Choose the question before the chart.",
    tradeoff: "Multiple mini-charts ask for more scanning.",
  },
  {
    id: "journal",
    name: "Training Journal",
    thesis:
      "A chronological notebook with an honest rest day and drillable session receipts.",
    tradeoff: "Sessions lead; annual trends need a second tap.",
  },
  {
    id: "atlas",
    name: "Year Atlas",
    thesis:
      "Twelve month tiles build a visual training year; each opens its own history.",
    tradeoff: "Small cells reveal rhythm rather than exact amounts.",
  },
  {
    id: "compare",
    name: "Then & Now",
    thesis:
      "Two periods side by side, with clear baselines and a shared comparison chart.",
    tradeoff: "Comparison can be noisy when the current period is incomplete.",
  },
  {
    id: "rhythm",
    name: "Activity Clock",
    thesis:
      "One active-day ring makes consistency tangible, with volume and history underneath.",
    tradeoff: "Active days do not describe training intensity or recovery.",
  },
  {
    id: "records",
    name: "Personal Bests",
    thesis:
      "A record collection tells a story of improvement, then reveals the sessions that earned it.",
    tradeoff: "Rewards peaks more than everyday consistency.",
  },
  {
    id: "chapters",
    name: "Monthly Chapters",
    thesis:
      "History reads like a book: one month, one finding, then its weeks and sessions.",
    tradeoff: "An editorial pace is slower for precise metric lookup.",
  },
] as const satisfies readonly StudyConcept[];
export const ranges = ["Week", "Month", "Year"] as const;
export type Range = (typeof ranges)[number];
export const lenses = ["All sports", "Running", "Cycling", "Strength"] as const;
export type Lens = (typeof lenses)[number];
export const training: Record<
  Range,
  {
    label: string;
    labels: readonly string[];
    hours: readonly number[];
    previous: readonly number[];
  }
> = {
  Week: {
    label: "Oct 19–25, 2026",
    labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    hours: [0.5, 0.85, 0, 1.25, 0.6, 0.9, 0],
    previous: [0.4, 0.6, 0, 0.9, 0.7, 0.9, 0.1],
  },
  Month: {
    label: "October 2026 · Through Oct 25",
    labels: ["1–4", "5–11", "12–18", "19–25"],
    hours: [3.2, 4.4, 3.6, 4.1],
    previous: [2.8, 3.6, 3.4, 3.5],
  },
  Year: {
    label: "2026 · Jan–Oct",
    labels: [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
    ],
    hours: [9.1, 12.4, 15.2, 11.8, 14.3, 16.1, 18.2, 16.9, 17.1, 15.3],
    previous: [8, 9, 11, 10, 12, 14, 15, 14, 16, 13.3],
  },
};
export function trainingValues(range: Range, lens: Lens) {
  const share = { "All sports": 1, Running: 0.5, Cycling: 0.3, Strength: 0.2 }[
    lens
  ];
  return training[range].hours.map((h) => h * share);
}
export const total = (values: readonly number[]) =>
  values.reduce((sum, value) => sum + value, 0);
export const metrics = [
  {
    name: "Training time",
    value: "4.1 h",
    change: "+0.5 h vs prior week",
    unit: "h",
    values: [2.4, 3.1, 2.8, 3.6, 3.5, 4.1],
    labels: ["Sep 14", "Sep 21", "Sep 28", "Oct 5", "Oct 12", "Oct 19"],
    note: "Counted activity duration across sports. Each point is an Eastern Monday–Monday week.",
  },
  {
    name: "Effort rating",
    value: "1,186",
    change: "+66 over six settled weeks",
    unit: "pts",
    values: [1120, 1138, 1142, 1166, 1178, 1186],
    labels: ["Sep 13", "Sep 20", "Sep 27", "Oct 4", "Oct 11", "Oct 18"],
    note: "Illustrative Running / Open rating after settlement, separate from training hours and weekly volume.",
  },
  {
    name: "Sleep duration",
    value: "7h 42m",
    change: "7h 24m seven-night average",
    unit: "h",
    values: [7.1, 7.8, 6.9, 7.4, 7.2, 7.7, 7.7],
    labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    note: "Fictional nightly durations. Missing source data stays unavailable. This does not infer readiness or a diagnosis.",
  },
  {
    name: "Resting heart rate",
    value: "52 bpm",
    change: "53 bpm seven-day average",
    unit: "bpm",
    values: [54, 53, 55, 52, 54, 51, 52],
    labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    note: "Fictional daily resting readings, distinct from workout heart rate. Personal values are not medical thresholds.",
  },
] as const;
export const records = [
  {
    title: "Fastest 5K",
    value: "24:18",
    date: "Oct 17, 2026",
    previous: "24:52",
    activity: "Riverside tempo",
    detail: "5 km sample running activity · 4:52 /km",
  },
  {
    title: "Longest run",
    value: "10.2 mi",
    date: "Oct 11, 2026",
    previous: "9.4 mi",
    activity: "Sunday long run",
    detail: "10.2 mi sample running activity · 1h 38m",
  },
  {
    title: "Longest ride",
    value: "42.6 mi",
    date: "Sep 20, 2026",
    previous: "38.1 mi",
    activity: "Coastal loop",
    detail: "42.6 mi sample cycling activity · 2h 51m",
  },
] as const;

// One calendar dataset, consistent with the four displayed October buckets.
export const calendarHours = Array.from({ length: 31 }, (_, i) => {
  const day = i + 1;
  if (day > 25) return null;
  if (day >= 19) return training.Week.hours[day - 19];
  const bucket =
    day <= 4 ? [1, 4, 3.2] : day <= 11 ? [5, 11, 4.4] : [12, 18, 3.6];
  const active = Array.from(
    { length: bucket[1] - bucket[0] + 1 },
    (_, j) => bucket[0] + j,
  ).filter((d) => d % 5 !== 0);
  return active.includes(day) ? bucket[2] / active.length : 0;
});
