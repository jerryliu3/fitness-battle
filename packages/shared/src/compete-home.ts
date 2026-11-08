import { competitionTrack, type CompeteState } from "./compete/sports";
import { rankForElo } from "./compete/ranks";

/** Presentation shared by the native and web event homes. */
export const COMPETE_CATEGORIES = [
  { id: "distance", title: "Distance", events: ["running", "cycling", "walking"] },
  { id: "time", title: "Time", events: ["strength"] },
  { id: "recovery", title: "Recovery", events: ["sleep"] },
] as const;
export type CompeteCategory = typeof COMPETE_CATEGORIES[number]["id"];
export type CompeteEvent = typeof COMPETE_CATEGORIES[number]["events"][number];

export const COMPETE_ICONS = {
  wreath: "M10 21C3 18 2 10 6 4m8 17c7-3 8-11 4-17M5 8C1 8 2 4 3 3c3 0 4 2 2 5Zm-1 5c-4-1-4-4-3-5 3 1 4 2 3 5Zm2 5c-4 0-5-3-5-4 3 0 5 1 5 4Zm13-10c4 0 3-4 2-5-3 0-4 2-2 5Zm1 5c4-1 4-4 3-5-3 1-4 2-3 5Zm-2 5c4 0 5-3 5-4-3 0-5 1-5 4Z",
  sleep: "M3 4v16m0-4h18v4m0-4v-5a2 2 0 0 0-2-2h-8v7M6 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm-3 3h8",
  recovery: "M20 15a8 8 0 0 1-11-11A8 8 0 1 0 20 15Z",
  trophy: "M8 3h8v7a4 4 0 0 1-8 0V3Zm0 2H3v3a5 5 0 0 0 5 5m8-8h5v3a5 5 0 0 1-5 5m-4 1v6m-4 1h8",
  crown: "m3 7 5 4 4-7 4 7 5-4-2 12H5L3 7Z",
  crew: "M7 21v-3a5 5 0 0 1 10 0v3M2 20v-3a4 4 0 0 1 3-4m17 7v-3a4 4 0 0 0-3-4M12 3a3 3 0 1 0 0 6 3 3 0 0 0 0-6M4 6a2 2 0 1 0 0 4 2 2 0 0 0 0-4m16 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4",
  distance: "M3 17c4-14 14 14 18-10M3 17h.01M21 7h.01",
  time: "M9 2h6m-3 6v5l3 2m-3-10a8 8 0 1 0 0 16 8 8 0 0 0 0-16Z",
} as const;

/** Filled silhouettes recreate the reference's quiet, lower-right sport artwork. */
export const COMPETE_ART = {
  running: ["M65 160C125 145 145 70 240 78V160Z", "M95 160C150 135 173 89 240 88", "M153 160C182 131 206 107 240 108"],
  cycling: ["M65 160C125 145 145 70 240 78V160Z", "M95 160C150 135 173 89 240 88", "M153 160C182 131 206 107 240 108"],
  walking: ["M45 160C114 160 144 76 240 112V160Z"],
  strength: ["M88 160v-5q0-5 5-5h12q5 0 5 5v5Zm29 0v-17q0-5 5-5h12q5 0 5 5v17Zm29 0v-29q0-5 5-5h12q5 0 5 5v29Zm29 0v-41q0-5 5-5h12q5 0 5 5v41Zm29 0v-53q0-5 5-5h12q5 0 5 5v53Zm29 0V95q0-5 5-5h12v70Z"],
  sleep: ["M35 160C80 158 90 104 140 120S184 82 240 113V160Z", "M70 160C130 110 165 160 240 147V160Z"],
} as const;

export const COMPETE_ART_COLORS = { running: "#9ab596", cycling: "#9dbed0", walking: "#c7b897", strength: "#b8acc7", sleep: "#afa1c4" } as const;

export function competeExploreCategories(state: CompeteState) {
  return COMPETE_CATEGORIES.map(category => ({ ...category, events: category.events.filter(event => event === "sleep" ? !state.healthRatings.some(r => r.optedIn) : !state.ratings.some(r => r.sport === event && r.optedIn)) })).filter(category => category.events.length);
}

export function competeHomeRank(state: CompeteState) {
  const rating = state.ratings.find(r => r.sport === state.primary);
  const score = competitionTrack(state.primary) === "verified" ? rating?.verifiedElo : rating?.openElo;
  return rankForElo(score ?? 0).name;
}

export function competeHomeResult(state: CompeteState) {
  const results = [...state.periodResults, ...state.healthResults.map(result => ({ ...result, sport: "sleep" as const }))];
  const latest = results.sort((a, b) => Date.parse(b.periodEnd) - Date.parse(a.periodEnd) || Number(b.sport === state.primary) - Number(a.sport === state.primary))[0];
  return latest ? { value: `#${latest.place}`, detail: `${latest.sport[0].toUpperCase()}${latest.sport.slice(1)} · ${latest.fieldSize} athletes` } : { value: "—", detail: "Results arrive after your first week" };
}
