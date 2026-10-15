import type { SupabaseClient } from "@supabase/supabase-js";
import {
  dispositionOf,
  periodResultId,
  prepareCompeteStateForAccount,
  provenanceOf,
  SPORT_IDS,
  withDerivedPendingReveals,
  type Activity,
  type CompeteState,
  type GoalDistance,
  type Rating,
  type SportId,
  type WaveEnrollment,
} from "@fitness-battle/shared";

type Db = SupabaseClient;

function asSport(value: string): SportId | null {
  return (SPORT_IDS as readonly string[]).includes(value)
    ? (value as SportId)
    : null;
}

const CLOUD_PROVIDERS = new Set([
  "strava",
  "garmin",
  "apple_health",
  "google_health",
  "whoop",
  "oura",
]);

function splitCompeteKey(activity: Activity): {
  provider: string;
  externalId: string;
  sourceLabel: string;
  competeKey: string;
} {
  const competeKey = activity.id;
  const sourceLabel = String(activity.source);
  if (CLOUD_PROVIDERS.has(sourceLabel)) {
    const prefix = `${sourceLabel}-`;
    const externalId = competeKey.startsWith(prefix)
      ? competeKey.slice(prefix.length)
      : competeKey;
    return {
      provider: sourceLabel,
      externalId: externalId || competeKey,
      sourceLabel,
      competeKey,
    };
  }
  return {
    provider: "mock",
    externalId: competeKey,
    sourceLabel,
    competeKey,
  };
}

/**
 * Dual-write durable prefs / ratings / settled weeks / activities.
 * Snapshot jsonb stays the full document — additive SoT only.
 * Never deletes activity rows (sync may race ahead of the blob).
 */
export async function persistCompeteCore(
  db: Db,
  userId: string,
  state: CompeteState,
): Promise<void> {
  const clean = prepareCompeteStateForAccount(state);

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

  const { data: categories, error: categoryError } = await db
    .from("categories")
    .select("id, slug");
  if (categoryError) throw new Error(categoryError.message);
  const categoryBySlug = new Map(
    (categories ?? []).map((row) => [row.slug as string, row.id as string]),
  );

  const activityRows = clean.activities.flatMap((activity) => {
    const parts = splitCompeteKey(activity);
    const categoryId = categoryBySlug.get(activity.sport);
    if (!categoryId) return [];
    return [
      {
        user_id: userId,
        provider: parts.provider,
        external_id: parts.externalId,
        category_id: categoryId,
        started_at: activity.startedAt,
        metric_value:
          activity.sport === "strength" ? activity.movingSec : activity.distanceM,
        moving_sec: activity.movingSec,
        avg_hr: activity.avgHr,
        raw_name: "",
        sport: activity.sport,
        distance_m: activity.distanceM,
        verified: activity.verified,
        provenance: provenanceOf(activity),
        disposition: dispositionOf(activity),
        disposition_reason: activity.dispositionReason ?? null,
        compete_key: parts.competeKey,
        source_label: parts.sourceLabel,
      },
    ];
  });

  if (activityRows.length > 0) {
    const { error } = await db.from("activities").upsert(activityRows, {
      onConflict: "user_id,provider,external_id",
    });
    if (error) throw new Error(error.message);
  }

  // Enrollments are a small per-viewer set — replace from document (same as freezes).
  const { error: clearEnrollError } = await db
    .from("wave_enrollments")
    .delete()
    .eq("user_id", userId);
  if (clearEnrollError) throw new Error(clearEnrollError.message);
  if (clean.enrollments.length > 0) {
    const { error } = await db.from("wave_enrollments").insert(
      clean.enrollments.map((enrollment) => ({
        user_id: userId,
        sport: enrollment.sport,
        wave_start: enrollment.waveStart,
        week_end: enrollment.weekEnd,
        capacity: enrollment.capacity,
        peer_ids: enrollment.peerIds,
        synthetic_ids: enrollment.syntheticIds,
        auto_enroll_next: enrollment.autoEnrollNext,
        crew_id: enrollment.crewId ?? null,
      })),
    );
    if (error) throw new Error(error.message);
  }
}

/**
 * Overlay dual-written relational SoT onto the snapshot document.
 * Snapshot arrays remain a cache; when prefs/results/enrollments/ratings
 * rows exist they win. Bulky activity rows stay snapshot-primary (sync races).
 */
