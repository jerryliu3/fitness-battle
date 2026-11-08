import type { CompeteState } from "./compete/sports";

/** Presentation shared by the native and web event homes. */
export const COMPETE_CATEGORIES = [
  { id: "distance", title: "Distance", detail: "Go the distance", events: ["running", "cycling", "walking"] },
  { id: "time", title: "Time", detail: "Time in training", events: ["strength"] },
  { id: "recovery", title: "Recovery", detail: "Rest and recharge", events: ["sleep"] },
] as const;
export type CompeteCategory = typeof COMPETE_CATEGORIES[number]["id"];
export type CompeteEvent = typeof COMPETE_CATEGORIES[number]["events"][number];

export const COMPETE_ICONS = {
  wreath: "M10 21C3 18 2 10 6 4m8 17c7-3 8-11 4-17M5 8C1 8 2 4 3 3c3 0 4 2 2 5Zm-1 5c-4-1-4-4-3-5 3 1 4 2 3 5Zm2 5c-4 0-5-3-5-4 3 0 5 1 5 4Zm13-10c4 0 3-4 2-5-3 0-4 2-2 5Zm1 5c4-1 4-4 3-5-3 1-4 2-3 5Zm-2 5c4 0 5-3 5-4-3 0-5 1-5 4Z",
  sleep: "M20 15a8 8 0 0 1-11-11A8 8 0 1 0 20 15Z",
  trophy: "M8 3h8v7a4 4 0 0 1-8 0V3Zm0 2H3v3a5 5 0 0 0 5 5m8-8h5v3a5 5 0 0 1-5 5m-4 1v6m-4 1h8",
  crown: "m3 7 5 4 4-7 4 7 5-4-2 12H5L3 7Z",
  crew: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m20 0v-2a4 4 0 0 0-3-3.87M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8m7 .13a4 4 0 0 1 0 7.75",
  distance: "M3 17c4-14 14 14 18-10M3 17h.01M21 7h.01",
  time: "M9 2h6m-3 6v5l3 2m-3-10a8 8 0 1 0 0 16 8 8 0 0 0 0-16Z",
} as const;

/** Decorative terrain, motion and rest lines, kept separate from sport icons. */
export const COMPETE_ART = {
  running: ["M25 130C55 70 88 120 110 65S175 45 205 5", "M50 140C82 80 110 125 135 70S190 55 225 15", "M78 150C105 92 135 138 160 82S215 67 245 27"],
  cycling: ["M45 150a100 100 0 0 1 200 0", "M70 150a75 75 0 0 1 150 0", "M95 150a50 50 0 0 1 100 0"],
  walking: ["M20 145 100 60 165 125 220 55", "M50 150 112 88 165 140 235 78", "M100 150 125 125 155 155"],
  strength: ["M55 105h145", "M80 80h120", "M105 55h95"],
  sleep: ["M15 105C75 40 120 160 230 65", "M20 125C90 55 125 180 240 85", "M35 145C90 85 150 190 250 110"],
} as const;

export function competeHomeResult(state: CompeteState) {
  const results = [...state.periodResults, ...state.healthResults.map(result => ({ ...result, sport: "sleep" as const }))];
  const latest = results.sort((a, b) => Date.parse(b.periodEnd) - Date.parse(a.periodEnd) || Number(b.sport === state.primary) - Number(a.sport === state.primary))[0];
  return latest ? { value: `Place ${latest.place}`, detail: `${latest.sport[0].toUpperCase()}${latest.sport.slice(1)} · ${latest.fieldSize} athletes` } : { value: "Your next finish", detail: "Results arrive after your first week" };
}
