import {
  activityEffort, competeNow, countsOnTrack, freshState, reduceCompete,
  sportById, type Activity, type CompeteState, type ScoreTrack,
} from "@fitness-battle/shared";
import { buildSplitBoard } from "@/features/split/model";

export const HOME_LAYOUTS = [
  { id: "trail", name: "Checkpoints" },
  { id: "circuit", name: "Circuit" },
  { id: "calendar", name: "Calendar" },
  { id: "islands", name: "Islands" },
  { id: "today", name: "Card deck" },
] as const;
export type HomeLayout = typeof HOME_LAYOUTS[number]["id"];

export function parseHomeLayout(value: string | null): HomeLayout {
  return HOME_LAYOUTS.find(layout => layout.id === value)?.id ?? "trail";
}
export type VisitScenario = "quiet" | "arrival" | "unsynced";
export interface ProgressSnapshot {
  version: 1;
  scope: string;
  effort: number;
  distanceM: number;
  movingSec: number;
  activityIds: string[];
  lanes: { id: string; name: string; value: number; you: boolean }[];
}

/** Presentation only: the existing ledger decides what actually counts. */
export function homeSnapshot(state: CompeteState, track: ScoreTrack = "open"): ProgressSnapshot {
  const now = competeNow(state);
  const board = buildSplitBoard(state, state.primary, track, now);
  const activities = board.weekActivities.filter(a => countsOnTrack(a, track) && new Date(a.startedAt) <= now);
  const effort = activities.reduce((sum, a) => sum + activityEffort(a), 0);
  const distanceM = activities.reduce((sum, a) => sum + a.distanceM, 0);
  const movingSec = activities.reduce((sum, a) => sum + a.movingSec, 0);
  const gps = sportById(state.primary).gps;
  const lanes = board.rows.map(row => ({
    id: row.id, name: row.you ? state.name : row.name, you: row.you,
    value: row.you ? (gps ? distanceM / 1000 : effort) : (gps ? row.distanceM / 1000 : row.effort),
  }));
  if (!lanes.some(row => row.you)) lanes.push({ id: "personal", name: state.name, you: true, value: gps ? distanceM / 1000 : effort });
  return {
    version: 1,
    scope: `${state.primary}:${track}:${board.periodStart.toISOString()}:${board.periodEnd.toISOString()}`,
    effort, distanceM, movingSec,
    activityIds: [...new Set(activities.map(a => a.id))].sort(), lanes,
  };
}

export function progressGain(previous: ProgressSnapshot | null, current: ProgressSnapshot) {
  if (!previous || previous.scope !== current.scope) return null;
  const effort = current.effort - previous.effort;
  const distanceM = current.distanceM - previous.distanceM;
  const movingSec = current.movingSec - previous.movingSec;
  // A rival moving, a repeat sync, a lesson, or a score correction down is not our improvement.
  if (effort <= 0.001 || (distanceM <= 0.01 && movingSec <= 0.01)) return null;
  return { effort, distanceM: Math.max(0, distanceM), movingSec: Math.max(0, movingSec),
    newActivities: current.activityIds.filter(id => !previous.activityIds.includes(id)).length };
}

export function readSnapshot(raw: string | null): ProgressSnapshot | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as ProgressSnapshot;
    if (value.version !== 1 || typeof value.scope !== "string" ||
      ![value.effort, value.distanceM, value.movingSec].every(n => Number.isFinite(n) && n >= 0) ||
      !Array.isArray(value.activityIds) || !value.activityIds.every(id => typeof id === "string") ||
      !Array.isArray(value.lanes) || !value.lanes.every(l => l && typeof l.id === "string" && typeof l.name === "string" && typeof l.you === "boolean" && Number.isFinite(l.value) && l.value >= 0)) return null;
    return value;
  } catch { return null; }
}

export function seenKey(accountId: string, snapshot: ProgressSnapshot) {
  return `fb-home-prototype:seen:${encodeURIComponent(accountId)}:${snapshot.scope}`;
}

export const FIXTURE_NOW = "2026-10-14T18:00:00.000Z";
/** Isolated presentation fixture. Manual rows exercise real scoring; never saved to an account. */
export function fixtureWeek(scenario: VisitScenario): { state: CompeteState; previous: ProgressSnapshot } {
  const now = new Date(FIXTURE_NOW);
  const base = reduceCompete({ ...freshState(now), demoNow: FIXTURE_NOW }, { type: "opt-in", sport: "running", now: freshState(now).clock.periodStart });
  const activity = (id: string, day: string, km: number, minutes: number): Activity => ({
    id, sport: "running", startedAt: `2026-10-${day}T07:30:00.000Z`, distanceM: km * 1000,
    movingSec: minutes * 60, avgHr: 132, verified: false, source: "manual", provenance: "manual", disposition: "counted",
  });
  const before: CompeteState = { ...base, name: "Jamie", city: "New York", onboardingCompleted: true,
    activities: [activity("home-mon", "12", 4.2, 29), activity("home-tue", "13", 3.6, 25)],
  };
  const after = scenario === "arrival" ? { ...before, activities: [...before.activities, activity("home-wed", "14", 5.1, 34)] } : before;
  return { state: after, previous: homeSnapshot(before) };
}