export async function hydrateCompeteCollections(
  db: Db,
  userId: string,
  state: CompeteState,
): Promise<CompeteState> {
  const [
    { data: profile },
    { data: prefs },
    { data: ratingRows },
    { data: resultRows },
    { data: freezeRows },
    { data: enrollmentRows },
  ] = await Promise.all([
    db
      .from("profiles")
      .select("display_name, city, primary_sport")
      .eq("id", userId)
      .maybeSingle(),
    db.from("athlete_prefs").select("*").eq("user_id", userId).maybeSingle(),
    db.from("sport_ratings").select("*").eq("user_id", userId),
    db
      .from("period_results")
      .select("*")
      .eq("user_id", userId)
      .order("period_start", { ascending: false }),
    db.from("period_freezes").select("period_start").eq("user_id", userId),
    db.from("wave_enrollments").select("*").eq("user_id", userId),
  ]);

  let next = state;

  if (profile) {
    const primary = asSport(String(profile.primary_sport ?? ""));
    next = {
      ...next,
      name: String(profile.display_name ?? next.name).slice(0, 80) || next.name,
      city: String(profile.city ?? next.city).slice(0, 80),
      primary: primary ?? next.primary,
    };
  }

  if (prefs) {
    const distance = prefs.training_goal_distance as GoalDistance | null;
    next = {
      ...next,
      freezesLeft: Number(prefs.freezes_left ?? next.freezesLeft),
      calibrated: Boolean(prefs.calibrated),
      onboardingCompleted: Boolean(prefs.onboarding_completed),
      lessonDoneOn: prefs.lesson_done_on
        ? String(prefs.lesson_done_on)
        : null,
      trainingGoal:
        distance && prefs.training_goal_deadline
          ? {
              distance,
              deadline: String(prefs.training_goal_deadline),
            }
          : null,
    };
  }

  if (ratingRows && ratingRows.length > 0) {
    const bySport = new Map<SportId, Rating>();
    for (const row of ratingRows) {
      const sport = asSport(String(row.sport));
      if (!sport) continue;
      bySport.set(sport, {
        sport,
        verifiedElo: Number(row.verified_elo),
        openElo: Number(row.open_elo),
        optedIn: Boolean(row.opted_in),
        lockVerified: Number(row.lock_verified),
        lockOpen: Number(row.lock_open),
        lockPeriod: String(row.lock_period),
      });
    }
    next = {
      ...next,
      ratings: next.ratings.map((rating) => bySport.get(rating.sport) ?? rating),
    };
  }

  if (resultRows && resultRows.length > 0) {
    next = {
      ...next,
      periodResults: resultRows.flatMap((row) => {
        const sport = asSport(String(row.sport));
        const track = row.track === "verified" || row.track === "open"
          ? row.track
          : null;
        if (!sport || !track) return [];
        const periodStart = String(row.period_start);
        return [
          {
            id: periodResultId(periodStart, sport, track),
            periodStart,
            periodEnd: String(row.period_end),
            sport,
            track,
            place: Number(row.place),
            fieldSize: Number(row.field_size),
            effort: Number(row.effort),
            distanceM: Number(row.distance_m),
            movingSec: Number(row.moving_sec),
            eloBefore: Number(row.elo_before),
            eloAfter: Number(row.elo_after),
            frozen: Boolean(row.frozen),
            settledAt: String(row.settled_at),
            acknowledgedAt: row.acknowledged_at
              ? String(row.acknowledged_at)
              : null,
          },
        ];
      }),
    };
  }

  // Empty freezes are meaningful only once dual-write has created prefs.
  if (prefs && freezeRows) {
    next = {
      ...next,
      frozenPeriods: freezeRows.map((row) => String(row.period_start)),
    };
  }

  if (enrollmentRows && enrollmentRows.length > 0) {
    const enrollments: WaveEnrollment[] = enrollmentRows.flatMap((row) => {
      const sport = asSport(String(row.sport));
      if (!sport) return [];
      return [
        {
          sport,
          waveStart: String(row.wave_start),
          weekEnd: String(row.week_end),
          capacity: Number(row.capacity),
          peerIds: (row.peer_ids as string[]) ?? [],
          syntheticIds: (row.synthetic_ids as string[]) ?? [],
          autoEnrollNext: Boolean(row.auto_enroll_next),
          crewId: row.crew_id ? String(row.crew_id) : null,
        },
      ];
    });
    next = { ...next, enrollments };
  }

  return withDerivedPendingReveals(next);
}

/** Hydrate crewBoard from shared crew_week_fields when enrollment has crew_id. */
export async function hydrateCrewBoard(
  db: Db,
  userId: string,
  state: CompeteState,
): Promise<CompeteState> {
  const pinned = state.enrollments.find((item) => item.crewId);
  if (!pinned?.crewId) {
    return state.crewBoard ? { ...state, crewBoard: null } : state;
  }

  const { data: field } = await db
    .from("crew_week_fields")
    .select("*")
    .eq("crew_id", pinned.crewId)
    .eq("wave_start", pinned.waveStart)
    .maybeSingle();
  if (!field) {
    return { ...state, crewBoard: null };
  }

  const { data: crew } = await db
    .from("crews")
    .select("name")
    .eq("id", pinned.crewId)
    .maybeSingle();

  const memberIds = (field.member_ids as string[]) ?? [];
  const { data: members } = memberIds.length
    ? await db
        .from("crew_members")
        .select("user_id, display_name")
        .eq("crew_id", pinned.crewId)
        .in("user_id", memberIds)
    : { data: [] as { user_id: string; display_name: string }[] };

  const { data: ratings } = memberIds.length
    ? await db
        .from("sport_ratings")
        .select("user_id, open_elo")
        .eq("sport", field.sport)
        .in("user_id", memberIds)
    : { data: [] as { user_id: string; open_elo: number }[] };

  const eloByUser = new Map(
    (ratings ?? []).map((row) => [String(row.user_id), Number(row.open_elo)]),
  );

  return {
    ...state,
    crewBoard: {
      crewId: pinned.crewId,
      crewName: (crew?.name as string) ?? "Crew",
      sport: field.sport as SportId,
      waveStart: String(field.wave_start),
      weekEnd: String(field.week_end),
      capacity: Number(field.capacity),
      memberIds,
      members: (members ?? []).map((member) => ({
        id: String(member.user_id),
        name: String(member.display_name),
        elo: eloByUser.get(String(member.user_id)) ?? 1000,
      })),
      syntheticIds: (field.synthetic_ids as string[]) ?? [],
    },
  };
}
