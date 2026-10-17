import { ELO_CAP, ELO_FLOOR, clamp } from "./sports";

export interface RankBand {
  name: string;
  min: number;
  blurb: string;
}

/**
 * Fitness-style ladder from weekly effort Elo (not gaming metals).
 * Score moves mainly with counted distance (or time when there is no GPS).
 * Empty weeks decay slightly; floor is 500. Names describe training level.
 */
export const RANK_BANDS: RankBand[] = [
  {
    name: "Beginner",
    min: ELO_FLOOR,
    blurb: "Just getting started — every counted session moves you up",
  },
  {
    name: "Developing",
    min: 800,
    blurb: "Habit forming — a few solid weeks of showing up",
  },
  {
    name: "Active",
    min: 1000,
    blurb: "Baseline field — regular weekly volume among peers",
  },
  {
    name: "Steady",
    min: 1200,
    blurb: "Reliable weeks — volume holds without long gaps",
  },
  {
    name: "Strong",
    min: 1400,
    blurb: "Above the pack — harder weeks than most on your field",
  },
  {
    name: "Elite",
    min: 1600,
    blurb: "High output — consistently near the top of peer fields",
  },
  {
    name: "Olympian",
    min: 1800,
    blurb: "Rare consistency — big volume sustained week after week",
  },
  {
    name: "Champion",
    min: 2000,
    blurb: "Top band — maxed weekly effort relative to the field",
  },
];

export function rankForElo(elo: number): RankBand {
  const safe = clamp(ELO_FLOOR, ELO_CAP, elo);
  let band = RANK_BANDS[0]!;
  for (const candidate of RANK_BANDS) {
    if (safe >= candidate.min) band = candidate;
  }
  return band;
}

export const rankForEffortScore = rankForElo;

export function eloInBand(elo: number): {
  band: RankBand;
  next: RankBand | null;
  intoNext: number;
} {
  const band = rankForElo(elo);
  const index = RANK_BANDS.findIndex((item) => item.name === band.name);
  const next = RANK_BANDS[index + 1] ?? null;
  const intoNext = next ? Math.max(0, next.min - elo) : 0;
  return { band, next, intoNext };
}

export const effortScoreInBand = eloInBand;
