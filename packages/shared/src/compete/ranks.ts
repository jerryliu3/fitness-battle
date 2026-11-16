import type { RankSymbolId } from "../rank-symbols";

export interface RankBand {
  id: RankSymbolId;
  name: string;
  min: number;
  blurb: string;
}

/**
 * Fitness-style ladder from weekly effort Elo (not gaming metals).
 * Score moves mainly with counted distance (or time when there is no GPS).
 * Official rank changes happen at weekly recap, with two-week demotion protection.
 */
export const RANK_BANDS: RankBand[] = [
  {
    id: "beginner",
    name: "Beginner",
    min: 0,
    blurb: "Just getting started — every counted session moves you up",
  },
  {
    id: "rookie",
    name: "Rookie",
    min: 1250,
    blurb: "Habit forming — a few solid weeks of showing up",
  },
  {
    id: "active",
    name: "Active",
    min: 2500,
    blurb: "Baseline field — regular weekly volume among peers",
  },
  {
    id: "challenger",
    name: "Challenger",
    min: 3750,
    blurb: "Reliable weeks — volume holds without long gaps",
  },
  {
    id: "athlete",
    name: "Athlete",
    min: 5000,
    blurb: "Above the pack — harder weeks than most on your field",
  },
  {
    id: "elite",
    name: "Elite",
    min: 6250,
    blurb: "High output — consistently near the top of peer fields",
  },
  {
    id: "master",
    name: "Master",
    min: 7500,
    blurb: "Commanding mastery — big sustained volume week after week",
  },
  {
    id: "olympian",
    name: "Olympian",
    min: 8750,
    blurb: "Rare consistency — big volume sustained week after week",
  },
  {
    id: "champion",
    name: "Champion",
    min: 10000,
    blurb: "Top band — maxed weekly effort relative to the field",
  },
];

export function rankForElo(elo: number): RankBand {
  if (elo < 0) {
    return {
      id: "beginner",
      name: "Unranked",
      min: 0,
      blurb: "No account baseline yet — create an account to start at 1000",
    };
  }
  const safe = Math.max(0, elo);
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

/** Distinct typographic badges keep levels legible alongside athlete names. */
export function effortRankBadge(elo: number) {
  const rank = rankForElo(elo);
  const symbols = ["○", "◔", "◑", "●", "◆", "✦", "★", "✹", "♛"];
  return { ...rank, symbol: symbols[RANK_BANDS.findIndex(band => band.name === rank.name)] ?? "–" };
}

export function rankSymbolForScore(score: number | null | undefined): RankSymbolId {
  if (score == null || !Number.isFinite(score) || score <= 0) return "beginner";
  return rankForElo(score).id;
}

export function rankSymbolForRankName(name: string | null | undefined): RankSymbolId {
  if (!name) return "beginner";
  const normalized = name.toLowerCase().trim();
  switch (normalized) {
    case "beginner": return "beginner";
    case "rookie":
    case "developing": return "rookie";
    case "active": return "active";
    case "challenger":
    case "steady": return "challenger";
    case "athlete":
    case "strong": return "athlete";
    case "elite": return "elite";
    case "master": return "master";
    case "olympian": return "olympian";
    case "champion": return "champion";
    default: return "beginner";
  }
}

export function effectiveRankSymbol(state?: { rankSymbol?: RankSymbolId | null; ratings?: Array<{ sport: string; openElo?: number; verifiedElo?: number }>; effortAccounts?: import("./effort-account").EffortAccounts; primary?: string } | null): RankSymbolId {
  if (!state) return "beginner";
  if (state.rankSymbol) return state.rankSymbol;
  const official = state.effortAccounts?.[state.primary as import("./sports").SportId];
  if(official) return RANK_BANDS[official.state.officialRankIndex]!.id;
  const rating = state.ratings?.find(r => r.sport === state.primary);
  const score = rating?.verifiedElo ?? rating?.openElo;
  return rankSymbolForScore(score);
}
