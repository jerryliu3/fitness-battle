import { dayKey } from "./period";
import { countsOnTrack } from "./compete/ledger";
import { competeNow, reduceCompete, type Action } from "./compete/engine";
import type { Activity, CompeteState } from "./compete/sports";
export interface SyncReviewReceipt {
  account: string | null;
  activities: Activity[];
  preview: boolean;
  day: string;
}
const fingerprint = (a: Activity) =>
  JSON.stringify([
    a.startedAt,
    a.sport,
    a.distanceM,
    a.movingSec,
    a.verified,
    a.provenance,
    a.disposition,
  ]);
export function changedTodaySync(
  incoming: Activity[],
  known: Activity[],
  now: Date,
) {
  const previous = new Map(known.map((a) => [a.id, a]));
  return [...new Map(incoming.map((a) => [a.id, a])).values()].filter((a) => {
    const at = Date.parse(a.startedAt),
      old = previous.get(a.id);
    return (
      Number.isFinite(at) &&
      at <= now.getTime() &&
      dayKey(new Date(at)) === dayKey(now) &&
      (!old || fingerprint(old) !== fingerprint(a)) &&
      old?.disposition !== "excluded"
    );
  });
}
/** Presentation gate only. Server ingest is durable; the existing reducer remains the only local writer. */
export function planSyncReview(action: Action, state: CompeteState) {
  const now = action.now ? new Date(action.now) : competeNow(state);
  if (action.type === "sync" && action.allowSample) {
    const sampleAction = { ...action, now: now.toISOString() };
    const next = reduceCompete(state, sampleAction);
    return {
      immediate: sampleAction,
      deferred: null,
      activities: changedTodaySync(
        next.activities.filter((a) => a.source === action.provider),
        state.activities,
        now,
      ),
      preview: true,
    };
  }
  if (action.type !== "apply-sync")
    return {
      immediate: action,
      deferred: null,
      activities: [],
      preview: false,
    };
  const incoming = (action.activities ?? []).filter(
    (a) => a.source === action.provider,
  );
  const today = changedTodaySync(incoming, state.activities, now);
  const known = new Map(state.activities.map((a) => [a.id, a]));
  const quiet = incoming.some((a) => {
    const at = Date.parse(a.startedAt),
      old = known.get(a.id);
    return (
      Number.isFinite(at) &&
      at <= now.getTime() &&
      dayKey(new Date(at)) < dayKey(now) &&
      countsOnTrack(a, "open") &&
      old?.disposition !== "excluded" &&
      (!old || fingerprint(old) !== fingerprint(a))
    );
  });
  const immediate: Action = quiet
    ? { ...action, syncPresentation: "quiet" }
    : action;
  const preview = action.linkStatus === "stub";
  const activities = preview
    ? today
    : today.filter((a) => countsOnTrack(a, "open"));
  if (!activities.length || preview)
    return { immediate, deferred: null, activities, preview };
  const held = new Set(activities.map((a) => a.id));
  return {
    immediate: {
      ...immediate,
      activities: incoming.filter((a) => !held.has(a.id)),
    },
    deferred: { ...action, activities, readiness: [], sleepNights: [] },
    activities,
    preview: false,
  };
}
