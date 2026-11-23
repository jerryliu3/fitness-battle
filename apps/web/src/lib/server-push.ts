import {
  notificationEvent,
  type CompetitionMoment,
  type NotificationDeliveryPayload,
} from "@fitness-battle/shared";
import type { SupabaseClient } from "@supabase/supabase-js";
import { deliverNotificationToUser } from "@/lib/deliver-notification";

const RECENT_ACTIVITY_WINDOW_MS = 48 * 60 * 60 * 1000;

const PROVIDER_LABELS: Record<string, string> = {
  strava: "Strava",
  garmin: "Garmin",
  apple_health: "Apple Health",
  health_connect: "Health Connect",
  oura: "Oura",
  whoop: "WHOOP",
};

const SPORT_LABELS: Record<string, string> = {
  running: "run",
  cycling: "ride",
  swimming: "swim",
  walking: "walk",
  strength: "strength session",
};

export interface SyncedActivitySummary {
  provider: string;
  sport: string;
  startedAt: string;
  journalOnly?: boolean;
}

export interface StandingEntry {
  user_id: string;
  score: number;
}

async function sendBestEffort(
  db: SupabaseClient,
  userId: string,
  payload: NotificationDeliveryPayload,
): Promise<void> {
  try {
    await deliverNotificationToUser(db, userId, payload, { requireLive: true });
  } catch {
    // Best-effort push must never break activity sync or account saves.
  }
}

/** Notify the athlete when newly synced recent workouts land on their board. */
export async function notifySyncedActivities(
  db: SupabaseClient,
  userId: string,
  activities: SyncedActivitySummary[],
  now: Date = new Date(),
): Promise<void> {
  const cutoff = now.getTime() - RECENT_ACTIVITY_WINDOW_MS;
  const recent = activities.filter((item) => {
    if (item.journalOnly) return false;
    const ms = Date.parse(item.startedAt);
    return Number.isFinite(ms) && ms >= cutoff;
  });
  if (recent.length === 0) return;

  const latest = recent[recent.length - 1]!;
  const payload = notificationEvent("activity_synced", {
    count: recent.length,
    sport: SPORT_LABELS[latest.sport] ?? latest.sport,
    provider: PROVIDER_LABELS[latest.provider] ?? latest.provider,
  });
  await sendBestEffort(db, userId, payload);
}

/** Compute 1-based ranks from standings rows (score desc, user_id asc). */
export function rankStandings(rows: StandingEntry[]): Map<string, number> {
  const sorted = [...rows].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.user_id.localeCompare(b.user_id);
  });
  const ranks = new Map<string, number>();
  sorted.forEach((row, index) => {
    ranks.set(row.user_id, index + 1);
  });
  return ranks;
}

/** Read current-period ranks for a battle. Returns null if tables are unavailable. */
export async function snapshotBattleRanks(
  db: SupabaseClient,
  battleId: string,
): Promise<Map<string, number> | null> {
  try {
    const { data: period } = await db
      .from("periods")
      .select("id")
      .eq("battle_id", battleId)
      .eq("is_current", true)
      .maybeSingle();
    if (!period?.id) return null;
    const { data: standings } = await db
      .from("standings")
      .select("user_id, score")
      .eq("period_id", period.id);
    if (!Array.isArray(standings)) return null;
    return rankStandings(
      standings.map((row) => ({
        user_id: String(row.user_id),
        score: Number(row.score ?? 0),
      })),
    );
  } catch {
    return null;
  }
}

async function profileNames(
  db: SupabaseClient,
  userIds: string[],
): Promise<Map<string, string>> {
  const names = new Map<string, string>();
  if (userIds.length === 0) return names;
  try {
    const { data } = await db
      .from("profiles")
      .select("id, display_name")
      .in("id", userIds);
    for (const row of data ?? []) {
      if (row.id && typeof row.display_name === "string" && row.display_name.trim()) {
        names.set(String(row.id), row.display_name.trim());
      }
    }
  } catch {
    // Names are optional in notification copy.
  }
  return names;
}

/** Notify the mover and any overtaken rivals when battle standings change. */
export async function notifyBattleRankChanges(
  db: SupabaseClient,
  actorUserId: string,
  beforeRanks: Map<string, number> | null,
  afterRanks: Map<string, number> | null,
): Promise<void> {
  if (!beforeRanks || !afterRanks) return;
  const actorBefore = beforeRanks.get(actorUserId);
  const actorAfter = afterRanks.get(actorUserId);
  if (actorBefore == null || actorAfter == null || actorAfter >= actorBefore) {
    return;
  }

  const overtakenIds: string[] = [];
  for (const [otherId, afterRank] of afterRanks) {
    if (otherId === actorUserId) continue;
    const beforeRank = beforeRanks.get(otherId);
    if (
      beforeRank != null &&
      afterRank > beforeRank &&
      beforeRank <= actorBefore &&
      afterRank > actorAfter
    ) {
      overtakenIds.push(otherId);
    }
  }

  const names = await profileNames(db, [actorUserId, ...overtakenIds]);
  const actorName = names.get(actorUserId);
  const firstPassedName = overtakenIds[0] ? names.get(overtakenIds[0]) : undefined;

  const tasks: Promise<void>[] = [
    sendBestEffort(
      db,
      actorUserId,
      notificationEvent("rival_moves", {
        direction: "overtook",
        place: actorAfter,
        athleteName: firstPassedName,
      }),
    ),
  ];

  for (const overtakenId of overtakenIds) {
    const otherAfter = afterRanks.get(overtakenId);
    tasks.push(
      sendBestEffort(
        db,
        overtakenId,
        notificationEvent("rival_moves", {
          direction: "overtaken",
          place: otherAfter,
          athleteName: actorName,
        }),
      ),
    );
  }

  await Promise.all(tasks);
}

/** Notify the athlete when a Compete field overtake moment is committed. */
export async function notifyCompeteOvertakes(
  db: SupabaseClient,
  userId: string,
  moments: CompetitionMoment[],
): Promise<void> {
  const overtakes = moments.filter((m) => m.plan.hasOvertake);
  if (overtakes.length === 0) return;
  const first = overtakes[0]!;
  const passedId = first.plan.overtakenIds[0];
  const passedName = passedId
    ? first.lanes.find((lane) => lane.id === passedId)?.name
    : undefined;
  await sendBestEffort(
    db,
    userId,
    notificationEvent("rival_moves", {
      direction: "overtook",
      place: first.plan.rankAfter,
      athleteName: passedName,
    }),
  );
}
