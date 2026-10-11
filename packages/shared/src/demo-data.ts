import type { Battle, Category, StandingRow } from "./types";
import { weeklyPeriodBounds } from "./period";

export const DEMO_CATEGORIES: Category[] = [
  {
    id: "cat-running",
    slug: "running",
    name: "Running",
    unit: "meters",
    description: "Distance covered on foot runs.",
  },
  {
    id: "cat-cycling",
    slug: "cycling",
    name: "Cycling",
    unit: "meters",
    description: "Ride distance from your tracker.",
  },
  {
    id: "cat-walking",
    slug: "walking",
    name: "Walking",
    unit: "meters",
    description: "Walk and hike distance.",
  },
  {
    id: "cat-strength",
    slug: "strength",
    name: "Strength",
    unit: "reps",
    description: "Reps logged from strength sessions.",
  },
];

export const DEMO_BATTLES: Battle[] = [
  {
    id: "battle-group-run",
    name: "Sunrise Pack",
    mode: "group",
    categoryId: "cat-running",
    categorySlug: "running",
    periodKind: "weekly",
    status: "active",
    inviteCode: "SUNRISE",
    createdBy: "demo-user",
    createdAt: new Date().toISOString(),
  },
  {
    id: "battle-1v1-cycle",
    name: "Ladder Duel",
    mode: "one_v_one",
    categoryId: "cat-cycling",
    categorySlug: "cycling",
    periodKind: "weekly",
    status: "open",
    inviteCode: "DUEL01",
    createdBy: "demo-user",
    createdAt: new Date().toISOString(),
  },
];

export function demoStandings(viewerId = "demo-user"): StandingRow[] {
  const period = weeklyPeriodBounds();
  return [
    {
      periodId: `period-${period.startsAt.toISOString()}`,
      userId: "runner-a",
      displayName: "Maya K.",
      score: 28400,
      rank: 1,
      isViewer: false,
    },
    {
      periodId: `period-${period.startsAt.toISOString()}`,
      userId: viewerId,
      displayName: "You",
      score: 22150,
      rank: 2,
      isViewer: true,
    },
    {
      periodId: `period-${period.startsAt.toISOString()}`,
      userId: "runner-c",
      displayName: "Jordan P.",
      score: 19800,
      rank: 3,
      isViewer: false,
    },
    {
      periodId: `period-${period.startsAt.toISOString()}`,
      userId: "runner-d",
      displayName: "Sam R.",
      score: 15220,
      rank: 4,
      isViewer: false,
    },
  ];
}
