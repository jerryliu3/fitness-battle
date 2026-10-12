/** Default historical pull when a user first connects or calibrates. */
export const BACKFILL_DAYS = 90;

/** Incremental sync lookback when a prior sync exists. */
export const INCREMENTAL_SYNC_DAYS = 14;

/** After this many hours without a new sample, UI shows "stale". */
export const SYNC_STALE_HOURS = 36;

export type SyncEvidence =
  | "never_asked"
  | "disconnected"
  | "stub"
  | "asked"
  | "receiving_data"
  | "stale";

export interface SyncWindow {
  since: string;
  until: string;
  kind: "backfill" | "incremental" | "recent";
  days: number;
}

export function syncWindow(
  options: {
    now?: Date;
    lastSyncAt?: string | null;
    forceBackfill?: boolean;
    backfillDays?: number;
    incrementalDays?: number;
  } = {},
): SyncWindow {
  const now = options.now ?? new Date();
  const until = now.toISOString();
  const backfillDays = options.backfillDays ?? BACKFILL_DAYS;
  const incrementalDays = options.incrementalDays ?? INCREMENTAL_SYNC_DAYS;

  if (options.forceBackfill || !options.lastSyncAt) {
    const since = new Date(now);
    since.setUTCDate(since.getUTCDate() - backfillDays);
    return {
      since: since.toISOString(),
      until,
      kind: "backfill",
      days: backfillDays,
    };
  }

  const last = new Date(options.lastSyncAt);
  const since = new Date(last);
  // Overlap a day so borderline activities are not missed; upserts dedupe.
  since.setUTCDate(since.getUTCDate() - 1);
  const floor = new Date(now);
  floor.setUTCDate(floor.getUTCDate() - incrementalDays);
  const effective = since < floor ? floor : since;
  return {
    since: effective.toISOString(),
    until,
    kind: "incremental",
    days: Math.max(
      1,
      Math.ceil((now.getTime() - effective.getTime()) / 86_400_000),
    ),
  };
}

export function evidenceFromConnection(input: {
  status: "connected" | "disconnected" | "stub";
  lastActivityAt?: string | null;
  lastSyncAt?: string | null;
  now?: Date;
}): SyncEvidence {
  if (input.status === "stub") return "stub";
  if (input.status === "disconnected") {
    return input.lastSyncAt ? "disconnected" : "never_asked";
  }
  const now = input.now ?? new Date();
  const sampleAt = input.lastActivityAt ?? input.lastSyncAt;
  if (!sampleAt) return "asked";
  const ageHours =
    (now.getTime() - new Date(sampleAt).getTime()) / (1000 * 60 * 60);
  return ageHours <= SYNC_STALE_HOURS ? "receiving_data" : "stale";
}

export function evidenceLabel(evidence: SyncEvidence): string {
  switch (evidence) {
    case "never_asked":
      return "Not linked";
    case "disconnected":
      return "Disconnected";
    case "stub":
      return "Demo sync (no API keys)";
    case "asked":
      return "Linked · waiting for data";
    case "receiving_data":
      return "Syncing";
    case "stale":
      return "Linked · last sync is old";
  }
}
