import { mapSportToCategory, type ActivitySample, type CategorySlug } from "@fitness-battle/shared";
import { NativeModules, Platform } from "react-native";
import {
  resolveAppleHealthKit,
  type AppleHealthKitNative,
  type AppleHealthKitPackageExport,
} from "./apple-health-kit";
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

export type SyncAppleHealthDeps = {
  platform: string;
  nativeModule: AppleHealthKitNative | null | undefined;
  packageExport: AppleHealthKitPackageExport | null | undefined;
  apiUrl: string;
  getAccessToken: () => Promise<{ token?: string; userId?: string }>;
  fetchFn: typeof fetch;
};

function readReactNativeHealthPackage(): AppleHealthKitPackageExport | null {
  try {
    return require("react-native-health") as AppleHealthKitPackageExport;
  } catch {
    return null;
  }
}

function defaultAppleHealthDeps(): SyncAppleHealthDeps {
  return {
    platform: Platform.OS,
    nativeModule: NativeModules.AppleHealthKit as AppleHealthKitNative | undefined,
    packageExport: readReactNativeHealthPackage(),
    apiUrl: mobileEnv.apiUrl,
    getAccessToken: async () => {
      const { data } = await supabase.auth.getSession();
      return {
        token: data.session?.access_token,
        userId: data.session?.user.id,
      };
    },
    fetchFn: fetch,
  };
}

export function sampleFromWorkout(
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
  deps: Pick<SyncAppleHealthDeps, "apiUrl" | "getAccessToken" | "fetchFn">,
): Promise<DeviceSyncResult> {
  const auth = await deps.getAccessToken();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (auth.token) headers.Authorization = `Bearer ${auth.token}`;
  const response = await deps.fetchFn(`${deps.apiUrl}/api/fitness/ingest`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      provider,
      activities,
      userId: auth.userId,
    }),
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    return { ok: false, message: body.error ?? "Ingest failed", count: 0 };
  }
  return { ok: true, message: `Sent ${activities.length} workouts.`, count: activities.length };
}

function healthKitErrorMessage(error: unknown): string {
  if (typeof error === "string" && error.trim()) return error;
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
  }
  if (error instanceof Error && error.message.trim()) return error.message;
  return "Apple Health sync failed.";
}

export async function syncAppleHealth(
  deps: SyncAppleHealthDeps = defaultAppleHealthDeps(),
): Promise<DeviceSyncResult> {
  const kit = resolveAppleHealthKit({
    platform: deps.platform,
    nativeModule: deps.nativeModule,
    packageExport: deps.packageExport,
  });

  if (kit === "unsupported") {
    return { ok: false, message: "Apple Health is only available on iOS.", count: 0 };
  }
  if (kit === "unavailable") {
    return {
      ok: false,
      message:
        "Apple Health needs a development or TestFlight build with HealthKit. It is not available in Expo Go.",
      count: 0,
    };
  }

  const startDate = new Date(Date.now() - BACKFILL_MS).toISOString();
  const endDate = new Date().toISOString();
  let workouts: WorkoutLike[];
  try {
    workouts = await new Promise<WorkoutLike[]>((resolve, reject) => {
      kit.initHealthKit(
        { permissions: { read: [kit.Constants.Permissions.Workout], write: [] } },
        (error) => {
          if (error) {
            reject(new Error(healthKitErrorMessage(error)));
            return;
          }
          kit.getAnchoredWorkouts(
            { startDate, endDate, type: "Workout" },
            (workoutError, results) => {
              if (workoutError) {
                reject(new Error(healthKitErrorMessage(workoutError)));
                return;
              }
              resolve((results?.data ?? []) as WorkoutLike[]);
            },
          );
        },
      );
    });
  } catch (error) {
    return { ok: false, message: healthKitErrorMessage(error), count: 0 };
  }

  const activities = workouts
    .map((workout) =>
      sampleFromWorkout(
        "apple_health",
        {
          ...workout,
          // react-native-health reports workout distance in miles.
          distance: (workout.distance ?? 0) * 1609.344,
        },
        workout.activityName ?? "",
      ),
    )
    .filter((item): item is ActivitySample => item != null);
  if (activities.length === 0) {
    return { ok: true, message: "Apple Health returned no mapped workouts.", count: 0 };
  }
  return postIngest("apple_health", activities, deps);
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
  if (Platform.OS !== "android") {
    return { ok: false, message: "Health Connect is only available on Android.", count: 0 };
  }

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
  if (typeof health.initialize !== "function" || typeof health.readRecords !== "function") {
    return {
      ok: false,
      message: "Health Connect native module is unavailable in this build.",
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
  return postIngest("google_health", activities, {
    apiUrl: mobileEnv.apiUrl,
    getAccessToken: async () => {
      const { data } = await supabase.auth.getSession();
      return {
        token: data.session?.access_token,
        userId: data.session?.user.id,
      };
    },
    fetchFn: fetch,
  });
}
