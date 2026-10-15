import type { SupabaseClient } from "@supabase/supabase-js";
import {
  dispositionOf,
  freshState,
  migrateCompeteState,
  pendingRevealIdsFromResults,
  provenanceOf,
  rollClock,
  sanitizeCompeteStateForAccount,
  shrinkCompeteSnapshot,
  type Activity,
  type CompeteState,
  type PeriodResult,
  type ProviderId,
  type ScoreTrack,
  type SportId,
} from "@fitness-battle/shared";
import type { WaveEnrollment } from "@fitness-battle/shared/matching";

type Db = SupabaseClient;
type Enrollment = WaveEnrollment;

const CLOUD_PROVIDERS = new Set<string>([
  "strava",
  "garmin",
  "apple_health",
  "google_health",
  "whoop",
  "oura",
]);

function asSport(value: string): SportId {
  return value as SportId;
}

function splitCompeteKey(
  activity: Activity,
): { provider: string; externalId: string; sourceLabel: string; competeKey: string } {
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

function metricValue(activity: Activity): number {
  if (activity.sport === "strength") return activity.movingSec;
  return activity.distanceM;
}

/** Dual-write relational rows from a CompeteState document. */
export async function persistCompeteRelational(
  db: Db,
  userId: string,
  state: CompeteState,
): Promise<void> {
  const clean = sanitizeCompeteStateForAccount(state);

  await db.from("profiles").upsert({
    id: userId,
    display_name: clean.name.slice(0, 80) || "Athlete",
    city: clean.city.slice(0, 80),
    primary_sport: clean.primary,
    updated_at: new Date().toISOString(),
  });

  await db.from("athlete_prefs").upsert({
    user_id: userId,
    freezes_left: clean.freezesLeft,
    calibrated: clean.calibrated,
    onboarding_completed: clean.onboardingCompleted,
    lesson_done_on: clean.lessonDoneOn,
    training_goal_distance: clean.trainingGoal?.distance ?? null,
    training_goal_deadline: clean.trainingGoal?.deadline ?? null,
    focus: clean.focus,
    updated_at: new Date().toISOString(),
  });

  if (clean.ratings.length > 0) {
    await db.from("sport_ratings").upsert(
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
  }

  // Replace open enrollments for this user with the current set.
  await db.from("wave_enrollments").delete().eq("user_id", userId);
  if (clean.enrollments.length > 0) {
    await db.from("wave_enrollments").insert(
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
  }

  if (clean.periodResults.length > 0) {
    await db.from("period_results").upsert(
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
  }

  await db.from("period_freezes").delete().eq("user_id", userId);
  if (clean.frozenPeriods.length > 0) {
    await db.from("period_freezes").insert(
      clean.frozenPeriods.map((periodStart) => ({
        user_id: userId,
        period_start: periodStart,
      })),
    );
  }

  const { data: categories } = await db.from("categories").select("id, slug");
  const categoryBySlug = new Map(
    (categories ?? []).map((row) => [row.slug as string, row.id as string]),
  );

  // Upsert activities by compete_key; delete orphans that are no longer in state.
  const keys = new Set<string>();
  for (const activity of clean.activities) {
    const parts = splitCompeteKey(activity);
    keys.add(parts.competeKey);
    const categoryId = categoryBySlug.get(activity.sport);
    if (!categoryId) continue;
    await db.from("activities").upsert(
      {
        user_id: userId,
        provider: parts.provider,
        external_id: parts.externalId,
        category_id: categoryId,
        started_at: activity.startedAt,
        metric_value: metricValue(activity),
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
      { onConflict: "user_id,provider,external_id" },
    );
  }

  const { data: existingActs } = await db
    .from("activities")
    .select("id, compete_key")
    .eq("user_id", userId);
  const stale = (existingActs ?? []).filter(
    (row) => row.compete_key && !keys.has(row.compete_key as string),
  );
  if (stale.length > 0) {
    await db
      .from("activities")
      .delete()
      .eq("user_id", userId)
      .in(
        "id",
        stale.map((row) => row.id as string),
      );
  }

  // Links → fitness_connections (status only; tokens stay private).
  for (const link of clean.links) {
    await db.from("fitness_connections").upsert({
      user_id: userId,
      provider: link.provider,
      status: link.status === "connected" ? "connected" : link.status === "stub" ? "stub" : "disconnected",
      updated_at: new Date().toISOString(),
    });
  }

  await db.from("sleep_nights").delete().eq("user_id", userId);
  if (clean.sleepNights.length > 0) {
    await db.from("sleep_nights").insert(
      clean.sleepNights.map((night) => ({
        user_id: userId,
        id: night.id,
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
  }

  if (clean.healthRatings.length > 0) {
    await db.from("health_ratings").upsert(
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
  }

  await db.from("health_period_results").delete().eq("user_id", userId);
  if (clean.healthResults.length > 0) {
    await db.from("health_period_results").insert(
      clean.healthResults.map((row) => ({
        user_id: userId,
        id: row.id,
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
  }

  await db.from("duels").delete().eq("user_id", userId);
  if (clean.duels.length > 0) {
    await db.from("duels").insert(
      clean.duels.map((duel) => ({
        user_id: userId,
        id: duel.id,
        sport: duel.sport,
        period_start: duel.periodStart,
        rival_id: duel.rivalId,
        rival_name: duel.rivalName,
        rival_elo: duel.rivalElo,
        source: duel.source,
      })),
    );
  }

  // Readiness marks already have their own upsert path from sync; mirror blob marks.
  for (const mark of clean.readiness) {
    await db.from("readiness_marks").upsert(
      {
        user_id: userId,
        provider: mark.provider,
        external_id: mark.id,
        day: mark.day,
        score: mark.score,
      },
      { onConflict: "user_id,provider,external_id" },
    );
  }
}

function activityFromRow(row: Record<string, unknown>): Activity {
  const sourceLabel = String(row.source_label ?? row.provider ?? "manual");
  const source = (
    CLOUD_PROVIDERS.has(sourceLabel) ? sourceLabel : sourceLabel === "history" ? "history" : "manual"
  ) as Activity["source"];
  return {
    id: String(row.compete_key ?? `${row.provider}-${row.external_id}`),
    sport: asSport(String(row.sport ?? "running")),
    startedAt: String(row.started_at),
    distanceM: Number(row.distance_m ?? row.metric_value ?? 0),
    movingSec: Number(row.moving_sec ?? 0),
    avgHr: row.avg_hr == null ? null : Number(row.avg_hr),
    verified: Boolean(row.verified),
    source,
    provenance: (row.provenance as Activity["provenance"]) ?? undefined,
    disposition: (row.disposition as Activity["disposition"]) ?? undefined,
    dispositionReason: (row.disposition_reason as string | undefined) ?? undefined,
  };
}

function periodResultFromRow(row: Record<string, unknown>): PeriodResult {
  const sport = asSport(String(row.sport));
  const track = row.track as ScoreTrack;
  const periodStart = String(row.period_start);
  return {
    id: `${periodStart}:${sport}:${track}`,
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
    acknowledgedAt: row.acknowledged_at ? String(row.acknowledged_at) : null,
  };
}

function enrollmentFromRow(row: Record<string, unknown>): Enrollment {
  return {
    sport: asSport(String(row.sport)),
    waveStart: String(row.wave_start),
    weekEnd: String(row.week_end),
    capacity: Number(row.capacity),
    peerIds: (row.peer_ids as string[]) ?? [],
    syntheticIds: (row.synthetic_ids as string[]) ?? [],
    autoEnrollNext: Boolean(row.auto_enroll_next),
    crewId: row.crew_id ? String(row.crew_id) : null,
  };
}

async function hydrateCrewBoard(
  db: Db,
  userId: string,
  enrollments: Enrollment[],
): Promise<CompeteState["crewBoard"]> {
  const pinned = enrollments.find((item) => item.crewId);
  if (!pinned?.crewId) return null;

  const { data: field } = await db
    .from("crew_week_fields")
    .select("*")
    .eq("crew_id", pinned.crewId)
    .eq("wave_start", pinned.waveStart)
    .maybeSingle();
  if (!field) return null;

  const { data: crew } = await db
    .from("crews")
    .select("name")
    .eq("id", pinned.crewId)
    .maybeSingle();

  const memberIds = (field.member_ids as string[]) ?? [];
  const { data: members } = await db
    .from("crew_members")
    .select("user_id, display_name")
    .eq("crew_id", pinned.crewId)
    .in("user_id", memberIds);

  const { data: ratings } = await db
    .from("sport_ratings")
    .select("user_id, open_elo")
    .eq("sport", field.sport)
    .in("user_id", memberIds);

  const eloByUser = new Map(
    (ratings ?? []).map((row) => [row.user_id as string, Number(row.open_elo)]),
  );

  return {
    crewId: pinned.crewId,
    crewName: (crew?.name as string) ?? "Crew",
    sport: asSport(String(field.sport)),
    waveStart: String(field.wave_start),
    weekEnd: String(field.week_end),
    capacity: Number(field.capacity),
    memberIds,
    members: (members ?? []).map((member) => ({
      id: member.user_id as string,
      name: member.display_name as string,
      elo: eloByUser.get(member.user_id as string) ?? 1000,
    })),
    syntheticIds: (field.synthetic_ids as string[]) ?? [],
  };
}

/** Assemble CompeteState from relational tables (+ optional snapshot shell). */
export async function hydrateCompeteState(
  db: Db,
  userId: string,
  snapshot: CompeteState | null,
): Promise<CompeteState> {
  const base = migrateCompeteState(snapshot ?? freshState());

  const [
    profileRes,
    prefsRes,
    ratingsRes,
    enrollRes,
    resultsRes,
    freezesRes,
    actsRes,
    linksRes,
    sleepRes,
    healthRatingsRes,
    healthResultsRes,
    duelsRes,
    readinessRes,
  ] = await Promise.all([
    db.from("profiles").select("display_name, city, primary_sport").eq("id", userId).maybeSingle(),
    db.from("athlete_prefs").select("*").eq("user_id", userId).maybeSingle(),
    db.from("sport_ratings").select("*").eq("user_id", userId),
    db.from("wave_enrollments").select("*").eq("user_id", userId),
    db.from("period_results").select("*").eq("user_id", userId).order("period_start", { ascending: false }),
    db.from("period_freezes").select("period_start").eq("user_id", userId),
    db.from("activities").select("*").eq("user_id", userId).order("started_at", { ascending: true }),
    db.from("fitness_connections").select("provider, status").eq("user_id", userId),
    db.from("sleep_nights").select("*").eq("user_id", userId),
    db.from("health_ratings").select("*").eq("user_id", userId),
    db.from("health_period_results").select("*").eq("user_id", userId),
    db.from("duels").select("*").eq("user_id", userId),
    db.from("readiness_marks").select("*").eq("user_id", userId),
  ]);

  const enrollments = (enrollRes.data ?? []).map((row) =>
    enrollmentFromRow(row as Record<string, unknown>),
  );
  const periodResults = (resultsRes.data ?? []).map((row) =>
    periodResultFromRow(row as Record<string, unknown>),
  );
  const activities = (actsRes.data ?? []).map((row) =>
    activityFromRow(row as Record<string, unknown>),
  );

  const hasRelational =
    Boolean(prefsRes.data) ||
    (ratingsRes.data?.length ?? 0) > 0 ||
    activities.length > 0 ||
    periodResults.length > 0 ||
    enrollments.length > 0;

  if (!hasRelational && snapshot) {
    // First load before dual-write: keep snapshot, but never restore demoNow.
    return sanitizeCompeteStateForAccount(migrateCompeteState(snapshot));
  }

  const prefs = prefsRes.data;
  const profile = profileRes.data;
  const crewBoard = await hydrateCrewBoard(db, userId, enrollments);

  const links = base.links.map((link) => {
    const found = (linksRes.data ?? []).find((row) => row.provider === link.provider);
    if (!found) return link;
    const status =
      found.status === "connected"
        ? ("connected" as const)
        : found.status === "stub"
          ? ("stub" as const)
          : ("disconnected" as const);
    return {
      provider: link.provider,
      linked: status !== "disconnected",
      status,
    };
  });

  const ratings =
    (ratingsRes.data?.length ?? 0) > 0
      ? (ratingsRes.data ?? []).map((row) => ({
          sport: asSport(String(row.sport)),
          verifiedElo: Number(row.verified_elo),
          openElo: Number(row.open_elo),
          optedIn: Boolean(row.opted_in),
          lockVerified: Number(row.lock_verified),
          lockOpen: Number(row.lock_open),
          lockPeriod: String(row.lock_period),
        }))
      : base.ratings;

  const assembled: CompeteState = {
    ...base,
    name: (profile?.display_name as string) || base.name,
    city: (profile?.city as string) ?? base.city,
    primary: asSport(String(profile?.primary_sport ?? base.primary)),
    freezesLeft: prefs ? Number(prefs.freezes_left) : base.freezesLeft,
    calibrated: prefs ? Boolean(prefs.calibrated) : base.calibrated,
    onboardingCompleted: prefs
      ? Boolean(prefs.onboarding_completed)
      : base.onboardingCompleted,
    lessonDoneOn: prefs?.lesson_done_on
      ? String(prefs.lesson_done_on)
      : base.lessonDoneOn,
    trainingGoal:
      prefs?.training_goal_distance && prefs?.training_goal_deadline
        ? {
            distance: prefs.training_goal_distance as NonNullable<
              CompeteState["trainingGoal"]
            >["distance"],
            deadline: String(prefs.training_goal_deadline),
          }
        : base.trainingGoal,
    focus: (prefs?.focus as CompeteState["focus"]) ?? base.focus,
    ratings,
    activities: activities.length > 0 ? activities : base.activities,
    enrollments: enrollments.length > 0 ? enrollments : base.enrollments,
    periodResults: periodResults.length > 0 ? periodResults : base.periodResults,
    pendingRevealIds: pendingRevealIdsFromResults(
      periodResults.length > 0 ? periodResults : base.periodResults,
    ),
    frozenPeriods:
      (freezesRes.data ?? []).length > 0
        ? (freezesRes.data ?? []).map((row) => String(row.period_start))
        : base.frozenPeriods,
    links,
    sleepNights:
      (sleepRes.data ?? []).length > 0
        ? (sleepRes.data ?? []).map((night) => ({
            id: String(night.id),
            metric: "sleep" as const,
            day: String(night.day),
            score: Number(night.score),
            durationMin: Number(night.duration_min),
            efficiency: night.efficiency == null ? null : Number(night.efficiency),
            deepMin: night.deep_min == null ? null : Number(night.deep_min),
            remMin: night.rem_min == null ? null : Number(night.rem_min),
            lightMin: night.light_min == null ? null : Number(night.light_min),
            awakeMin: night.awake_min == null ? null : Number(night.awake_min),
            source: night.source as CompeteState["sleepNights"][number]["source"],
            verified: Boolean(night.verified),
          }))
        : base.sleepNights,
    healthRatings:
      (healthRatingsRes.data ?? []).length > 0
        ? (healthRatingsRes.data ?? []).map((row) => ({
            metric: "sleep" as const,
            elo: Number(row.elo),
            optedIn: Boolean(row.opted_in),
            lockElo: Number(row.lock_elo),
            lockPeriod: String(row.lock_period),
            autoEnrollNext: Boolean(row.auto_enroll_next),
          }))
        : base.healthRatings,
    healthResults:
      (healthResultsRes.data ?? []).length > 0
        ? (healthResultsRes.data ?? []).map((row) => ({
            id: String(row.id),
            metric: "sleep" as const,
            periodStart: String(row.period_start),
            periodEnd: String(row.period_end),
            place: Number(row.place),
            fieldSize: Number(row.field_size),
            score: Number(row.score),
            eloBefore: Number(row.elo_before),
            eloAfter: Number(row.elo_after),
            settledAt: String(row.settled_at),
          }))
        : base.healthResults,
    duels:
      (duelsRes.data ?? []).length > 0
        ? (duelsRes.data ?? []).map((row) => ({
            id: String(row.id),
            sport: asSport(String(row.sport)),
            periodStart: String(row.period_start),
            rivalId: String(row.rival_id),
            rivalName: String(row.rival_name),
            rivalElo: Number(row.rival_elo),
            source: row.source as "auto" | "invite",
          }))
        : base.duels,
    readiness:
      (readinessRes.data ?? []).length > 0
        ? (readinessRes.data ?? []).map((row) => ({
            id: String(row.external_id),
            provider: row.provider as ProviderId,
            day: String(row.day),
            score: Number(row.score),
          }))
        : base.readiness,
    demoNow: null,
    crewBoard,
  };

  return migrateCompeteState(assembled);
}

/**
 * Server-side week settlement + relational persist + thin snapshot write.
 * Used on GET (roll) and PUT (save).
 */
export async function saveCompeteAccountState(
  db: Db,
  userId: string,
  incoming: CompeteState,
  options: { roll: boolean } = { roll: true },
): Promise<{ state: CompeteState; updatedAt: string }> {
  let state = sanitizeCompeteStateForAccount(migrateCompeteState(incoming));
  if (options.roll) {
    state = sanitizeCompeteStateForAccount(rollClock(state));
  }
  await persistCompeteRelational(db, userId, state);
  const thin = shrinkCompeteSnapshot(state);
  const updatedAt = new Date().toISOString();
  const { error } = await db.from("compete_snapshots").upsert({
    user_id: userId,
    state: thin,
    updated_at: updatedAt,
  });
  if (error) throw new Error(error.message);
  // Return full hydrated view (not thin) for the client.
  const hydrated = await hydrateCompeteState(db, userId, state);
  return { state: hydrated, updatedAt };
}

export async function loadCompeteAccountState(
  db: Db,
  userId: string,
): Promise<{ state: CompeteState | null; updatedAt: string | null }> {
  const { data, error } = await db
    .from("compete_snapshots")
    .select("state, updated_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);

  const { data: prefs } = await db
    .from("athlete_prefs")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  const snapshot =
    data?.state && typeof data.state === "object"
      ? migrateCompeteState(data.state as CompeteState)
      : null;

  if (!snapshot && !prefs) {
    return { state: null, updatedAt: null };
  }

  // Phase 6: settle on the server so a closed week does not require a client open.
  const working = snapshot
    ? sanitizeCompeteStateForAccount(rollClock(migrateCompeteState(snapshot)))
    : null;

  const hydrated = await hydrateCompeteState(db, userId, working);
  const settled = sanitizeCompeteStateForAccount(rollClock(hydrated));

  const beforeIds = new Set(hydrated.periodResults.map((row) => row.id));
  const added = settled.periodResults.some((row) => !beforeIds.has(row.id));
  const enrollChanged =
    JSON.stringify(hydrated.enrollments) !== JSON.stringify(settled.enrollments);
  if (added || enrollChanged) {
    const saved = await saveCompeteAccountState(db, userId, settled, { roll: false });
    return { state: saved.state, updatedAt: saved.updatedAt };
  }

  return {
    state: settled,
    updatedAt: (data?.updated_at as string | null) ?? null,
  };
}
