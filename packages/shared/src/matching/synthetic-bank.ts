import { dayKey, hashString, unitInterval } from "../compete/sports";
import type { SportId } from "../compete/sports";
import type { SyntheticRival } from "./types";
import { startOfZonedDay, endOfZonedDay } from "../period";

/** What an Elo band should look like for a full 7-day week. */
export interface EloMileageBand {
  id: string;
  minElo: number;
  maxElo: number;
  /** Expected weekly kilometers on GPS sports. */
  weeklyKm: { min: number; max: number };
  /** Expected weekly session minutes on non-GPS sports. */
  weeklyMin: { min: number; max: number };
}

/**
 * Bank of Elo → volume expectations. Used when synthesizing daily performances
 * so higher-rated rivals tend to put up more distance/time.
 */
export const ELO_MILEAGE_BANDS: EloMileageBand[] = [
  {
    id: "developing",
    minElo: 500,
    maxElo: 849,
    weeklyKm: { min: 8, max: 18 },
    weeklyMin: { min: 90, max: 180 },
  },
  {
    id: "steady",
    minElo: 850,
    maxElo: 1099,
    weeklyKm: { min: 18, max: 32 },
    weeklyMin: { min: 150, max: 260 },
  },
  {
    id: "strong",
    minElo: 1100,
    maxElo: 1349,
    weeklyKm: { min: 30, max: 48 },
    weeklyMin: { min: 220, max: 360 },
  },
  {
    id: "elite",
    minElo: 1350,
    maxElo: 2400,
    weeklyKm: { min: 45, max: 75 },
    weeklyMin: { min: 300, max: 480 },
  },
];

