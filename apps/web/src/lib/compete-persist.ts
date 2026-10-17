import type { SupabaseClient } from "@supabase/supabase-js";
import {
  dispositionOf,
  freshHealthRatings,
  freshState,
  periodResultId,
  prepareCompeteStateForAccount,
  provenanceOf,
  PROVIDER_IDS,
  PROVIDERS,
  sanitizeCompeteStateForAccount,
  SPORT_IDS,
  sumCrewWindow,
  withAccountEloBaseline,
  withDerivedPendingReveals,
  type Activity,
  type CompeteState,
  type Duel,
  type GoalDistance,
  type HealthMetricId,
  type HealthPeriodResult,
  type HealthRating,
  type LinkStatus,
  type PeriodResult,
  type ProviderId,
  type Rating,
  type ReadinessMark,
  type SleepNight,
  type SportId,
  type WaveEnrollment,
} from "@fitness-battle/shared";

type Db = SupabaseClient;

function asSport(value: string): SportId | null {
  return (SPORT_IDS as readonly string[]).includes(value)
    ? (value as SportId)
    : null;
}

function asProvider(value: string): ProviderId | null {
  return (PROVIDER_IDS as readonly string[]).includes(value)
    ? (value as ProviderId)
    : null;
}

function asActivitySource(label: string): Activity["source"] {
  const provider = asProvider(label);
  if (provider) return provider;
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

function asLinkStatus(value: string): LinkStatus {
  if (value === "connected" || value === "stub" || value === "disconnected") {
    return value;
  }
  return "disconnected";
}

const CLOUD_PROVIDERS = new Set<string>(PROVIDER_IDS);

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

/** Replace compete-owned rows for a user (document SoT for that table). */
async function replaceRows(
  db: Db,
  table: string,
  userId: string,
  rows: Record<string, unknown>[],
): Promise<void> {
  const { error: clearError } = await db.from(table).delete().eq("user_id", userId);
  if (clearError) throw new Error(clearError.message);
  if (rows.length === 0) return;
  const { error } = await db.from(table).insert(rows);
  if (error) throw new Error(error.message);
}

/**
 * Activities SoT write — `public.activities` only.
 * Never deletes rows (live sync can race ahead of the compete document).
 */
async function persistCompeteActivities(
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
 * Readiness is shared with fitness sync — upsert only, never delete-all.
 * Sync can race ahead of the compete document the same way activities do.
 */
async function persistCompeteReadiness(
  db: Db,
  userId: string,
  marks: ReadinessMark[],
): Promise<void> {
  const rows = marks.flatMap((mark) => {
    const provider = asProvider(String(mark.provider));
    if (!provider) return [];
    return [
      {
        user_id: userId,
        provider,
        external_id: mark.id,
        day: mark.day,
        score: mark.score,
      },
    ];
  });
  if (rows.length === 0) return;
  const { error } = await db.from("readiness_marks").upsert(rows, {
    onConflict: "user_id,provider,external_id",
  });
  if (error) throw new Error(error.message);
}

/** Persist the full signed-in compete account to relational tables only. */
export async function persistCompeteAccount(
  db: Db,
  userId: string,
  state: CompeteState,
): Promise<string> {
  const clean = prepareCompeteStateForAccount(state);
  const updatedAt = new Date().toISOString();

  const { error: profileError, data } = await db
    .from("profiles")
    .update({
      display_name: clean.name.slice(0, 80) || "Athlete",
      city: clean.city.slice(0, 80),
      primary_sport: clean.primary,
      avatar_url: clean.avatarUrl ?? null,
      updated_at: updatedAt,
    })
    .eq("id", userId)
    .select("id");
  if (profileError || !data || data.length === 0) {
    const { error: upsertError } = await db.from("profiles").upsert({
      id: userId,
      display_name: clean.name.slice(0, 80) || "Athlete",
      city: clean.city.slice(0, 80),
      primary_sport: clean.primary,
      avatar_url: clean.avatarUrl ?? null,
      updated_at: updatedAt,
    });
    if (upsertError) throw new Error(upsertError.message || profileError?.message);
  }

  const focusFamily = clean.focus.family;
  const focusId = clean.focus.id;
  const { error: prefsError } = await db.from("athlete_prefs").upsert({
    user_id: userId,
    freezes_left: clean.freezesLeft,
    calibrated: clean.calibrated,
    onboarding_completed: clean.onboardingCompleted,
    lesson_done_on: clean.lessonDoneOn,
    training_goal_distance: clean.trainingGoal?.distance ?? null,
    training_goal_deadline: clean.trainingGoal?.deadline ?? null,
    clock_period_start: clean.clock.periodStart,
    focus_family: focusFamily,
    focus_id: focusId,
    updated_at: updatedAt,
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

  await replaceRows(
    db,
    "period_freezes",
    userId,
    clean.frozenPeriods.map((periodStart) => ({
      user_id: userId,
      period_start: periodStart,
    })),
  );

  await persistCompeteActivities(db, userId, clean);

  await replaceRows(
    db,
    "wave_enrollments",
    userId,
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

  await replaceRows(
    db,
    "sleep_nights",
    userId,
    clean.sleepNights.map((night) => ({
      user_id: userId,
      night_id: night.id,
      day: night.day,
      score: night.score,
      duration_min: night.durationMin,
      efficiency: night.efficiency,
      deep_min: night.deepMin,
      rem_min: night.remMin,
      light_min: night.lightMin,
      awake_min: night.awakeMin,
      source: night.source,
      verified: night.verified,
    })),
  );

  await replaceRows(
    db,
    "health_ratings",
    userId,
    clean.healthRatings.map((rating) => ({
      user_id: userId,
      metric: rating.metric,
      elo: rating.elo,
      opted_in: rating.optedIn,
      lock_elo: rating.lockElo,
      lock_period: rating.lockPeriod,
      auto_enroll_next: rating.autoEnrollNext,
    })),
  );

  await replaceRows(
    db,
    "health_period_results",
    userId,
    clean.healthResults.map((row) => ({
      user_id: userId,
      result_id: row.id,
      metric: row.metric,
      period_start: row.periodStart,
      period_end: row.periodEnd,
      place: row.place,
      field_size: row.fieldSize,
      score: row.score,
      elo_before: row.eloBefore,
      elo_after: row.eloAfter,
      settled_at: row.settledAt,
    })),
  );

  await replaceRows(
    db,
    "compete_duels",
    userId,
    clean.duels.map((duel) => ({
      user_id: userId,
      duel_id: duel.id,
      sport: duel.sport,
      period_start: duel.periodStart,
      rival_id: duel.rivalId,
      rival_name: duel.rivalName,
      rival_elo: duel.rivalElo,
      source: duel.source,
    })),
  );

  await persistCompeteReadiness(db, userId, clean.readiness);

  return updatedAt;
}

/** Load signed-in compete state entirely from relational tables. */
export async function loadCompeteAccount(
  db: Db,
  userId: string,
): Promise<{ state: CompeteState; updatedAt: string } | null> {
  const { data: prefs, error: prefsError } = await db
    .from("athlete_prefs")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (prefsError) throw new Error(prefsError.message);

  if (!prefs) return null;

  const [
    { data: profile },
    { data: ratingRows },
    { data: resultRows },
    { data: freezeRows },
    { data: enrollmentRows },
    { data: activityRows },
    { data: sleepRows },
    { data: healthRatingRows },
    { data: healthResultRows },
    { data: duelRows },
    { data: readinessRows },
    { data: connectionRows },
  ] = await Promise.all([
    db
      .from("profiles")
      .select("display_name, city, primary_sport, avatar_url")
      .eq("id", userId)
      .maybeSingle(),
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
    db.from("sleep_nights").select("*").eq("user_id", userId).order("day", {
      ascending: false,
    }),
    db.from("health_ratings").select("*").eq("user_id", userId),
    db
      .from("health_period_results")
      .select("*")
      .eq("user_id", userId)
      .order("period_start", { ascending: false }),
    db.from("compete_duels").select("*").eq("user_id", userId),
    db.from("readiness_marks").select("*").eq("user_id", userId),
    db.from("fitness_connections").select("provider, status").eq("user_id", userId),
  ]);

  const periodStart =
    prefs.clock_period_start != null
      ? String(prefs.clock_period_start)
      : freshState().clock.periodStart;

  // Account documents always start from the signed-in baseline (1000), not guest 0.
  let state = withAccountEloBaseline(freshState(new Date(periodStart)));
  state = {
    ...state,
    clock: { kind: "weekly", periodStart },
  };

  if (profile) {
    const primary = asSport(String(profile.primary_sport ?? ""));
    state = {
      ...state,
      name: String(profile.display_name ?? state.name).slice(0, 80) || state.name,
      city: String(profile.city ?? state.city).slice(0, 80),
      primary: primary ?? state.primary,
      avatarUrl: profile.avatar_url ? String(profile.avatar_url) : null,
    };
  }

  const distance = prefs.training_goal_distance as GoalDistance | null;
  const focusFamily =
    prefs.focus_family === "health" || prefs.focus_family === "sport"
      ? prefs.focus_family
      : "sport";
  const focusId = String(prefs.focus_id ?? state.primary);
  state = {
    ...state,
    freezesLeft: Number(prefs.freezes_left ?? state.freezesLeft),
    calibrated: Boolean(prefs.calibrated),
    onboardingCompleted: Boolean(prefs.onboarding_completed),
    lessonDoneOn: prefs.lesson_done_on ? String(prefs.lesson_done_on) : null,
    trainingGoal:
      distance && prefs.training_goal_deadline
        ? { distance, deadline: String(prefs.training_goal_deadline) }
        : null,
    focus:
      focusFamily === "health"
        ? { family: "health", id: focusId as HealthMetricId }
        : { family: "sport", id: (asSport(focusId) ?? state.primary) },
    frozenPeriods: (freezeRows ?? []).map((row) => String(row.period_start)),
  };

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
    state = {
      ...state,
      ratings: state.ratings.map((rating) => bySport.get(rating.sport) ?? rating),
    };
  }

  const periodResults: PeriodResult[] = (resultRows ?? []).flatMap((row) => {
    const sport = asSport(String(row.sport));
    const track =
      row.track === "verified" || row.track === "open" ? row.track : null;
    if (!sport || !track) return [];
    const start = String(row.period_start);
    return [
      {
        id: periodResultId(start, sport, track),
        periodStart: start,
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
        acknowledgedAt: row.acknowledged_at ? String(row.acknowledged_at) : null,
      },
    ];
  });

  const enrollments: WaveEnrollment[] = (enrollmentRows ?? []).flatMap((row) => {
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

  const activities: Activity[] = (activityRows ?? []).flatMap((row) => {
    const sport = asSport(String(row.sport ?? ""));
    const competeKey = row.compete_key ? String(row.compete_key) : "";
    if (!sport || !competeKey) return [];
    return [
      {
        id: competeKey,
        sport,
        startedAt: String(row.started_at),
        distanceM: Number(row.distance_m ?? 0),
        movingSec: Number(row.moving_sec ?? 0),
        avgHr: row.avg_hr == null ? null : Number(row.avg_hr),
        verified: Boolean(row.verified),
        source: asActivitySource(String(row.source_label ?? row.provider ?? "manual")),
        provenance: asProvenance(row.provenance),
        disposition: asDisposition(row.disposition),
        dispositionReason: row.disposition_reason
          ? String(row.disposition_reason)
          : undefined,
      },
    ];
  });

  const sleepNights: SleepNight[] = (sleepRows ?? []).map((row) => ({
    id: String(row.night_id),
    metric: "sleep" as const,
    day: String(row.day).slice(0, 10),
    score: Number(row.score),
    durationMin: Number(row.duration_min ?? 0),
    efficiency: row.efficiency == null ? null : Number(row.efficiency),
    deepMin: row.deep_min == null ? null : Number(row.deep_min),
    remMin: row.rem_min == null ? null : Number(row.rem_min),
    lightMin: row.light_min == null ? null : Number(row.light_min),
    awakeMin: row.awake_min == null ? null : Number(row.awake_min),
    source: asActivitySource(String(row.source)) as SleepNight["source"],
    verified: Boolean(row.verified),
  }));

  const healthFromDb = (healthRatingRows ?? []).flatMap((row) => {
    if (row.metric !== "sleep") return [];
    return [
      {
        metric: "sleep" as const,
        elo: Number(row.elo),
        optedIn: Boolean(row.opted_in),
        lockElo: Number(row.lock_elo),
        lockPeriod: String(row.lock_period),
        autoEnrollNext: Boolean(row.auto_enroll_next),
      } satisfies HealthRating,
    ];
  });
  const healthRatings =
    healthFromDb.length > 0 ? healthFromDb : freshHealthRatings(periodStart);

  const healthResults: HealthPeriodResult[] = (healthResultRows ?? []).flatMap(
    (row) => {
      if (row.metric !== "sleep") return [];
      return [
        {
          id: String(row.result_id),
          metric: "sleep",
          periodStart: String(row.period_start),
          periodEnd: String(row.period_end),
          place: Number(row.place),
          fieldSize: Number(row.field_size),
          score: Number(row.score),
          eloBefore: Number(row.elo_before),
          eloAfter: Number(row.elo_after),
          settledAt: String(row.settled_at),
        },
      ];
    },
  );

  const duels: Duel[] = (duelRows ?? []).flatMap((row) => {
    const sport = asSport(String(row.sport));
    if (!sport) return [];
    if (row.source !== "auto" && row.source !== "invite") return [];
    return [
      {
        id: String(row.duel_id),
        sport,
        periodStart: String(row.period_start),
        rivalId: String(row.rival_id),
        rivalName: String(row.rival_name),
        rivalElo: Number(row.rival_elo),
        source: row.source,
      },
    ];
  });

  const readiness: ReadinessMark[] = (readinessRows ?? []).flatMap((row) => {
    const provider = asProvider(String(row.provider));
    if (!provider) return [];
    return [
      {
        id: String(row.external_id),
        provider,
        day: String(row.day).slice(0, 10),
        score: Number(row.score),
      },
    ];
  });

  const statusByProvider = new Map(
    (connectionRows ?? []).map((row) => [
      String(row.provider),
      asLinkStatus(String(row.status)),
    ]),
  );
  const links = PROVIDERS.map((provider) => {
    const status = statusByProvider.get(provider.id) ?? "disconnected";
    return {
      provider: provider.id,
      linked: status === "connected" || status === "stub",
      status,
    };
  });

  state = withDerivedPendingReveals({
    ...state,
    periodResults,
    enrollments,
    activities,
    sleepNights,
    healthRatings,
    healthResults,
    duels,
    readiness,
    links,
    demoNow: null,
    crewBoard: null,
    pendingRevealIds: [],
  });

  return {
    state: sanitizeCompeteStateForAccount(state),
    updatedAt: String(prefs.updated_at ?? new Date().toISOString()),
  };
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

  const [{ data: field }, { data: crew }, { data: roster, error: rosterError }, { data: entries, error: entriesError }] =
    await Promise.all([
      db
        .from("crew_week_fields")
        .select("*")
        .eq("crew_id", pinned.crewId)
        .eq("wave_start", pinned.waveStart)
        .maybeSingle(),
      db.from("crews").select("name").eq("id", pinned.crewId).maybeSingle(),
      db.rpc("crew_field_roster", { p_crew_id: pinned.crewId }),
      db
        .from("crew_entries")
        .select("user_id, distance_m, moving_sec, started_at, sport")
        .eq("crew_id", pinned.crewId)
        .eq("disposition", "counted"),
    ]);
  if (!field) {
    return { ...state, crewBoard: null };
  }
  if (rosterError) {
    throw new Error(rosterError.message);
  }
  if (entriesError) {
    throw new Error(entriesError.message);
  }

  const memberIds = (field.member_ids as string[]) ?? [];
  const memberSet = new Set(memberIds);
  const volume = sumCrewWindow(
    (entries ?? [])
      .filter((entry) => String(entry.sport) === String(field.sport))
      .map((entry) => ({
        userId: String(entry.user_id),
        distanceM: Number(entry.distance_m) || 0,
        movingSec: Number(entry.moving_sec) || 0,
        startedAt: String(entry.started_at),
      })),
    String(field.wave_start),
    String(field.week_end),
  );
  const members = (
    (roster ?? []) as {
      user_id: string;
      display_name: string;
      open_elo: number;
    }[]
  )
    .filter((row) => memberSet.has(String(row.user_id)))
    .map((row) => {
      const week = volume.get(String(row.user_id));
      return {
        id: String(row.user_id),
        name: String(row.display_name || "Athlete"),
        elo: Number(row.open_elo) || 1000,
        distanceM: week?.distanceM ?? 0,
        movingSec: week?.movingSec ?? 0,
      };
    })
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
