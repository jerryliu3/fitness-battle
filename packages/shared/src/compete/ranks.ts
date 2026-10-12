import { ELO_CAP, ELO_FLOOR, clamp } from "./sports";

export interface RankBand {
  name: string;
  min: number;
  blurb: string;
}

/**
 * Fitness-style ladder (not gaming metals).
 * Champion is the top band; Beginner is the entry band.
 * Names stay neutral — descriptive of training level, not pejorative.
 */
export const RANK_BANDS: RankBand[] = [
  { name: "Beginner", min: ELO_FLOOR, blurb: "Building the habit" },
  { name: "Developing", min: 800, blurb: "Finding your rhythm" },
  { name: "Active", min: 1000, blurb: "Showing up each week" },
  { name: "Steady", min: 1200, blurb: "Reliable weekly volume" },
  { name: "Strong", min: 1400, blurb: "Pushing past easy weeks" },
  { name: "Elite", min: 1600, blurb: "High output among peers" },
  { name: "Olympian", min: 1800, blurb: "Rare consistency and volume" },
  { name: "Champion", min: 2000, blurb: "Top of the field" },
];

export function rankForElo(elo: number): RankBand {
  const safe = clamp(ELO_FLOOR, ELO_CAP, elo);
  let band = RANK_BANDS[0]!;
  for (const candidate of RANK_BANDS) {
    if (safe >= candidate.min) band = candidate;
  }
  return band;
}

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
