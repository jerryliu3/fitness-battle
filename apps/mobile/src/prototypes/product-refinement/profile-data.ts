import { trainingRows } from "./training-data";
import { weeklyPeriodBounds } from "@fitness-battle/shared";
export type ProfileIdentity = { name: string; city: string; bio: string };
export const startingIdentity: ProfileIdentity = {
  name: "Alex Morgan",
  city: "Brooklyn, NY",
  bio: "A few more miles. A little better company.",
};
export const profileRecords = [
  {
    id: "5k",
    label: "5K best",
    value: "23:42",
    unit: "min",
    values: [26.2, 25.7, 24.8, 24, 23.7],
    date: "Oct 11",
    source: "2026-10-11",
    note: "18 seconds faster than your previous best.",
  },
  {
    id: "10k",
    label: "10K best",
    value: "49:18",
    unit: "min",
    values: [55.1, 53.2, 51.6, 50.1, 49.3],
    date: "Oct 22",
    source: "2026-10-22",
    note: "48 seconds faster than your previous best.",
  },
  {
    id: "longest",
    label: "Longest run",
    value: "6.9 mi",
    unit: "mi",
    values: [4.2, 5.1, 5.7, 6, 62 / 9],
    date: "Oct 22",
    source: "2026-10-22",
    note: "62 minutes of counted running. Your furthest recorded run.",
  },
  {
    id: "streak",
    label: "Week streak",
    value: "4 weeks",
    unit: "weeks",
    values: [0, 1, 2, 3, 4],
    date: "Oct 25",
    source: "2026-10-25",
    note: "Four consecutive weeks with counted activity, through October 25.",
  },
];
export const profileStats = {
  sessions: trainingRows.length,
  runningMiles: trainingRows
    .filter((a) => a.sport === "running")
    .reduce((n, a) => n + a.distanceM / 1609.344, 0),
  activeWeeks: new Set(
    trainingRows.map((a) =>
      weeklyPeriodBounds(new Date(a.startedAt)).startsAt.toISOString(),
    ),
  ).size,
};
