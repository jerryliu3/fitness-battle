/** Visual identities only. Score bands/eligibility remain in compete/ranks.ts. */
export const RANK_SYMBOLS = [
  { id: "beginner", name: "Beginner" },
  { id: "rookie", name: "Rookie" },
  { id: "active", name: "Active" },
  { id: "challenger", name: "Challenger" },
  { id: "athlete", name: "Athlete" },
  { id: "elite", name: "Elite" },
  { id: "master", name: "Master" },
  { id: "olympian", name: "Olympian" },
  { id: "champion", name: "Champion" },
] as const;

export type RankSymbolId = (typeof RANK_SYMBOLS)[number]["id"];
export type RankSymbolVariant = "badge" | "frame";

/** Both variants share this exact portrait aperture, in SVG viewBox units. */
export const RANK_SYMBOL_GEOMETRY = {
  size: 160,
  portrait: { x: 38, y: 40, size: 84 },
} as const;

