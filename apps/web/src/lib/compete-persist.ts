import type { SupabaseClient } from "@supabase/supabase-js";
import {
  dispositionOf,
  periodResultId,
  prepareCompeteStateForAccount,
  provenanceOf,
  PROVIDER_IDS,
  SPORT_IDS,
  withDerivedPendingReveals,
  type Activity,
  type CompeteState,
  type GoalDistance,
  type PeriodResult,
  type ProviderId,
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

function asActivitySource(label: string): Activity["source"] {
  if ((PROVIDER_IDS as readonly string[]).includes(label)) {
    return label as ProviderId;
  }
  if (label === "history" || label === "manual") return label;
  return "manual";
}

function asProvenance(
  value: unknown,
): NonNullable<Activity["provenance"]> {
  if (
    value === "recorded" ||
    value === "imported" ||
    value === "manual" ||
    value === "demo"
  ) {
    return value;
  }
  return "recorded";
}

function asDisposition(
  value: unknown,
): NonNullable<Activity["disposition"]> {
  if (value === "counted" || value === "pending" || value === "excluded") {
    return value;
  }
  return "counted";
}

function isAcked(row: PeriodResult): boolean {
  return row.acknowledgedAt != null && row.acknowledgedAt !== "";
}

/** Merge snapshot + DB results; never drop snapshot-ahead rows after a laggy dual-write. */
function mergePeriodResults(
  snapshot: PeriodResult[],
  fromDb: PeriodResult[],
): PeriodResult[] {
  const byId = new Map<string, PeriodResult>();
  for (const row of snapshot) byId.set(row.id, row);
  for (const row of fromDb) {
    const existing = byId.get(row.id);
    if (!existing) {
      byId.set(row.id, row);
      continue;
    }
    // Prefer acknowledged (dismissed reveal); else newer settledAt.
    if (isAcked(existing) !== isAcked(row)) {
      byId.set(row.id, isAcked(row) ? row : existing);
      continue;
    }
    byId.set(
      row.id,
      existing.settledAt >= row.settledAt ? existing : row,
    );
  }
  return [...byId.values()].sort(
    (a, b) =>
      b.periodStart.localeCompare(a.periodStart) ||
      a.sport.localeCompare(b.sport),
  );
}

/** Per sport: later wave wins; same wave prefers DB seating. */
function mergeEnrollments(
  snapshot: WaveEnrollment[],
  fromDb: WaveEnrollment[],
): WaveEnrollment[] {
  const bySport = new Map<SportId, WaveEnrollment>();
  for (const item of snapshot) bySport.set(item.sport, item);
  for (const item of fromDb) {
    const existing = bySport.get(item.sport);
    if (!existing || item.waveStart >= existing.waveStart) {
      bySport.set(item.sport, item);
    }
  }
  return [...bySport.values()];
}

function mergeActivities(
  snapshot: Activity[],
  fromDb: Activity[],
): Activity[] {
  const byId = new Map<string, Activity>();
  for (const activity of fromDb) byId.set(activity.id, activity);
  for (const activity of snapshot) {
    if (!byId.has(activity.id)) byId.set(activity.id, activity);
  }
  return [...byId.values()].sort((a, b) =>
    b.startedAt.localeCompare(a.startedAt),
  );
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
 * Activities SoT write — `public.activities` only.
 * Never deletes rows (live sync can race ahead of the compete document).
 */
export async function persistCompeteActivities(
  db: Db,
  userId: string,
  state: CompeteState,
): Promise<void> {
  const clean = prepareCompeteStateForAccount(state);
  if (clean.activities.length === 0) return;

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

  if (activityRows.length === 0) return;
  const { error } = await db.from("activities").upsert(activityRows, {
    onConflict: "user_id,provider,external_id",
  });
  if (error) throw new Error(error.message);
}

/**
 * Dual-write prefs / ratings / settled weeks / enrollments / activities.
 * Caller must store the snapshot with activities stripped (`stripSnapshotActivities`).
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

  await persistCompeteActivities(db, userId, clean);

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
 * Overlay relational rows onto the snapshot document.
 * Activities: table is SoT; snapshot activities only appear during legacy flush.
 * Other collections: merge snapshot + DB (dual-write lag / fat leftovers).
 */
export async function hydrateCompeteCollections(
  db: Db,
  userId: string,
  state: CompeteState,
): Promise<CompeteState> {
  const [
    { data: profile, error: profileError },
    { data: prefs, error: prefsError },
    { data: ratingRows, error: ratingError },
    { data: resultRows, error: resultError },
    { data: freezeRows, error: freezeError },
    { data: enrollmentRows, error: enrollError },
    { data: activityRows, error: activityError },
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
    db
      .from("activities")
      .select(
        "compete_key, sport, started_at, distance_m, moving_sec, avg_hr, verified, provenance, disposition, disposition_reason, source_label, provider",
      )
      .eq("user_id", userId)
      .not("compete_key", "is", null)
      .order("started_at", { ascending: false })
      .limit(2000),
  ]);
  const firstError =
    profileError ??
    prefsError ??
    ratingError ??
    resultError ??
    freezeError ??
    enrollError ??
    activityError;
  if (firstError) throw new Error(firstError.message);

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
      // Empty freezes are meaningful once prefs exist.
      frozenPeriods: (freezeRows ?? []).map((row) => String(row.period_start)),
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

  const fromDbResults = (resultRows ?? []).flatMap((row) => {
    const sport = asSport(String(row.sport));
    const track =
      row.track === "verified" || row.track === "open" ? row.track : null;
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
      } satisfies PeriodResult,
    ];
  });
  if (fromDbResults.length > 0 || next.periodResults.length > 0) {
    next = {
      ...next,
      periodResults: mergePeriodResults(next.periodResults, fromDbResults),
    };
  }

  const fromDbEnrollments: WaveEnrollment[] = (enrollmentRows ?? []).flatMap(
    (row) => {
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
    },
  );
  if (fromDbEnrollments.length > 0 || next.enrollments.length > 0) {
    next = {
      ...next,
      enrollments: mergeEnrollments(next.enrollments, fromDbEnrollments),
    };
  }

  const fromDbActivities: Activity[] = (activityRows ?? []).flatMap((row) => {
    const sport = asSport(String(row.sport ?? ""));
    const competeKey = row.compete_key ? String(row.compete_key) : "";
    if (!sport || !competeKey) return [];
    const sourceLabel = String(row.source_label ?? row.provider ?? "manual");
    return [
      {
        id: competeKey,
        sport,
        startedAt: String(row.started_at),
        distanceM: Number(row.distance_m ?? 0),
        movingSec: Number(row.moving_sec ?? 0),
        avgHr: row.avg_hr == null ? null : Number(row.avg_hr),
        verified: Boolean(row.verified),
        source: asActivitySource(sourceLabel),
        provenance: asProvenance(row.provenance),
        disposition: asDisposition(row.disposition),
        dispositionReason: row.disposition_reason
          ? String(row.disposition_reason)
          : undefined,
      } satisfies Activity,
    ];
  });
  if (fromDbActivities.length > 0 || next.activities.length > 0) {
    next = {
      ...next,
      activities: mergeActivities(next.activities, fromDbActivities),
    };
  }

  return withDerivedPendingReveals(next);
}

