import { appleHealthExtra, androidHealthExtra, type DeviceHealthExtra } from "./device-health-metrics";
import { routeMetadata, mapSportToCategory, type ActivitySample, type CategorySlug } from "@fitness-battle/shared";
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
  activities?: ActivitySample[];
  /** HealthKit / Health Connect permission was granted on this attempt. */
  authorized?: boolean;
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
  /** Demo accounts: keep workouts on-device; do not call the live ingest API. */
  localOnly?: boolean;
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
    localOnly: false,
  };
}

/** Build deps for Apple Health sync, merging over platform defaults. */
export function createAppleHealthDeps(
  overrides: Partial<SyncAppleHealthDeps> = {},
): SyncAppleHealthDeps {
  return { ...defaultAppleHealthDeps(), ...overrides };
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
  deps: Pick<SyncAppleHealthDeps, "apiUrl" | "getAccessToken" | "fetchFn" | "localOnly">,
  health?:DeviceHealthExtra,
): Promise<DeviceSyncResult> {
  if (deps.localOnly) {
    return {
      ok: true,
      authorized: true,
      message:
        activities.length > 0
          ? `Connected on this phone. ${activities.length} workouts synced.`
          : "Connected on this phone.",
      count: activities.length,
    };
  }
  const auth = await deps.getAccessToken();
  if (!auth.token) {
    return {
      ok: false,
      authorized: true,
      message: "Sign in with a live account to upload workouts to the server.",
      count: 0,
    };
  }
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${auth.token}`,
  };
  let response: Response;
  try {
    response = await deps.fetchFn(`${deps.apiUrl}/api/fitness/ingest`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        provider,
        activities,
        ...health,
        userId: auth.userId,
      }),
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Network request failed";
    return {
      ok: false,
      authorized: true,
      message: `Could not reach the server (${detail}). Check your connection and try again.`,
      count: 0,
    };
  }
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    const message =
      body.error === "authentication_required"
        ? "Sign in on the You tab to upload workouts to your account."
        : (body.error ?? "Ingest failed");
    return { ok: false, authorized: true, message, count: 0 };
  }
  return {
    ok: true,
    authorized: true,
    message: `Sent ${activities.length} workouts.`,
    count: activities.length,
    activities,
  };
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
        { permissions: { read: ["Workout","StepCount","RestingHeartRate","HeartRateVariability","SleepAnalysis","WorkoutRoute"].map(key=>kit.Constants.Permissions[key]).filter(Boolean), write: [] } },
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
  const routeReader=(kit as unknown as Record<string,unknown>).getWorkoutRouteSamples;
  if(typeof routeReader==="function")for(const activity of activities){
    const locations=await new Promise<{latitude:number;longitude:number;timestamp?:string;altitude?:number;speed?:number}[]>(resolve=>routeReader.call(kit,{id:activity.externalId},(error:unknown,result:{data?:{locations?:{latitude:number;longitude:number;timestamp?:string;altitude?:number;speed?:number}[]}})=>resolve(error?[]:result?.data?.locations??[])));
    Object.assign(activity,routeMetadata(locations.map(p=>({lat:p.latitude,lon:p.longitude,time:p.timestamp,elevation:p.altitude,speedMps:p.speed})),activity.categorySlug));
  }
  const healthExtra=await appleHealthExtra(kit as unknown as Record<string,unknown>,startDate,endDate);
  if (activities.length === 0 && !healthExtra.dailyHealth.length && !healthExtra.sleepNights.length) {
    return {
      ok: true,
      authorized: true,
      message: "Apple Health is connected. No mapped workouts in the last 90 days yet.",
      count: 0,
    };
  }
  return postIngest("apple_health", activities, deps,healthExtra);
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

type HealthConnectPermission = { accessType?: string; recordType?: string };

type HealthConnectModule = {
  initialize: () => Promise<boolean>;
  requestPermission: (
    permissions: { accessType: string; recordType: string }[],
  ) => Promise<HealthConnectPermission[]>;
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
      exerciseRoute?:{route?:{latitude:number;longitude:number;time?:string;altitude?:{inMeters?:number}}[]};
    }[];
  }>;
  ExerciseType?: Record<string, number>;
};

function healthConnectGrantedExerciseRead(granted: HealthConnectPermission[]): boolean {
  return granted.some(
    (permission) =>
      permission.recordType === "ExerciseSession" && permission.accessType === "read",
  );
}

export type SyncHealthConnectDeps = Pick<
  SyncAppleHealthDeps,
  "apiUrl" | "getAccessToken" | "fetchFn" | "localOnly"
> & {
  platform?: string;
  /** Injectable for tests; defaults to require("react-native-health-connect"). */
  healthModule?: HealthConnectModule | null;
};

function defaultLoadHealthConnect(): HealthConnectModule | null {
  try {
    return require("react-native-health-connect") as HealthConnectModule;
  } catch {
    return null;
  }
}

/** Build ingest deps for Health Connect, merging over platform defaults. */
export function createHealthConnectDeps(
  overrides: Partial<SyncHealthConnectDeps> = {},
): SyncHealthConnectDeps {
  const base = createAppleHealthDeps(overrides);
  return {
    apiUrl: base.apiUrl,
    getAccessToken: base.getAccessToken,
    fetchFn: base.fetchFn,
    localOnly: base.localOnly,
    platform: overrides.platform ?? Platform.OS,
    healthModule: overrides.healthModule,
  };
}

export async function syncHealthConnect(
  deps: SyncHealthConnectDeps = createHealthConnectDeps(),
): Promise<DeviceSyncResult> {
  const platform = deps.platform ?? Platform.OS;
  if (platform !== "android") {
    return { ok: false, message: "Health Connect is only available on Android.", count: 0 };
  }

  const health =
    deps.healthModule === undefined ? defaultLoadHealthConnect() : deps.healthModule;
  if (!health) {
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
  let ready = false;
  try {
    ready = await health.initialize();
  } catch {
    return {
      ok: false,
      message: "Health Connect is not available on this device.",
      count: 0,
    };
  }
  if (!ready) return { ok: false, message: "Health Connect is not available on this device.", count: 0 };
  let granted: HealthConnectPermission[];
  try {
    granted = await health.requestPermission([
      { accessType: "read", recordType: "ExerciseSession" },
      { accessType: "read", recordType: "Distance" },
      { accessType: "read", recordType: "Steps" },
      { accessType: "read", recordType: "RestingHeartRate" },
      { accessType: "read", recordType: "HeartRateVariabilityRmssd" },
      { accessType: "read", recordType: "SleepSession" },
    ]);
  } catch {
    return {
      ok: false,
      authorized: false,
      message: "Health Connect permission was not granted. Allow workout access and try again.",
      count: 0,
    };
  }
  if (!healthConnectGrantedExerciseRead(granted ?? [])) {
    return {
      ok: false,
      authorized: false,
      message: "Health Connect permission was not granted. Allow workout access and try again.",
      count: 0,
    };
  }
  const startTime = new Date(Date.now() - BACKFILL_MS).toISOString();
  const endTime = new Date().toISOString();
  const range = { timeRangeFilter: { operator: "between", startTime, endTime } };
  let sessions: NonNullable<Awaited<ReturnType<HealthConnectModule["readRecords"]>>["records"]> = [];
  let distances: typeof sessions = [];
  try {
    const [exercise, distance] = await Promise.all([
      health.readRecords("ExerciseSession", range),
      health.readRecords("Distance", range),
    ]);
    sessions = exercise.records ?? [];
    distances = distance.records ?? [];
  } catch {
    return {
      ok: false,
      authorized: true,
      message: "Health Connect could not be read. You can keep using Overtaek without it.",
      count: 0,
    };
  }
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
      const sample=sampleFromWorkout(
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
      if(sample)Object.assign(sample,routeMetadata((record.exerciseRoute?.route??[]).map(p=>({lat:p.latitude,lon:p.longitude,time:p.time,elevation:p.altitude?.inMeters})),sample.categorySlug));
      return sample;
    })
    .filter((item): item is ActivitySample => item != null);
  const healthExtra = await androidHealthExtra(
    health as unknown as Record<string, unknown>,
    (granted ?? []).filter(
      (g): g is { recordType: string; accessType: string } =>
        typeof g.recordType === "string" && typeof g.accessType === "string",
    ),
  );
  if (activities.length === 0 && !healthExtra.dailyHealth.some(r=>r.steps!=null||r.restingHr!=null||r.hrv!=null) && !healthExtra.sleepNights.length) {
    return {
      ok: true,
      authorized: true,
      message: "Health Connect is connected. No mapped workouts in the last 90 days yet.",
      count: 0,
    };
  }
  return postIngest("google_health", activities, deps,healthExtra);
}
