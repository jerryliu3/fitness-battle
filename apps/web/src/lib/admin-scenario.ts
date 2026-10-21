import { periodEffort, reduceCompete, SPORTS, type CompeteState, type SportId } from "@fitness-battle/shared";

export const SCENARIO_ACTIONS = ["add-activity", "register", "stop-renewal", "resume-renewal", "remove-registration", "join-field", "overtake", "reset-activities", "replay-results"] as const;
export type ScenarioAction = typeof SCENARIO_ACTIONS[number];
export const isUuid = (value: unknown): value is string => typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
export function scenarioSport(value: unknown): value is SportId { return SPORTS.some((sport) => sport.id === value); }

/** Only the ordinary registration reducer defines enrollment defaults. Admin owns persistence. */
export function registrationPlan(state: CompeteState, sport: SportId, target: string, now: Date) {
  if (state.enrollments.some((row) => Date.parse(row.weekEnd) <= now.getTime())) throw new Error("settle_due_rounds_first");
  if (state.enrollments.some((row) => row.sport === sport)) throw new Error("already_registered");
  const after = reduceCompete({ ...state, demoNow: null, crewBoard: null }, { type: "opt-in", sport, accountId: target, now: now.toISOString() });
  return { enrollment: after.enrollments.find((row) => row.sport === sport), rating: after.ratings.find((row) => row.sport === sport) };
}

/** Add just enough counted volume to pass a real field mate on distance and score. */
export function overtakeActivity(mover: CompeteState, other: CompeteState, sport: SportId, verified: boolean, now: Date) {
  const enrollment = mover.enrollments.find((row) => row.sport === sport);
  const peer = other.enrollments.find((row) => row.sport === sport);
  if (!enrollment || !peer || Date.parse(enrollment.waveStart) !== Date.parse(peer.waveStart) || Date.parse(enrollment.weekEnd) !== Date.parse(peer.weekEnd) || Date.parse(enrollment.waveStart) >= now.getTime() || Date.parse(enrollment.weekEnd) <= now.getTime()) throw new Error("matching_active_enrollments_required");
  if (sport === "strength" && verified) throw new Error("strength_has_no_verified_track");
  const track = verified ? "verified" : "open";
  const start = new Date(enrollment.waveStart);
  const mine = periodEffort(mover.activities, sport, start, now, track);
  const theirs = periodEffort(other.activities, sport, start, now, track);
  const gps = sport !== "strength";
  if ((gps ? mine.distanceM >= theirs.distanceM : mine.effort >= theirs.effort)) throw new Error("mover_must_be_behind_add_leader_activity_or_reverse_direction");
  const distanceM = gps ? Math.ceil(Math.max(theirs.distanceM - mine.distanceM + 100, (theirs.effort - mine.effort + 0.5) * 1000)) : 0;
  const movingSec = gps ? Math.ceil(distanceM * (sport === "cycling" ? 0.18 : sport === "walking" ? 0.72 : 0.39)) : Math.ceil(Math.max(60, (theirs.effort - mine.effort + 0.5) * 450));
  if (distanceM > 1_000_000 || movingSec > 604800) throw new Error("scenario_too_large_use_smaller_test_totals");
  return { distanceM, movingSec, startedAt: new Date(now.getTime() - 1).toISOString(), verified };
}

export function activityPayload(input: Record<string, unknown>, now: Date) {
  const distanceM = Number(input.distanceM), movingSec = Number(input.movingSec);
  const at = typeof input.startedAt === "string" && input.startedAt ? Date.parse(input.startedAt) : now.getTime() - 1;
  if (!Number.isFinite(distanceM) || distanceM < 0 || distanceM > 1_000_000 || !Number.isFinite(movingSec) || movingSec <= 0 || movingSec > 604800 || !Number.isFinite(at) || at > now.getTime() || at < Date.UTC(2000, 0, 1) || typeof input.verified !== "boolean") throw new Error("invalid_activity");
  return { distanceM, movingSec, startedAt: new Date(at).toISOString(), verified: input.verified };
}
