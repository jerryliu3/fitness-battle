import type { ActivitySample, CategorySlug, ReadinessSample } from "../types";
import { mapSportToCategory } from "./strava-provider";

/** Subset of Open Wearables workout event fields we consume. */
export interface OwWorkout {
  id: string;
  type: string;
  name?: string | null;
  start_time: string;
  end_time: string;
  duration_seconds?: number | null;
  moving_time_seconds?: number | null;
  distance_meters?: number | null;
  avg_heart_rate_bpm?: number | null;
  source?: { provider?: string | null };
}

/** Provider-reported recovery/readiness score from OW health scores. */
export interface OwHealthScore {
  id?: string;
  date?: string;
  day?: string;
  score_type?: string;
  type?: string;
  value?: number | null;
  score?: number | null;
  provider?: string | null;
  source?: { provider?: string | null };
}

export function mapOwWorkoutToActivity(
  workout: OwWorkout,
  provider: "whoop" | "strava" | "oura" | "garmin" = "whoop",
): ActivitySample | null {
  if (workout.source?.provider && workout.source.provider !== provider) return null;
  const sport: CategorySlug | null = mapSportToCategory(workout.type);
  if (!sport || !workout.start_time) return null;
  const start = new Date(workout.start_time);
  const end = workout.end_time ? new Date(workout.end_time) : start;
  if (Number.isNaN(start.getTime())) return null;
  const movingSec = Math.max(
    0,
    Math.round(
      workout.moving_time_seconds ??
        workout.duration_seconds ??
        (end.getTime() - start.getTime()) / 1000,
    ),
  );
  const distance = Math.max(0, workout.distance_meters ?? 0);
  const gps = sport !== "strength";
  return {
    id: `${provider}-ow-${workout.id}`,
    provider,
    externalId: String(workout.id),
    categorySlug: sport,
    startedAt: start.toISOString(),
    metricValue: gps ? distance : movingSec,
    movingSec,
    avgHr: workout.avg_heart_rate_bpm ?? null,
    rawName: workout.name ?? workout.type,
  };
}

export function mapOwHealthScoreToReadiness(
  row: OwHealthScore,
  provider: "whoop" | "oura" = "whoop",
): ReadinessSample | null {
  const providerSlug = row.provider ?? row.source?.provider;
  if (providerSlug && providerSlug !== provider) return null;
  const kind = (row.score_type ?? row.type ?? "").toLowerCase();
  if (kind && !kind.includes("recovery") && !kind.includes("readiness")) return null;
  const score = Number(row.value ?? row.score);
  if (!Number.isFinite(score)) return null;
  const day = (row.date ?? row.day ?? "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  const externalId = String(row.id ?? day);
  return {
    id: `${provider}-ow-ready-${externalId}`,
    provider,
    externalId,
    day,
    score: Math.max(0, Math.min(100, score)),
  };
}
