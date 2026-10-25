import type { StudyConcept } from "./kit";
export const crewConcepts = [
  {
    id: "journey",
    name: "Shared Journey",
    thesis:
      "One winding shared-distance route makes the crew’s week a place to explore.",
    tradeoff: "A journey is expressive but needs an exact numerical companion.",
  },
  {
    id: "mosaic",
    name: "Contribution Mosaic",
    thesis:
      "A wall of members, with contribution-sized tiles forming the shared picture.",
    tradeoff:
      "Unequal tile sizes can overemphasize the highest-volume members.",
  },
  {
    id: "relay",
    name: "The Relay",
    thesis:
      "One continuous contribution strip shows how individual effort becomes a shared total.",
    tradeoff: "The strip is aggregate volume, not a literal sequential race.",
  },
  {
    id: "constellation",
    name: "Crew Constellation",
    thesis:
      "Equal-sized people orbit a shared center; each opens their own contribution story.",
    tradeoff: "A small crew feels great; a large roster would need grouping.",
  },
  {
    id: "clubhouse",
    name: "The Clubhouse",
    thesis:
      "Crew identity leads into three clear doors: shared progress, people and meetups.",
    tradeoff: "Overview is calmer, but detailed information is one tap deeper.",
  },
  {
    id: "roster",
    name: "People First",
    thesis:
      "Faces, contribution bars and sorting make the crew a useful member directory.",
    tradeoff: "A leaderboard-like roster can hide the cooperative purpose.",
  },
  {
    id: "calendar",
    name: "Shared Calendar",
    thesis:
      "A week of combined bars reveals when the crew moves, then who contributed each day.",
    tradeoff:
      "Needs clear boundaries between recorded effort and planned sessions.",
  },
  {
    id: "sessions",
    name: "The Start Line",
    thesis:
      "A scheduled-session ticket is the invitation; shared progress gives it context.",
    tradeoff: "A plan should never be counted as completed exercise.",
  },
  {
    id: "chapters",
    name: "Crew Chapters",
    thesis:
      "Weekly shared receipts turn the crew into a collective story with inspectable contributors.",
    tradeoff: "History can overshadow what the crew is doing now.",
  },
] as const satisfies readonly StudyConcept[];
export const memberColors = [
  "#176c75",
  "#f7c948",
  "#8aafa8",
  "#91a6b8",
  "#c9d6e3",
  "#cfae72",
];
export type CrewMember = {
  name: string;
  miles: number;
  sessions: number;
  color: string;
  you: boolean;
};
export const crews = [
  {
    name: "Sunday People",
    description: "Good miles. Better company.",
    goal: 100,
    previous: 64.8,
    members: [
      { name: "Mara Chen", miles: 18.6, sessions: 4 },
      { name: "Alex Lee", miles: 17.8, sessions: 5 },
      { name: "Jules Rivera", miles: 12.4, sessions: 3 },
      { name: "Sam Okafor", miles: 10.2, sessions: 3 },
      { name: "Noor Patel", miles: 8.8, sessions: 2 },
      { name: "Eli Park", miles: 4.8, sessions: 2 },
    ].map((m, i) => ({
      ...m,
      color: memberColors[i],
      you: m.name === "Alex Lee",
    })),
  },
  {
    name: "Night Shift",
    description: "A little later. Still together.",
    goal: 60,
    previous: 40,
    members: [
      { name: "Alex Lee", miles: 18, sessions: 4 },
      { name: "Noor Patel", miles: 12.2, sessions: 3 },
      { name: "Eli Park", miles: 8, sessions: 2 },
      { name: "Sam Okafor", miles: 7, sessions: 2 },
    ].map((m, i) => ({
      ...m,
      color: memberColors[i],
      you: m.name === "Alex Lee",
    })),
  },
] as const;
export const crewTotal = (members: readonly CrewMember[]) =>
  members.reduce((sum, m) => sum + m.miles, 0);
export const dayShares = [0.12, 0.18, 0.1, 0.2, 0.16, 0.24, 0] as const;
export const weekdays = [
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
  "Sun",
] as const;

export const journeyPoints = [
  [22, 218],
  [266, 170],
  [70, 112],
  [266, 60],
  [298, 16],
] as const;
export const journeyLength = journeyPoints
  .slice(1)
  .reduce(
    (sum, point, i) =>
      sum +
      Math.hypot(
        point[0] - journeyPoints[i][0],
        point[1] - journeyPoints[i][1],
      ),
    0,
  );
export function journeyPosition(fraction: number): { x: number; y: number } {
  let remaining = Math.max(0, Math.min(1, fraction)) * journeyLength;
  for (let i = 1; i < journeyPoints.length; i++) {
    const start = journeyPoints[i - 1],
      end = journeyPoints[i];
    const length = Math.hypot(end[0] - start[0], end[1] - start[1]);
    if (remaining <= length || i === journeyPoints.length - 1)
      return {
        x: start[0] + ((end[0] - start[0]) * remaining) / length,
        y: start[1] + ((end[1] - start[1]) * remaining) / length,
      };
    remaining -= length;
  }
  return { x: 22, y: 218 };
}