/** Hydrate crewBoard from shared crew_week_fields when enrollment has crew_id. */
export async function hydrateCrewBoard(
  db: Db,
  _userId: string,
  state: CompeteState,
): Promise<CompeteState> {
  const pinned = state.enrollments.find((item) => item.crewId);
  if (!pinned?.crewId) {
    return state.crewBoard ? { ...state, crewBoard: null } : state;
  }

  const [{ data: field }, { data: crew }, { data: roster, error: rosterError }] =
    await Promise.all([
      db
        .from("crew_week_fields")
        .select("*")
        .eq("crew_id", pinned.crewId)
        .eq("wave_start", pinned.waveStart)
        .maybeSingle(),
      db.from("crews").select("name").eq("id", pinned.crewId).maybeSingle(),
      // SECURITY DEFINER — peer open Elo is not readable via sport_ratings RLS.
      db.rpc("crew_field_roster", { p_crew_id: pinned.crewId }),
    ]);
  if (!field) {
    return { ...state, crewBoard: null };
  }
  if (rosterError) {
    throw new Error(rosterError.message);
  }

  const memberIds = (field.member_ids as string[]) ?? [];
  const memberSet = new Set(memberIds);
  const members = (
    (roster ?? []) as {
      user_id: string;
      display_name: string;
      open_elo: number;
    }[]
  )
    .filter((row) => memberSet.has(String(row.user_id)))
    .map((row) => ({
      id: String(row.user_id),
      name: String(row.display_name || "Athlete"),
      elo: Number(row.open_elo) || 1000,
    }))
    .sort((a, b) => a.id.localeCompare(b.id));

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
      members,
      syntheticIds: (field.synthetic_ids as string[]) ?? [],
    },
  };
}
