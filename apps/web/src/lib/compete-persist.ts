import type { SupabaseClient } from "@supabase/supabase-js";
import {
  sanitizeCompeteStateForAccount,
  type CompeteState,
} from "@fitness-battle/shared";

type Db = SupabaseClient;

/**
 * Dual-write durable prefs / ratings / settled weeks.
 * Snapshot jsonb stays the full document in P2 — this is additive SoT.
 * Failures are logged by the caller; do not throw away the snapshot write.
 */
export async function persistCompeteCore(
  db: Db,
  userId: string,
  state: CompeteState,
): Promise<void> {
  const clean = sanitizeCompeteStateForAccount(state);

  const { error: profileError } = await db.from("profiles").upsert({
    id: userId,
    display_name: clean.name.slice(0, 80) || "Athlete",
    city: clean.city.slice(0, 80),
    primary_sport: clean.primary,
    updated_at: new Date().toISOString(),
  });
  if (profileError) throw new Error(profileError.message);

  const { error: prefsError } = await db.from("athlete_prefs").upsert({
    user_id: userId,
    freezes_left: clean.freezesLeft,
    calibrated: clean.calibrated,
    onboarding_completed: clean.onboardingCompleted,
    lesson_done_on: clean.lessonDoneOn,
    training_goal_distance: clean.trainingGoal?.distance ?? null,
    training_goal_deadline: clean.trainingGoal?.deadline ?? null,
    updated_at: new Date().toISOString(),
  });
  if (prefsError) throw new Error(prefsError.message);

  if (clean.ratings.length > 0) {
    const { error } = await db.from("sport_ratings").upsert(
      clean.ratings.map((rating) => ({
        user_id: userId,
        sport: rating.sport,
        verified_elo: rating.verifiedElo,
        open_elo: rating.openElo,
        opted_in: rating.optedIn,
        lock_verified: rating.lockVerified,
        lock_open: rating.lockOpen,
        lock_period: rating.lockPeriod,
      })),
    );
    if (error) throw new Error(error.message);
  }

  if (clean.periodResults.length > 0) {
    const { error } = await db.from("period_results").upsert(
      clean.periodResults.map((row) => ({
        user_id: userId,
        period_start: row.periodStart,
        sport: row.sport,
        track: row.track,
        period_end: row.periodEnd,
        place: row.place,
        field_size: row.fieldSize,
        effort: row.effort,
        distance_m: row.distanceM,
        moving_sec: row.movingSec,
        elo_before: row.eloBefore,
        elo_after: row.eloAfter,
        frozen: row.frozen,
        settled_at: row.settledAt,
        acknowledged_at: row.acknowledgedAt ?? null,
      })),
    );
    if (error) throw new Error(error.message);
  }

  // Freezes are a small set — replace from document.
  const { error: clearFreezeError } = await db
    .from("period_freezes")
    .delete()
    .eq("user_id", userId);
  if (clearFreezeError) throw new Error(clearFreezeError.message);
  if (clean.frozenPeriods.length > 0) {
    const { error } = await db.from("period_freezes").insert(
      clean.frozenPeriods.map((periodStart) => ({
        user_id: userId,
        period_start: periodStart,
      })),
    );
    if (error) throw new Error(error.message);
  }
}
