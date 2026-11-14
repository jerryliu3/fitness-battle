import { dayKey } from "./sports";
import { PROVIDER_IDS, SPORT_IDS, type Activity, type ProviderId, type SportId } from "./sports";
import type { Action } from "./engine";
import { COMPETE_SYNC_ACTION_TYPES } from "./intents";
import type { SleepNight } from "./health";
import type { ReadinessMark } from "./sports";

const syncSet = new Set<string>(COMPETE_SYNC_ACTION_TYPES);
const MAX_SYNC_ACTIVITIES = 80;
const MAX_SYNC_SLEEP = 40;
const MAX_SYNC_READINESS = 40;

export function isCompeteSyncAction(action: Pick<Action, "type">): boolean {
  return syncSet.has(action.type);
}

function sanitizeSyncActivity(raw: Activity, provider: ProviderId): Activity | null {
  if (raw.source !== provider && raw.source !== "history") return null;
  if (!raw.id || raw.id.length > 240 || !SPORT_IDS.includes(raw.sport)) return null;
  const startedAt = Date.parse(raw.startedAt);
  if (!Number.isFinite(startedAt)) return null;
  const movingSec = raw.movingSec;
  const distanceM = raw.distanceM;
  if (!Number.isFinite(movingSec) || movingSec < 0 || movingSec > 86400) return null;
  if (!Number.isFinite(distanceM) || distanceM < 0 || distanceM > 2_000_000) return null;
  return {
    id: raw.id,
    sport: raw.sport,
    startedAt: new Date(startedAt).toISOString(),
    distanceM,
    movingSec,
    avgHr: typeof raw.avgHr === "number" && Number.isFinite(raw.avgHr) ? raw.avgHr : null,
    verified: Boolean(raw.verified),
    source: raw.source,
    provenance: raw.provenance,
    disposition: raw.disposition,
    dispositionReason: raw.dispositionReason?.slice(0, 240),
    summaryPolyline: raw.summaryPolyline ?? null,
    detailedPolyline: raw.detailedPolyline ?? null,
    routeReplay: raw.routeReplay ?? null,
    elevationGainM: raw.elevationGainM ?? null,
    routeBounds: raw.routeBounds ?? null,
  };
}

function sanitizeSleepNight(night: SleepNight, now: Date): SleepNight | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(night.day) || night.day > dayKey(now)) return null;
  if (!Number.isFinite(night.score) || night.score < 0 || night.score > 100) return null;
  if (!Number.isFinite(night.durationMin) || night.durationMin < 0 || night.durationMin > 1440) {
    return null;
  }
  return { ...night, id: night.id.slice(0, 240) };
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
      const activities = (raw.activities ?? [])
        .slice(0, MAX_SYNC_ACTIVITIES)
        .map((row) => sanitizeSyncActivity(row, provider))
        .filter((row): row is Activity => Boolean(row));
      const sleepNights = (raw.sleepNights ?? [])
        .slice(0, MAX_SYNC_SLEEP)
        .map((night) => sanitizeSleepNight(night, now))
        .filter((night): night is SleepNight => Boolean(night));
      const readiness: ReadinessMark[] = [];
      const seen = new Set<string>();
      for (const mark of raw.readiness ?? []) {
        if (readiness.length >= MAX_SYNC_READINESS) break;
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
  return rest as Action;
}