import type { SupabaseClient } from "@supabase/supabase-js";
import {
  dispositionOf,
  getDemoCompeteState,
  freshHealthRatings,
  freshState,
  periodResultId,
  prepareCompeteStateForAccount,
  provenanceOf,
  PROVIDER_IDS,
  PROVIDERS,
  sanitizeCompeteStateForAccount,
  SPORT_IDS,
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
import { seatWeekFieldPin } from "./week-field";

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
  const provider = asProvider(label.toLowerCase());
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

/**
 * Activities SoT write — `public.activities` only.
 * Never deletes rows (live sync can race ahead of the compete document).
 */
async function accountActivityRows(
  db: Db,
  userId: string,
  state: CompeteState,
): Promise<Record<string, unknown>[]> {
  const clean = prepareCompeteStateForAccount(state);
  if (clean.activities.length === 0) return [];

  const { data: categories, error: categoryError } = await db
    .from("categories")
    .select("id, slug");
  if (categoryError) throw new Error(categoryError.message);
  const categoryBySlug = new Map(
    (categories ?? []).map((row) => [row.slug as string, row.id as string]),
  );

  // Older imports can use a different provider/external ID for the same
  // compete key. Preserve the existing database identity when saving them.
  const identities = new Map<string, { provider: string; externalId: string }>();
  for (let offset = 0; offset < clean.activities.length; offset += 100) {
    const keys = clean.activities.slice(offset, offset + 100).map(activity => activity.id);
    const { data, error } = await db.from("activities")
      .select("compete_key, provider, external_id")
      .eq("user_id", userId).in("compete_key", keys);
    if (error) throw new Error(error.message);
    for (const row of data ?? []) {
      identities.set(String(row.compete_key), { provider: String(row.provider), externalId: String(row.external_id) });
    }
  }

  const activityRows = clean.activities.flatMap((activity) => {
    const parts = splitCompeteKey(activity);
    const identity = identities.get(activity.id);
    const categoryId = categoryBySlug.get(activity.sport);
    if (!categoryId) return [];
    return [
      {
        user_id: userId,
        provider: identity?.provider ?? parts.provider,
        external_id: identity?.externalId ?? parts.externalId,
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

  return activityRows;
}

/**
 * Readiness is shared with fitness sync — upsert only, never delete-all.
 * Sync can race ahead of the compete document the same way activities do.
 */
function accountReadinessRows(userId: string, marks: ReadinessMark[]) {
  return marks.flatMap((mark) => {
    const provider = asProvider(String(mark.provider));
    return provider ? [{ user_id: userId, provider, external_id: mark.id, day: mark.day, score: mark.score }] : [];
  });

}

/** Persist the full signed-in compete account to relational tables only. */
export async function persistCompeteAccount(
  db: Db,
  userId: string,
  state: CompeteState,
  expectedUpdatedAt: string | null,
  authority?: { db: Db; receipts: number; computedAt: Date },
): Promise<string> {
  const clean = prepareCompeteStateForAccount(state);
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const activities = await accountActivityRows(db, userId, clean);
    const { data, error } = await (authority?.db ?? db).rpc(authority ? "save_compete_account_server" : "save_compete_account", {
      p_state: clean,
      p_activities: activities,
      p_readiness: accountReadinessRows(userId, clean.readiness),
      p_expected_updated_at: expectedUpdatedAt,
      ...(authority ? { p_user_id: userId, p_expected_receipts: authority.receipts, p_computed_at: authority.computedAt.toISOString() } : {}),
    });
    if (!error) {
      if (typeof data !== "string") throw new Error("account_not_saved");
      return data;
    }
    // A concurrent sync can insert this compete key after our lookup. The
    // failed RPC is atomic; re-read the identity and retry the same revision.
    if (attempt === 0 && error.code === "23505" && error.message.includes("activities_user_compete_key_uidx")) continue;
    throw new Error(error.message);
  }
  throw new Error("account_not_saved");
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
    dailyHealthResult,
    { data: connectionRows },
    milestoneResult,
    effortScoreEvents,
    attempts,
  ] = await Promise.all([
    db
      .from("profiles")
      .select("display_name, city, primary_sport, avatar_url, lifetime_overtakes")
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
        "compete_key, sport, started_at, distance_m, moving_sec, avg_hr, verified, provenance, disposition, disposition_reason, source_label, provider, summary_polyline, detailed_polyline, route_bounds, elevation_gain_m",
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
    db.from("daily_health_readings").select("*").eq("user_id", userId).order("day", { ascending: false }).limit(365),
    db.from("fitness_connections").select("provider, status").eq("user_id", userId),
    db.from("effort_milestones").select("*").eq("user_id", userId).order("period_start", { ascending: false }).limit(1000),
    loadEffortScoreEvents(db, userId),
    loadAllRecordAttempts(db, userId),
  ]);

  if (milestoneResult.error) throw new Error("milestones_unavailable");
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
      lifetimeOvertakes: Math.max(
        0,
        Number(profile.lifetime_overtakes ?? 0) || 0,
      ),
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
    units: prefs.units === "metric" ? "metric" : "us",
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
        // PostgREST may return +00:00 while field pins use ISO Z timestamps.
        // Keep equivalent bounds identical so a read does not create a new revision.
        waveStart: new Date(String(row.wave_start)).toISOString(),
        weekEnd: new Date(String(row.week_end)).toISOString(),
        capacity: Number(row.capacity),
        peerIds: (row.peer_ids as string[]) ?? [],
        syntheticIds: (row.synthetic_ids as string[]) ?? [],
        autoEnrollNext: Boolean(row.auto_enroll_next),
        crewId: row.crew_id ? String(row.crew_id) : null,
        fieldId: row.field_id ? String(row.field_id) : null,
        awaitingField: true,
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
        summaryPolyline: row.summary_polyline == null ? null : String(row.summary_polyline),
        detailedPolyline: row.detailed_polyline == null ? null : String(row.detailed_polyline),
        routeBounds: Array.isArray(row.route_bounds) && row.route_bounds.length === 4 ? row.route_bounds.map(Number) as [number, number, number, number] : null,
        elevationGainM: row.elevation_gain_m == null ? null : Number(row.elevation_gain_m),
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
    requiresCanonicalFields: true,
    periodResults,
    recordAttempts: attempts,
    effortScoreEvents,
    effortMilestones: (milestoneResult.data ?? []).map((r) => ({ sport: r.sport, track: r.track, periodStart: new Date(r.period_start).toISOString(), periodEnd: new Date(r.period_end).toISOString(), step: Number(r.step), earned: Number(r.earned) })),
    enrollments,
    activities,
    sleepNights,
    healthRatings,
    healthResults,
    duels,
    readiness,
    dailyHealth: [...(dailyHealthResult.data ?? []).map(r => ({ provider: r.provider, day: String(r.day).slice(0,10), steps: r.steps, restingHr: r.resting_hr, hrv: r.hrv })), ...(userId === "11111111-1111-4111-8111-111111111111" ? getDemoCompeteState(userId)?.dailyHealth ?? [] : [])],
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

/** Seat/read every enrolled sport; keep Crew's preferred board for existing consumers. */
export async function hydrateFieldBoard(
  db: Db,
  userId: string,
  state: CompeteState,
  now: Date = new Date(),
): Promise<CompeteState> {
  const preferred = state.enrollments.find(isCrewEnrollment) ??
    state.enrollments.find(item => item.sport === state.primary) ?? state.enrollments[0];
  if (!preferred) return state.crewBoard ? { ...state, crewBoard: null } : state;

  const pins = await Promise.all(state.enrollments.map(async enrollment => {
    if (Date.parse(enrollment.waveStart) > now.getTime()) return null;
    const pin = await seatWeekFieldPin(db, {
          sport: enrollment.sport,
          waveStart: enrollment.waveStart,
          weekEnd: enrollment.weekEnd,
          capacity: enrollment.capacity,
          crewId: enrollment.crewId,
          syntheticIds: enrollment.syntheticIds,
        });
    if (pin.sport !== enrollment.sport || Date.parse(pin.waveStart) !== Date.parse(enrollment.waveStart) || Date.parse(pin.weekEnd) !== Date.parse(enrollment.weekEnd) || !pin.memberIds.includes(userId)) {
      throw new Error("field_assignment_mismatch");
    }
    return pin ? { ...pin, waveStart: new Date(pin.waveStart).toISOString(), weekEnd: new Date(pin.weekEnd).toISOString() } : null;
  }));

  return {
    ...state,
    crewBoard: pins[state.enrollments.indexOf(preferred)] ?? null,
    enrollments: state.enrollments.map((enrollment, index) => {
      const pin = pins[index];
      const { fieldBoard: _previous, ...base } = enrollment;
      return pin ? {
        ...base,
        fieldBoard: pin,
        crewId: pin.crewId === "solo" ? null : pin.crewId,
        capacity: pin.capacity,
        peerIds: pin.memberIds.filter(id => id !== userId),
        syntheticIds: pin.syntheticIds,
        waveStart: pin.waveStart,
        weekEnd: pin.weekEnd,
        fieldId: pin.fieldId,
        awaitingField: false,
      } : { ...base, awaitingField: true, peerIds: [], syntheticIds: [] };
    }),
  };
}

/** Resolve each closing field before scoring; never settle an invented sparse-pool roster. */
export async function settleAccountFields(db: Db, userId: string, state: CompeteState, now = new Date(), acceptedFacts = false): Promise<CompeteState> {
  const { settleSportRound, rollClock, weeklyWaveWindowAt, settleSleepWeeks, weekEndAfter } = await import("@fitness-battle/shared");
  let next = state;
  if (acceptedFacts) {
    for (let guard = 0; guard < 12; guard++) {
      const sleep = next.healthRatings.find(r => r.metric === "sleep" && r.optedIn);
      if (!sleep) break;
      const end = weekEndAfter(new Date(sleep.lockPeriod));
      if (end > now) break;
      const { data, error } = await db.rpc("competition_own_facts", { p_sport: "sleep", p_start: sleep.lockPeriod, p_end: end.toISOString() });
      if (error || !Array.isArray(data)) throw new Error("accepted_facts_unavailable");
      const nights = next.sleepNights;
      const settled = settleSleepWeeks({ ...next, sleepNights: data.map(row => ({ ...row, id: row.night_id, durationMin: Number(row.duration_min), deepMin: row.deep_min, remMin: row.rem_min, lightMin: row.light_min, awakeMin: row.awake_min })) }, end, now.toISOString());
      next = { ...settled, sleepNights: nights };
    }
  }
  if (acceptedFacts) {
    const sleep = next.healthRatings.find(r => r.metric === "sleep" && r.optedIn);
    if (sleep && weekEndAfter(new Date(sleep.lockPeriod)) <= now) {
      const window = weeklyWaveWindowAt(now);
      next = { ...next, healthRatings: next.healthRatings.map(r => r.metric === "sleep" ? { ...r, lockPeriod: window.waveStart.toISOString(), lockElo: r.elo, optedIn: r.autoEnrollNext } : r) };
    }
  }
  for (let guard = 0; guard < 12; guard++) {
    next = await hydrateFieldBoard(db, userId, next, now);
    if (acceptedFacts) {
      const enrollments = await Promise.all(next.enrollments.map(async enrollment => {
        if (Date.parse(enrollment.weekEnd) > now.getTime()) return enrollment;
        const { data, error } = await db.rpc("competition_own_facts", { p_sport: enrollment.sport, p_start: enrollment.waveStart, p_end: enrollment.weekEnd });
        if (error || !Array.isArray(data)) throw new Error("accepted_facts_unavailable");
        return { ...enrollment, scoringActivities: data.map(row => ({
          id: row.compete_key, sport: row.sport, startedAt: row.started_at, distanceM: Number(row.distance_m ?? 0), movingSec: Number(row.moving_sec ?? 0),
          avgHr: row.avg_hr == null ? null : Number(row.avg_hr), verified: row.verified, provenance: row.provenance, disposition: row.disposition,
          source: row.source_label ?? row.provider,
        })) };
      }));
      next = { ...next, enrollments };
    }
    const due = next.enrollments.find(row => Date.parse(row.weekEnd) <= now.getTime());
    if (!due) return rollClock(next, now);
    next = settleSportRound(next, due.sport, now);
  }
  // Retain the engine's bounded catch-up policy after a long absence. Skipped
  // weeks receive no invented result; renewing sports resolve this week's field.
  const window = weeklyWaveWindowAt(now);
  const overdue = new Set(next.enrollments.filter(e => Date.parse(e.weekEnd) <= now.getTime()).map(e => e.sport));
  const stopped = new Set(next.enrollments.filter(e => Date.parse(e.weekEnd) <= now.getTime() && !e.autoEnrollNext).map(e => e.sport));
  next = { ...next, crewBoard: null,
    enrollments: next.enrollments.filter(e => !stopped.has(e.sport)).map(e => Date.parse(e.weekEnd) <= now.getTime()
      ? { ...e, waveStart: window.waveStart.toISOString(), weekEnd: window.weekEnd.toISOString(), peerIds: [], syntheticIds: [], fieldId: null, fieldBoard: undefined, awaitingField: true } : e),
    ratings: next.ratings.map(r => stopped.has(r.sport) ? { ...r, optedIn: false } : overdue.has(r.sport) ? { ...r, lockOpen: r.openElo, lockVerified: r.verifiedElo, lockPeriod: window.waveStart.toISOString() } : r),
  };
  return rollClock(await hydrateFieldBoard(db, userId, next, now), now);
}

/** A device may cross Sunday close using an old peer snapshot. Recompute those
 * closing rounds against the stored registration and fresh database field. */
export async function reconcileAccountSettlement(db: Db, userId: string, incoming: CompeteState, stored: CompeteState | null, now = new Date()): Promise<CompeteState> {
  const due = stored?.enrollments.filter(e => Date.parse(e.weekEnd) <= now.getTime()) ?? [];
  if (!stored || !due.length) return incoming;
  const sports = new Set(due.map(e => e.sport));
  const closing = {
    ...incoming,
    requiresCanonicalFields: true,
    enrollments: [...incoming.enrollments.filter(e => !sports.has(e.sport)), ...due.map(e => ({ ...e, awaitingField: true }))],
    ratings: incoming.ratings.map(r => sports.has(r.sport) ? stored.ratings.find(old => old.sport === r.sport)! : r),
    effortMilestones: [...(incoming.effortMilestones ?? []).filter(r => !sports.has(r.sport)), ...(stored.effortMilestones ?? []).filter(r => sports.has(r.sport))],
    periodResults: incoming.periodResults.filter(r => !due.some(e => e.sport === r.sport && e.waveStart === r.periodStart)),
  };
  let settled = await settleAccountFields(db, userId, closing, now);
  for (const old of due) {
    const requested = incoming.enrollments.find(e => e.sport === old.sport);
    const current = settled.enrollments.find(e => e.sport === old.sport);
    if (!requested && current) {
      if (Date.parse(current.waveStart) <= now.getTime()) throw new Error("week_still_open");
      settled = { ...settled, enrollments: settled.enrollments.filter(e => e.sport !== old.sport), ratings: settled.ratings.map(r => r.sport === old.sport ? { ...r, optedIn: false } : r) };
    } else if (requested && current) {
      settled = { ...settled, enrollments: settled.enrollments.map(e => e.sport === old.sport ? { ...e, autoEnrollNext: requested.autoEnrollNext } : e) };
    } else if (requested && !current && requested.waveStart !== old.waveStart) {
      // A previously stopped sport can be registered again after its old close.
      settled = { ...settled, enrollments: [...settled.enrollments, requested], ratings: settled.ratings.map(r => r.sport === old.sport ? { ...r, optedIn: true, lockOpen: r.openElo, lockVerified: r.verifiedElo, lockPeriod: requested.waveStart } : r) };
    }
  }
  return withDerivedPendingReveals(settled);
}

function isCrewEnrollment(enrollment: WaveEnrollment): boolean {
  return Boolean(enrollment.crewId && enrollment.crewId !== "solo" && !enrollment.crewId.startsWith("field:"));
}

/** Keyset-independent stable pagination retains old records beyond the activity window. */
async function loadAllRecordAttempts(db: Db, userId: string): Promise<NonNullable<CompeteState["recordAttempts"]>> {
  const attempts: NonNullable<CompeteState["recordAttempts"]> = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await db.from("personal_record_attempts").select("*").eq("user_id", userId).order("started_at").order("activity_id").order("distance_id").range(offset, offset + 999);
    if (error) throw new Error("record_history_unavailable");
    attempts.push(...(data ?? []).map(r => ({activityId:r.activity_key,sport:r.sport,distanceId:r.distance_id,startedAt:r.started_at,seconds:Number(r.seconds),source:r.source,verified:r.verified})));
    if ((data?.length ?? 0) < 1000) return attempts;
  }
}

/** Append-only score history; stable pagination keeps same-time events distinct. */
export async function loadEffortScoreEvents(db: Db, userId: string): Promise<NonNullable<CompeteState["effortScoreEvents"]>> {
  const events: NonNullable<CompeteState["effortScoreEvents"]> = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await db.from("effort_score_events").select("*").eq("user_id", userId)
      .order("occurred_at").order("id").range(offset, offset + 999);
    if (error) throw new Error("score_history_unavailable");
    events.push(...(data ?? []).map(row => ({ id: String(row.id), sport: row.sport, track: row.track,
      occurredAt: row.occurred_at, scoreBefore: Number(row.score_before), scoreAfter: Number(row.score_after) })));
    if ((data?.length ?? 0) < 1000) return events;
  }
}
