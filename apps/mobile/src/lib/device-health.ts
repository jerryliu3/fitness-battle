import { mapSportToCategory, type ActivitySample, type CategorySlug } from "@fitness-battle/shared";
import { mobileEnv } from "./env";
import { supabase } from "./supabase";

const BACKFILL_MS = 90 * 24 * 60 * 60 * 1000;

export interface DeviceSyncResult {
  ok: boolean;
  message: string;
  count: number;
}

type WorkoutLike = {
  id?: string;
  activityId?: string | number;
  activityName?: string;
  start?: string;
  end?: string;
  distance?: number;
  duration?: number;
};

function sampleFromWorkout(
  provider: "apple_health" | "google_health",
  raw: WorkoutLike,
  sportHint: string,
): ActivitySample | null {
  const sport: CategorySlug | null = mapSportToCategory(sportHint);
  if (!sport || !raw.start) return null;
  const start = new Date(raw.start);
  const end = raw.end ? new Date(raw.end) : start;
  if (Number.isNaN(start.getTime())) return null;
  const movingSec = Math.max(
    0,
    raw.duration != null && raw.duration > 0
      ? Math.round(raw.duration)
      : Math.round((end.getTime() - start.getTime()) / 1000),
  );
  const distance = Math.max(0, raw.distance ?? 0);
  const externalId = String(raw.id ?? raw.activityId ?? start.toISOString());
  const gps = sport !== "strength";
  return {
    id: `${provider}-${externalId}`,
    provider,
    externalId,
    categorySlug: sport,
    startedAt: start.toISOString(),
    metricValue: gps ? distance : movingSec,
    movingSec,
    avgHr: null,
    rawName: sportHint || sport,
  };
}

async function postIngest(
  provider: "apple_health" | "google_health",
  activities: ActivitySample[],
): Promise<DeviceSyncResult> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`${mobileEnv.apiUrl}/api/fitness/ingest`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      provider,
      activities,
      userId: data.session?.user.id,
    }),
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    return { ok: false, message: body.error ?? "Ingest failed", count: 0 };
  }
  return { ok: true, message: `Sent ${activities.length} workouts.`, count: activities.length };
}

export async function syncAppleHealth(): Promise<DeviceSyncResult> {
  let health: {
    initHealthKit: (permissions: unknown, cb: (error: string) => void) => void;
    getAnchoredWorkouts: (
      options: { startDate: string },
      cb: (error: string, results: { data?: WorkoutLike[] }) => void,
    ) => void;
    Constants: { Permissions: { Workout: string } };
  };
  try {
    health = require("react-native-health") as typeof health;
  } catch {
    return {
      ok: false,
      message: "Apple Health needs a development build. It is not available in Expo Go.",
      count: 0,
    };
  }
  const startDate = new Date(Date.now() - BACKFILL_MS).toISOString();
  const workouts = await new Promise<WorkoutLike[]>((resolve, reject) => {
    health.initHealthKit(
      { permissions: { read: [health.Constants.Permissions.Workout], write: [] } },
      (error) => {
        if (error) {
          reject(new Error(error));
          return;
        }
        health.getAnchoredWorkouts({ startDate }, (workoutError, results) => {
          if (workoutError) reject(new Error(String(workoutError)));
          else resolve(results?.data ?? []);
        });
      },
    );
  }).catch((error: Error) => {
    throw error;
  });
  const activities = workouts
    .map((workout) =>
      sampleFromWorkout("apple_health", {
        ...workout,
        // react-native-health reports workout distance in miles.
        distance: (workout.distance ?? 0) * 1609.344,
        duration: undefined,
      }, workout.activityName ?? ""),
    )
    .filter((item): item is ActivitySample => item != null);
  if (activities.length === 0) {
    return { ok: true, message: "Apple Health returned no mapped workouts.", count: 0 };
  }
  return postIngest("apple_health", activities);
}

const HEALTH_CONNECT_SPORTS: Record<string, string> = {
  RUNNING: "running",
  RUNNING_TREADMILL: "running",
  BIKING: "cycling",
  BIKING_STATIONARY: "cycling",
  WALKING: "walking",
  HIKING: "walking",
  STRENGTH_TRAINING: "strength",
  WEIGHTLIFTING: "strength",
  CALISTHENICS: "strength",
};

export async function syncHealthConnect(): Promise<DeviceSyncResult> {
  let health: {
    initialize: () => Promise<boolean>;
    requestPermission: (permissions: { accessType: string; recordType: string }[]) => Promise<unknown>;
    readRecords: (
      type: string,
      options: { timeRangeFilter: { operator: string; startTime: string; endTime: string } },
    ) => Promise<{
      records?: {
        metadata?: { id?: string };
        startTime?: string;
        endTime?: string;
        title?: string;
        exerciseType?: number | string;
        distance?: { inMeters?: number };
      }[];
    }>;
    ExerciseType?: Record<string, number>;
  };
  try {
    health = require("react-native-health-connect") as typeof health;
  } catch {
    return {
      ok: false,
      message: "Health Connect needs a development build. It is not available in Expo Go.",
      count: 0,
    };
  }
  const ready = await health.initialize();
  if (!ready) return { ok: false, message: "Health Connect is not available on this device.", count: 0 };
  await health.requestPermission([
    { accessType: "read", recordType: "ExerciseSession" },
    { accessType: "read", recordType: "Distance" },
  ]);
  const startTime = new Date(Date.now() - BACKFILL_MS).toISOString();
  const endTime = new Date().toISOString();
  const range = { timeRangeFilter: { operator: "between", startTime, endTime } };
  const [{ records: sessions = [] }, { records: distances = [] }] = await Promise.all([
    health.readRecords("ExerciseSession", range),
    health.readRecords("Distance", range),
  ]);
  const typeNames = new Map<number, string>();
  for (const [name, value] of Object.entries(health.ExerciseType ?? {})) {
    if (typeof value === "number") typeNames.set(value, name);
  }
  const activities = sessions
    .map((record) => {
      const typeName =
        typeof record.exerciseType === "string"
          ? record.exerciseType
          : typeNames.get(record.exerciseType ?? -1) ?? "";
      const sport = HEALTH_CONNECT_SPORTS[typeName] ?? typeName;
      const startMs = record.startTime ? new Date(record.startTime).getTime() : NaN;
      const endMs = record.endTime ? new Date(record.endTime).getTime() : startMs;
      const distance = distances.reduce((sum, item) => {
        const at = item.startTime ? new Date(item.startTime).getTime() : NaN;
        if (Number.isNaN(at) || Number.isNaN(startMs) || at < startMs || at > endMs) return sum;
        return sum + (item.distance?.inMeters ?? 0);
      }, 0);
      return sampleFromWorkout(
        "google_health",
        {
          id: record.metadata?.id,
          start: record.startTime,
          end: record.endTime,
          activityName: record.title,
          distance,
        },
        sport,
      );
    })
    .filter((item): item is ActivitySample => item != null);
  if (activities.length === 0) {
    return { ok: true, message: "Health Connect returned no mapped workouts.", count: 0 };
  }
  return postIngest("google_health", activities);
}
