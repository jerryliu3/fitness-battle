import { PROVIDER_IDS, type Activity, type ProviderId } from "./sports";
import type { Action } from "./engine";
import { COMPETE_SYNC_ACTION_TYPES } from "./intents";
import type { ReadinessMark } from "./sports";

const syncSet = new Set<string>(COMPETE_SYNC_ACTION_TYPES);
export const MAX_SYNC_ACTIVITIES = 80;
export const MAX_SYNC_SLEEP = 40;
export const MAX_SYNC_READINESS = 40;

export function isCompeteSyncAction(action: Pick<Action, "type">): boolean {
  return syncSet.has(action.type);
}

function assertBatchSize(count: number, max: number) {
  if (count > max) throw new Error("sync_batch_too_large");
}

export function normalizeCompeteSyncAction(
  raw: Action,
  userId: string,
  nowIso: string,
): Action {
  if (!isCompeteSyncAction(raw)) throw new Error("invalid_sync");
  const now = new Date(nowIso);
  const base = { type: raw.type, accountId: userId, now: nowIso };
  switch (raw.type) {
    case "apply-sync": {
      if (!raw.provider || !PROVIDER_IDS.includes(raw.provider as ProviderId)) {
        throw new Error("invalid_sync");
      }
      const provider = raw.provider as ProviderId;
      const activityRows = raw.activities ?? [];
      const sleepRows = raw.sleepNights ?? [];
      const readinessRows = raw.readiness ?? [];
      assertBatchSize(activityRows.length, MAX_SYNC_ACTIVITIES);
      assertBatchSize(sleepRows.length, MAX_SYNC_SLEEP);
      assertBatchSize(readinessRows.length, MAX_SYNC_READINESS);
      const activities = activityRows.filter(
        (row) => row.source === provider || row.source === "history",
      );
      const sleepNights = sleepRows.filter((night) => night.source === provider);
      const readiness: ReadinessMark[] = [];
      const seen = new Set<string>();
      for (const mark of readinessRows) {
        if (mark.provider !== provider || seen.has(mark.id)) continue;
        if (mark.score < 0 || mark.score > 100 || !/^\d{4}-\d{2}-\d{2}$/.test(mark.day)) continue;
        seen.add(mark.id);
        readiness.push(mark);
      }
      const linkStatus =
        raw.linkStatus === "connected" || raw.linkStatus === "stub" ? raw.linkStatus : undefined;
      return { ...base, provider, activities, sleepNights, readiness, linkStatus };
    }
    case "sync":
      if (!raw.provider || !PROVIDER_IDS.includes(raw.provider as ProviderId)) {
        throw new Error("invalid_sync");
      }
      if (!raw.allowSample) throw new Error("invalid_sync");
      return { ...base, provider: raw.provider as ProviderId, allowSample: true };
    case "import-history":
      return base;
    default:
      throw new Error("invalid_sync");
  }
}

export function serializeCompeteSyncAction(action: Action): Action {
  if (!isCompeteSyncAction(action)) throw new Error("invalid_sync");
  const { accountId: _a, now: _n, ...rest } = action;
  void _a;
  void _n;
  if (rest.type === "apply-sync") {
    return {
      ...rest,
      activities: (rest.activities ?? []).map((row) => ({
        id: row.id,
        disposition: row.disposition,
        source: row.source,
      })) as Activity[],
      sleepNights: (rest.sleepNights ?? []).map((night) => ({ id: night.id, source: night.source })),
      readiness: (rest.readiness ?? []).map((mark) => ({
        id: mark.id,
        provider: mark.provider,
      })) as ReadinessMark[],
    } as Action;
  }
  return rest as Action;
}

/** Keep large history receipts within the existing server intent limits. */
export function serializeCompeteSyncActions(action: Action): Action[] {
  if (action.type !== "apply-sync") return [serializeCompeteSyncAction(action)];
  const count = Math.max(1, Math.ceil((action.activities?.length ?? 0) / MAX_SYNC_ACTIVITIES),
    Math.ceil((action.sleepNights?.length ?? 0) / MAX_SYNC_SLEEP), Math.ceil((action.readiness?.length ?? 0) / MAX_SYNC_READINESS));
  return Array.from({ length: count }, (_, i) => serializeCompeteSyncAction({ ...action,
    activities: action.activities?.slice(i * MAX_SYNC_ACTIVITIES, (i + 1) * MAX_SYNC_ACTIVITIES),
    sleepNights: action.sleepNights?.slice(i * MAX_SYNC_SLEEP, (i + 1) * MAX_SYNC_SLEEP),
    readiness: action.readiness?.slice(i * MAX_SYNC_READINESS, (i + 1) * MAX_SYNC_READINESS),
  }));
}
