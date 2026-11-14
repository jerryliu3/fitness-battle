import {
  normalizeCompeteSyncAction,
  type Action,
  type Activity,
  type CompeteState,
} from "@fitness-battle/shared";

/** Server-owned tracker facts; clients may only choose disposition by activity id. */
export function resolveServerSyncAction(
  stored: CompeteState,
  raw: Action,
  userId: string,
  now: Date,
): Action {
  const normalized = normalizeCompeteSyncAction(raw, userId, now.toISOString());
  if (normalized.type === "import-history") return normalized;
  if (normalized.type === "sync") {
    if (!normalized.allowSample) throw new Error("invalid_sync");
    return normalized;
  }
  if (normalized.type !== "apply-sync" || !normalized.provider) {
    throw new Error("invalid_sync");
  }
  const provider = normalized.provider;
  const known = new Map(stored.activities.map((a) => [a.id, a]));
  const activities: Activity[] = [];
  for (const candidate of raw.activities ?? []) {
    const id = typeof candidate.id === "string" ? candidate.id : "";
    if (!id) throw new Error("invalid_sync");
    const old = known.get(id);
    if (!old || (old.source !== provider && old.source !== "history")) {
      throw new Error("invalid_sync");
    }
    const disposition = candidate.disposition ?? old.disposition;
    if (disposition !== "counted" && disposition !== "pending" && disposition !== "excluded") {
      throw new Error("invalid_sync");
    }
    activities.push({ ...old, disposition });
  }
  const sleepKnown = new Map(stored.sleepNights.map((n) => [n.id, n]));
  const sleepNights = [];
  for (const night of raw.sleepNights ?? []) {
    const old = sleepKnown.get(night.id);
    if (!old || old.source !== provider) throw new Error("invalid_sync");
    sleepNights.push(old);
  }
  const readinessKnown = new Map(stored.readiness.map((m) => [m.id, m]));
  const readiness = [];
  for (const mark of raw.readiness ?? []) {
    const old = readinessKnown.get(mark.id);
    if (!old || old.provider !== provider) throw new Error("invalid_sync");
    readiness.push(old);
  }
  return { ...normalized, activities, sleepNights, readiness };
}