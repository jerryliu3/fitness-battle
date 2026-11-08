import { dayKey } from "./period";
import {
  countsOnTrack,
  dispositionOf,
  isSampleActivity,
  prefer,
  provenanceOf,
  sameWorkout,
} from "./compete/ledger";
import { competeNow, reduceCompete, type Action } from "./compete/engine";
import type { Activity, CompeteState } from "./compete/sports";
/** Brief beat before applying sync review so the confirm affordance can show progress. */
export const SYNC_REVIEW_SAVE_DELAY_MS = 900;

export interface SyncReviewReceipt {
  account: string | null;
  activities: Activity[];
  preview: boolean;
  day: string;
}
const fingerprint = (a: Activity) =>
  JSON.stringify([
    Date.parse(a.startedAt),
    a.sport,
    Math.round(a.distanceM * 100),
    Math.round(a.movingSec),
    a.verified,
    provenanceOf(a),
    dispositionOf(a),
  ]);
export function changedSyncActivities(
  incoming: Activity[],
  known: Activity[],
  now: Date,
) {
  const previous = new Map(known.map((a) => [a.id, a]));
  const activeKnown = known.filter(
    (a) => !isSampleActivity(a) && dispositionOf(a) !== "excluded",
  );
  const candidates = [...new Map(incoming.map((a) => [a.id, a])).values()].filter(
    (a) => {
      const at = Date.parse(a.startedAt),
        old = previous.get(a.id);
      if (
        !Number.isFinite(at) ||
        at > now.getTime() ||
        (old && fingerprint(old) === fingerprint(a)) ||
        old?.disposition === "excluded"
      ) {
        return false;
      }
      if (
        !old &&
        !isSampleActivity(a) &&
        activeKnown.some((k) => sameWorkout(k, a) && prefer(k, a).id === k.id)
      ) {
        return false;
      }
      return true;
    },
  );
  const deduped: Activity[] = [];
  for (const a of candidates) {
    if (isSampleActivity(a)) {
      deduped.push(a);
      continue;
    }
    const twinIdx = deduped.findIndex(
      (item) => !isSampleActivity(item) && sameWorkout(item, a),
    );
    if (twinIdx < 0) deduped.push(a);
    else deduped[twinIdx] = prefer(deduped[twinIdx]!, a);
  }
  return deduped;
}
/** Current-day convenience for sample previews; real sync reviews every changed activity. */
export function changedTodaySync(incoming: Activity[], known: Activity[], now: Date) {
  return changedSyncActivities(incoming, known, now).filter(a => dayKey(new Date(a.startedAt)) === dayKey(now));
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
  const today = changedSyncActivities(incoming, state.activities, now);
  const immediate = action;
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
      activities: incoming
        .filter((a) => !held.has(a.id))
        .map((a) => {
          if (isSampleActivity(a) || dispositionOf(a) === "excluded") return a;
          const winner = activities.find(
            (w) => !isSampleActivity(w) && sameWorkout(w, a),
          );
          if (!winner) return a;
          return {
            ...a,
            disposition: "excluded" as const,
            verified: false,
            dispositionReason: `Already counted from ${provenanceOf(winner)} ${winner.source}.`,
          };
        }),
    },
    deferred: { ...action, activities, readiness: [], sleepNights: [] },
    activities,
    preview: false,
  };
}
