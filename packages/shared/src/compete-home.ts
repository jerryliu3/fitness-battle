import { APP_ICON_PATHS } from "./product-icons";
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
  special: APP_ICON_PATHS.special,
  wreath: "M10 21C3 18 2 10 6 4m8 17c7-3 8-11 4-17M5 8C1 8 2 4 3 3c3 0 4 2 2 5Zm-1 5c-4-1-4-4-3-5 3 1 4 2 3 5Zm2 5c-4 0-5-3-5-4 3 0 5 1 5 4Zm13-10c4 0 3-4 2-5-3 0-4 2-2 5Zm1 5c4-1 4-4 3-5-3 1-4 2-3 5Zm-2 5c4 0 5-3 5-4-3 0-5 1-5 4Z",
  sleep: APP_ICON_PATHS.sleep,
  recovery: APP_ICON_PATHS.recovery,
  trophy: APP_ICON_PATHS.trophy,
  crown: APP_ICON_PATHS.crown,
  crew: APP_ICON_PATHS.crew,
  distance: APP_ICON_PATHS.distance,
  time: APP_ICON_PATHS.time,
} as const;

/** Filled silhouettes recreate the reference's quiet, lower-right sport artwork. */
export const COMPETE_ART = {
  running: ["M65 160C125 145 145 70 240 78V160Z", "M95 160C150 135 173 89 240 88", "M153 160C182 131 206 107 240 108"],
  cycling: ["M65 160C125 145 145 70 240 78V160Z", "M95 160C150 135 173 89 240 88", "M153 160C182 131 206 107 240 108"],
  walking: ["M45 160C114 160 144 76 240 112V160Z"],
  strength: ["M88 160v-5q0-5 5-5h12q5 0 5 5v5Zm29 0v-17q0-5 5-5h12q5 0 5 5v17Zm29 0v-29q0-5 5-5h12q5 0 5 5v29Zm29 0v-41q0-5 5-5h12q5 0 5 5v41Zm29 0v-53q0-5 5-5h12q5 0 5 5v53Zm29 0V95q0-5 5-5h12v70Z"],
  sleep: ["M35 160C80 158 90 104 140 120S184 82 240 113V160Z", "M70 160C130 110 165 160 240 147V160Z"],
} as const;

export const COMPETE_ART_COLORS = { running: "#9ab596", cycling: "#9ab596", walking: "#9ab596", strength: "#9dbed0", sleep: "#afa1c4" } as const;

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