const SYNTHETIC_NAMES = [
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
  "Riley Quinn",
  "Jordan Vale",
  "Casey Monroe",
  "Drew Patel",
  "Skye Romero",
  "Quinn Harper",
  "Reese Okada",
  "Alex Rivera",
] as const;

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "??";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[parts.length - 1]![0] ?? ""}`.toUpperCase();
}

export function bandForElo(elo: number): EloMileageBand {
  const found = ELO_MILEAGE_BANDS.find(
    (band) => elo >= band.minElo && elo <= band.maxElo,
  );
  return found ?? ELO_MILEAGE_BANDS[1]!;
}

/** Deterministic full bank of synthetic rivals spanning Elo bands. */
export function syntheticBank(sport: SportId): SyntheticRival[] {
  return SYNTHETIC_NAMES.map((name, index) => {
    const band = ELO_MILEAGE_BANDS[index % ELO_MILEAGE_BANDS.length]!;
    const t = unitInterval(`synth-elo:${sport}:${name}`);
    const elo = Math.round(
      band.minElo + t * (band.maxElo - band.minElo),
    );
    return {
      id: `synth:${sport}:${index}`,
      name,
      initials: initialsFromName(name),
      elo,
      kind: "synthetic" as const,
    };
  });
}

export function findSynthetic(
  sport: SportId,
  id: string,
): SyntheticRival | null {
  const bank = syntheticBank(sport);
  const found = bank.find((rival) => rival.id === id);
  if (found) return found;
  if (id.startsWith("synth")) {
    const idx = Math.abs(hashString(`${sport}:${id}`)) % bank.length;
    const rival = bank[idx]!;
    return {
      ...rival,
      id,
    };
  }
  return null;
}

/**
 * Pull `count` synthetics near `targetElo`, excluding ids already seated.
 * Stable for a given seed so boards do not reshuffle on reload.
 */
export function pickSynthetics(
  sport: SportId,
  targetElo: number,
  count: number,
  excludeIds: readonly string[] = [],
  seed = "default",
): SyntheticRival[] {
  if (count <= 0) return [];
  const skip = new Set(excludeIds);
  const pool = syntheticBank(sport)
    .filter((rival) => !skip.has(rival.id))
    .map((rival, order) => ({
      rival,
      order,
      distance: Math.abs(rival.elo - targetElo),
      jitter: unitInterval(`pick:${seed}:${rival.id}`),
    }))
    .sort(
      (a, b) =>
        a.distance - b.distance ||
        a.jitter - b.jitter ||
        a.order - b.order,
    );

  const picked: SyntheticRival[] = [];
  for (const row of pool) {
    if (picked.length >= count) break;
    picked.push(row.rival);
  }
  // Soft shuffle inside the Elo-near set so ties feel organic but stay seeded.
  return picked
    .map((rival, index) => ({
      rival,
      rank: unitInterval(`seat:${seed}:${rival.id}`) + index * 0.0001,
    }))
    .sort((a, b) => a.rank - b.rank)
    .map((row) => row.rival);
}

export interface SyntheticVolume {
  effort: number;
  distanceM: number;
  movingSec: number;
}

/**
 * Randomized-but-stable performance for a synthetic rival inside the
 * viewer's wave window only (prior days outside the window are excluded).
 */
export function syntheticVolumeInWindow(
  rival: SyntheticRival,
  sport: SportId,
  waveStart: Date,
  weekEnd: Date,
  track: "verified" | "open",
  asOf: Date = new Date(),
  gps = true,
): SyntheticVolume {
  const band = bandForElo(rival.elo);
  const through = new Date(
    Math.min(asOf.getTime(), weekEnd.getTime()),
  );
  if (through <= waveStart) {
    return { effort: 0, distanceM: 0, movingSec: 0 };
  }

  const fullWeekKm =
    band.weeklyKm.min +
    unitInterval(`${rival.id}:wk-km`) *
      (band.weeklyKm.max - band.weeklyKm.min);
  const fullWeekMin =
    band.weeklyMin.min +
    unitInterval(`${rival.id}:wk-min`) *
      (band.weeklyMin.max - band.weeklyMin.min);

  let distanceM = 0;
  let movingSec = 0;
  let cursor = new Date(waveStart.getTime());

  while (cursor.getTime() < through.getTime()) {
    const dayStart = startOfZonedDay(cursor);
    const dayEnd = endOfZonedDay(cursor);
    // Only elapsed time inside this shared window contributes. A reveal one
    // millisecond after 06:00 must not award a generated rival a whole day.
    const elapsedShare = (Math.min(through.getTime(), dayEnd.getTime()) - cursor.getTime()) / (dayEnd.getTime() - dayStart.getTime());
    const day = dayKey(cursor);
    // ~5 active days / week on average, scaled by Elo band.
    const activeChance = 0.55 + (rival.elo - 1000) * 0.00025;
    const rolls = unitInterval(`${rival.id}:day:${day}:${track}`);
    if (rolls < Math.min(0.92, Math.max(0.35, activeChance))) {
      const dayShare =
        (0.7 + unitInterval(`${rival.id}:share:${day}`) * 0.6) / 7;
      if (gps) {
        const km = fullWeekKm * dayShare * elapsedShare;
        const minPerKm =
          5.1 + unitInterval(`${rival.id}:pace:${day}`) * 1.5;
        distanceM += km * 1000;
        movingSec += km * minPerKm * 60;
      } else {
        const minutes = fullWeekMin * dayShare * elapsedShare;
        movingSec += minutes * 60;
      }
    }
    cursor = dayEnd;
  }

  const verifiedShare =
    0.5 + unitInterval(`${rival.id}:verified-share`) * 0.45;
  if (track === "verified" && gps) {
    distanceM *= verifiedShare;
    movingSec *= verifiedShare;
  } else if (track === "verified" && !gps) {
    // Strength has no verified track volume in product; keep open-shaped zeros.
    return { effort: 0, distanceM: 0, movingSec: 0 };
  }

  const effort = gps
    ? distanceM / 1000
    : (movingSec / 3600) * 8;

  // Tiny hash salt so identical volumes still sort stably elsewhere.
  void hashString(rival.id);

  return {
    effort: Math.round(effort * 100) / 100,
    distanceM: Math.round(distanceM),
    movingSec: Math.round(movingSec),
  };
}
