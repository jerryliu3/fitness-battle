import { notificationEvent } from "@fitness-battle/shared";
import type { SupabaseClient } from "@supabase/supabase-js";
import { deliverNotificationToUser } from "@/lib/deliver-notification";

const DEFAULT_TIME_ZONE = "America/New_York";

export function localDateAndHour(
  now: Date,
  timeZone?: string | null,
): { day: string; hour: number } {
  const tz = timeZone?.trim() || DEFAULT_TIME_ZONE;
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      hour12: false,
    }).formatToParts(now);
    const get = (type: string) =>
      parts.find((p) => p.type === type)?.value ?? "";
    const hourRaw = Number(get("hour"));
    return {
      day: `${get("year")}-${get("month")}-${get("day")}`,
      hour: Number.isFinite(hourRaw) ? hourRaw % 24 : 0,
    };
  } catch {
    return localDateAndHour(now, DEFAULT_TIME_ZONE);
  }
}

async function userTimeZone(
  db: SupabaseClient,
  userId: string,
): Promise<string> {
  const { data } = await db
    .from("profiles")
    .select("timezone")
    .eq("id", userId)
    .maybeSingle();
  return typeof data?.timezone === "string" && data.timezone.trim()
    ? data.timezone.trim()
    : DEFAULT_TIME_ZONE;
}

async function todayRecoverySnapshot(
  db: SupabaseClient,
  userId: string,
  day: string,
): Promise<{ sleepMin?: number; recoveryScore?: number }> {
  const [{ data: sleep }, { data: readiness }] = await Promise.all([
    db
      .from("sleep_nights")
      .select("duration_min, score")
      .eq("user_id", userId)
      .eq("day", day)
      .order("duration_min", { ascending: false })
      .limit(1)
      .maybeSingle(),
    db
      .from("readiness_marks")
      .select("score")
      .eq("user_id", userId)
      .eq("day", day)
      .order("score", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  const sleepMin =
    typeof sleep?.duration_min === "number" && sleep.duration_min > 0
      ? sleep.duration_min
      : undefined;
  const recoveryScore =
    typeof readiness?.score === "number"
      ? readiness.score
      : typeof sleep?.score === "number"
        ? sleep.score
        : undefined;
  return { sleepMin, recoveryScore };
}

async function todaySteps(
  db: SupabaseClient,
  userId: string,
  day: string,
): Promise<number | undefined> {
  const { data } = await db
    .from("daily_health")
    .select("steps")
    .eq("user_id", userId)
    .eq("day", day);
  let maxSteps = 0;
  for (const row of data ?? []) {
    const s = Number(row.steps ?? 0);
    if (Number.isFinite(s) && s > maxSteps) maxSteps = s;
  }
  return maxSteps > 0 ? maxSteps : undefined;
}

/**
 * Mark today's recovery/sleep check-in as seen when synced in-app so we don't
 * send a redundant push notification later the same day.
 */
export async function markRecoveryCheckedIn(
  db: SupabaseClient,
  userId: string,
  now: Date = new Date(),
): Promise<void> {
  try {
    const tz = await userTimeZone(db, userId);
    const { day } = localDateAndHour(now, tz);
    await db
      .from("notification_preferences")
      .update({ last_recovery_checkin_day: day })
      .eq("user_id", userId);
  } catch {
    // Best-effort.
  }
}

/**
 * Background cron hook: if today's sleep/recovery arrived and hasn't been
 * checked in yet today, send 1 morning check-in push and mark today done.
 */
export async function maybeSendMorningRecoveryPush(
  db: SupabaseClient,
  userId: string,
  now: Date = new Date(),
): Promise<boolean> {
  try {
    const tz = await userTimeZone(db, userId);
    const { day } = localDateAndHour(now, tz);
    const { data: pref } = await db
      .from("notification_preferences")
      .select("enabled, daily_digest, last_recovery_checkin_day")
      .eq("user_id", userId)
      .maybeSingle();
    if (!pref?.enabled || pref.daily_digest === false) return false;
    if (pref.last_recovery_checkin_day === day) return false;

    const { sleepMin, recoveryScore } = await todayRecoverySnapshot(db, userId, day);
    if (sleepMin == null && recoveryScore == null) return false;

    const result = await deliverNotificationToUser(
      db,
      userId,
      notificationEvent("daily_digest", {
        kind: "morning",
        sleepMin,
        recoveryScore,
      }),
      { requireLive: true },
    );
    await db
      .from("notification_preferences")
      .update({ last_recovery_checkin_day: day })
      .eq("user_id", userId);
    return result.ok;
  } catch {
    return false;
  }
}

/**
 * End-of-day cron hook: for users in their 23:00–23:59 local hour who haven't
 * received today's summary yet, send steps + any unseen recovery/sleep.
 */
export async function runEveningDailySummaries(
  db: SupabaseClient,
  now: Date = new Date(),
): Promise<{ sent: number }> {
  let sent = 0;
  try {
    const { data: prefs } = await db
      .from("notification_preferences")
      .select("user_id, last_recovery_checkin_day, last_daily_summary_day")
      .eq("enabled", true)
      .eq("daily_digest", true);
    if (!prefs?.length) return { sent: 0 };

    const userIds = prefs.map((p) => String(p.user_id));
    const { data: profiles } = await db
      .from("profiles")
      .select("id, timezone")
      .in("id", userIds);
    const tzByUser = new Map<string, string>();
    for (const row of profiles ?? []) {
      if (row.id && typeof row.timezone === "string") {
        tzByUser.set(String(row.id), row.timezone);
      }
    }

    for (const pref of prefs) {
      const userId = String(pref.user_id);
      const { day, hour } = localDateAndHour(now, tzByUser.get(userId));
      if (hour !== 23) continue;
      if (pref.last_daily_summary_day === day) continue;

      const steps = await todaySteps(db, userId, day);
      const needsRecoveryFallback = pref.last_recovery_checkin_day !== day;
      const recovery = needsRecoveryFallback
        ? await todayRecoverySnapshot(db, userId, day)
        : {};
      if (
        steps == null &&
        recovery.sleepMin == null &&
        recovery.recoveryScore == null
      ) {
        continue;
      }

      const result = await deliverNotificationToUser(
        db,
        userId,
        notificationEvent("daily_digest", {
          kind: "evening",
          steps,
          sleepMin: recovery.sleepMin,
          recoveryScore: recovery.recoveryScore,
        }),
        { requireLive: true },
      );

      await db
        .from("notification_preferences")
        .update({
          last_daily_summary_day: day,
          ...(recovery.sleepMin != null || recovery.recoveryScore != null
            ? { last_recovery_checkin_day: day }
            : {}),
        })
        .eq("user_id", userId);

      if (result.ok) sent += 1;
    }
  } catch {
    // Best-effort.
  }
  return { sent };
}
