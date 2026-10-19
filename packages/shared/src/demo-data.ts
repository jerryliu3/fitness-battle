import type { Battle, Category, StandingRow } from "./types";
import { weeklyPeriodBounds } from "./period";

export interface DemoAccountInfo {
  id: string;
  email: string;
  displayName: string;
  name: string;
  primarySport: "running" | "cycling" | "walking" | "strength";
  city: string;
}

export const DEMO_ACCOUNTS: readonly DemoAccountInfo[] = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    email: "alice@example.com",
    displayName: "Alice Park",
    name: "Alice Park",
    primarySport: "running",
    city: "Brooklyn",
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    email: "bob@example.com",
    displayName: "Bob Chen",
    name: "Bob Chen",
    primarySport: "cycling",
    city: "Queens",
  },
  {
    id: "33333333-3333-4333-8333-333333333333",
    email: "carla@example.com",
    displayName: "Carla Diaz",
    name: "Carla Diaz",
    primarySport: "running",
    city: "Jersey City",
  },
  {
    id: "44444444-4444-4444-8444-444444444444",
    email: "dana@example.com",
    displayName: "Dana Singh",
    name: "Dana Singh",
    primarySport: "running",
    city: "Manhattan",
  },
  {
    id: "00000000-0000-4000-8000-000000000001",
    email: "test@test.com",
    displayName: "Test Athlete",
    name: "Test Athlete",
    primarySport: "running",
    city: "New York",
  },
] as const;

export function findDemoAccount(
  query: string | null | undefined,
): DemoAccountInfo | null {
  if (!query) return null;
  const q = query.trim().toLowerCase();
  for (const acc of DEMO_ACCOUNTS) {
    if (acc.id === q || acc.email === q) return acc;
    const namePrefix = acc.email.split("@")[0];
    if (namePrefix && (q === namePrefix || q.startsWith(namePrefix) || q.includes(namePrefix))) {
      return acc;
    }
  }
  if (q === "demo-94a4b546") {
    return DEMO_ACCOUNTS[0] ?? null;
  }
  return null;
}

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
    unit: "seconds",
    description: "Session duration from strength workouts.",
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
