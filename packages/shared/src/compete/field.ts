import { rankForElo } from "./ranks";
import {
  ELO_BASE,
  hashString,
  unitInterval,
  type SportId,
} from "./sports";

export interface FieldAthlete {
  id: string;
  name: string;
  city: string;
  elo: number;
}

const NAMES = [
  "Maya Chen",
  "Leo Park",
  "Ava Singh",
  "Noah Brooks",
  "Priya Shah",
  "Eli Navarro",
  "Hana Ito",
  "Owen Blake",
  "Sofia Rossi",
  "Jonah Adeyemi",
  "Mina Cho",
  "Chris Dalton",
  "Lila Berg",
  "Sam Okonkwo",
  "Nora Feldman",
  "Theo March",
  "Ivy Santos",
  "Ben Alvarez",
  "Ruth Keller",
  "Omar Farouk",
  "Jane Cho",
  "Felix Berg",
  "Ada Nwosu",
  "Kai Lind",
];

const CITIES = [
  "Toronto",
  "Toronto",
  "Toronto",
  "Vancouver",
  "New York",
  "London",
  "Austin",
  "Chicago",
];

export function fieldAthletes(sport: SportId): FieldAthlete[] {
  return NAMES.map((name, index) => {
    const swing = Math.round((unitInterval(`${sport}:${name}`) - 0.35) * 900);
    return {
      id: `${sport}:${index}`,
      name,
      city: CITIES[index % CITIES.length]!,
      elo: Math.round(Math.min(2200, Math.max(620, ELO_BASE + swing))),
    };
  });
}

export function nearestAthletes(
  sport: SportId,
  elo: number,
  count: number,
  skipIds: string[] = [],
): FieldAthlete[] {
  return fieldAthletes(sport)
    .filter((athlete) => !skipIds.includes(athlete.id))
    .sort(
      (a, b) =>
        Math.abs(a.elo - elo) - Math.abs(b.elo - elo) ||
        a.name.localeCompare(b.name),
    )
    .slice(0, count);
}

export function findAthlete(sport: SportId, name: string): FieldAthlete | null {
  const key = name.trim().toLowerCase();
  return (
    fieldAthletes(sport).find(
      (athlete) => athlete.name.toLowerCase() === key,
    ) ?? null
  );
}

/** Stable weekly volume so the group is alive before the player syncs. */
export function athleteWeekEffort(
  athlete: FieldAthlete,
  periodStart: string,
  track: "verified" | "open",
): number {
  const base = Math.max(2, (athlete.elo - 500) / 38);
  const jitter =
    0.72 + unitInterval(`${athlete.id}:${periodStart}:${track}`) * 0.56;
  const verifiedShare = 0.45 + unitInterval(`${athlete.id}:share`) * 0.5;
  const open = base * jitter;
  return track === "verified" ? open * verifiedShare : open;
}

export function athleteBenchmarkSeconds(
  elo: number,
  meters: number,
): number {
  const secPerKm = Math.min(540, Math.max(150, 340 - (elo - 1000) * 0.11));
  const noise = 0.94 + (hashString(`${elo}:${meters}`) % 80) / 1000;
  return (meters / 1000) * secPerKm * noise;
}

export function sameRank(elo: number, other: number): boolean {
  return rankForElo(elo).name === rankForElo(other).name;
}
