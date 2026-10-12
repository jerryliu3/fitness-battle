import { ELO_CAP, ELO_FLOOR, clamp } from "./sports";

export interface RankBand {
  name: string;
  min: number;
  blurb: string;
}

/** Bands are data, so the ladder can move without touching screens. */
export const RANK_BANDS: RankBand[] = [
  { name: "Iron", min: ELO_FLOOR, blurb: "Finding the week" },
  { name: "Bronze", min: 800, blurb: "Showing up" },
  { name: "Silver", min: 1000, blurb: "Steady company" },
  { name: "Gold", min: 1200, blurb: "Pushing the group" },
  { name: "Platinum", min: 1400, blurb: "Hard to drop" },
  { name: "Diamond", min: 1600, blurb: "Serious volume" },
  { name: "Master", min: 1800, blurb: "Rare consistency" },
  { name: "Challenger", min: 2000, blurb: "Top of the ladder" },
];

export function rankForElo(elo: number): RankBand {
  const safe = clamp(ELO_FLOOR, ELO_CAP, elo);
  let band = RANK_BANDS[0]!;
  for (const candidate of RANK_BANDS) {
    if (safe >= candidate.min) band = candidate;
  }
  return band;
}

export function eloInBand(elo: number): { band: RankBand; next: RankBand | null; intoNext: number } {
  const band = rankForElo(elo);
  const index = RANK_BANDS.findIndex((item) => item.name === band.name);
  const next = RANK_BANDS[index + 1] ?? null;
  const intoNext = next ? Math.max(0, next.min - elo) : 0;
  return { band, next, intoNext };
}
