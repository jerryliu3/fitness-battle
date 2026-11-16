import { readAccountEffort, SPORT_IDS, type CompeteState } from "@fitness-battle/shared";
import { loadEffortScoreEvents } from "@/lib/compete-persist";

export async function committedScoreHistory(
  db: Parameters<typeof loadEffortScoreEvents>[0],
  userId: string,
  state: CompeteState,
): Promise<CompeteState> {
  try {
    return { ...state, effortScoreEvents: await loadEffortScoreEvents(db, userId) };
  } catch (error) {
    console.error(
      "Committed score history reload failed:",
      error instanceof Error ? error.message : "unknown",
    );
    return state;
  }
}

export function competeAccountJsonState(live: CompeteState): CompeteState {
  return {
    ...live,
    requiresCanonicalFields: true,
    liveEffortScores: Object.fromEntries(SPORT_IDS.map(sport=>[sport,readAccountEffort(live,sport,new Date())])),
    enrollments: live.enrollments.map((e) => ({
      ...e,
      awaitingField: e.awaitingField ?? !e.fieldBoard,
    })),
  };
}