import {
  dayKey,
  startOfZonedDay,
  shiftAppDay,
  scoreSleepNight,
  type SleepNight,
  type SyncResult,
} from "@fitness-battle/shared";

type HealthKitSample = {
  value?: number | string;
  startDate?: string;
  endDate?: string;
  sourceId?: string;
};

type AndroidStage = {
  stage?: number;
  startTime?: string;
  endTime?: string;
};

type AndroidSession = {
  startTime?: string;
  endTime?: string;
  metadata?: { dataOrigin?: string };
  stages?: AndroidStage[];
};

export type DeviceHealthExtra = {
  dailyHealth: NonNullable<SyncResult["dailyHealth"]>;
  sleepNights: SleepNight[];
};

const empty = (): DeviceHealthExtra => ({ dailyHealth: [], sleepNights: [] });

/**
 * Union overlapping [start, end] millisecond ranges to compute continuous duration
 * without double-counting intervals overlapping across devices/sensors.
 */
export function unionTimeRanges(ranges: [number, number][]): number {
  let total = 0;
  let currentEnd = -Infinity;
  const sorted = [...ranges].sort((a, b) => a[0] - b[0]);
  for (const [start, end] of sorted) {
    if (end <= currentEnd) continue;
    total += Math.max(0, end - Math.max(start, currentEnd));
    currentEnd = Math.max(currentEnd, end);
  }
  return total;
}

/**
 * Separate sources and union overlapping intervals so watch/phone copies cannot double sleep duration.
 */
export function appleSleepNights(samples: HealthKitSample[]): SleepNight[] {
  const sources = new Map<string, HealthKitSample[]>();
  for (const r of samples) {
    if (!String(r.value).startsWith("ASLEEP") && !String(r.value).startsWith("AWAKE")) continue;
    const key = r.sourceId ?? "unknown";
    sources.set(key, [...(sources.get(key) ?? []), r]);
  }

  const nights: SleepNight[] = [];
  for (const [source, rows] of sources) {
    const intervals = rows
      .filter((r) => String(r.value).startsWith("ASLEEP"))
      .map((r) => [Date.parse(r.startDate ?? ""), Date.parse(r.endDate ?? "")] as [number, number])
      .filter(([a, b]) => Number.isFinite(a) && Number.isFinite(b) && b > a)
      .sort((a, b) => a[0] - b[0]);

    const groups: [number, number][][] = [];
    for (const range of intervals) {
      const group = groups.at(-1);
      if (!group || range[0] > Math.max(...group.map((r) => r[1])) + 90 * 60000) {
        groups.push([range]);
      } else {
        group.push(range);
      }
    }

    for (const group of groups) {
      const end = Math.max(...group.map((r) => r[1]));
      const durationMin = unionTimeRanges(group) / 60000;
      if (durationMin < 180) continue; // Exclude short naps under 3 hours from nightly sleep

      const day = dayKey(new Date(end));
      const stage = (name: string) => {
        const parts = rows
          .filter((r) => String(r.value).includes(name))
          .map((r) => [
            Math.max(Date.parse(r.startDate ?? ""), group[0][0]),
            Math.min(Date.parse(r.endDate ?? ""), end),
          ] as [number, number])
          .filter(([a, b]) => b > a);
        return parts.length ? unionTimeRanges(parts) / 60000 : null;
      };

      const deepMin = stage("DEEP");
      const remMin = stage("REM");
      const lightMin = stage("CORE");
      const awakeMin = stage("AWAKE");

      nights.push({
        id: `apple-health-${source}-${end}`,
        metric: "sleep",
        source: "apple_health",
        verified: true,
        day,
        durationMin,
        score: scoreSleepNight({ durationMin, deepMin, remMin }),
        efficiency: null,
        deepMin,
        remMin,
        lightMin,
        awakeMin,
      });
    }
  }

  // Deduplicate by day: prefer the longest sleep session if multiple sources logged the same day
  const byDay = new Map<string, SleepNight>();
  for (const night of nights) {
    const existing = byDay.get(night.day);
    if (!existing || night.durationMin > existing.durationMin) {
      byDay.set(night.day, night);
    }
  }
  return [...byDay.values()].sort((a, b) => a.day.localeCompare(b.day));
}

export async function appleHealthExtra(
  native: Record<string, unknown>,
  startDate: string,
  endDate: string,
): Promise<DeviceHealthExtra> {
  const result = empty();
  const read = async (name: string, options: Record<string, unknown> = {}): Promise<HealthKitSample[]> => {
    const fn = native[name] as Function | undefined;
    if (typeof fn !== "function") return [];
    return new Promise((resolve) =>
      fn.call(native, { startDate, endDate, ...options }, (error: unknown, rows: HealthKitSample[]) =>
        resolve(error || !Array.isArray(rows) ? [] : rows),
      ),
    );
  };

  const dailyByDay = new Map<
    string,
    { provider: "apple_health"; day: string; steps?: number; restingHr?: number; hrv?: number }
  >();

  const metrics = [
    { method: "getDailyStepCountSamples", key: "steps" as const, multiplier: 1, isSum: true },
    { method: "getRestingHeartRateSamples", key: "restingHr" as const, multiplier: 1, isSum: false },
    { method: "getHeartRateVariabilitySamples", key: "hrv" as const, multiplier: 1000, isSum: false },
  ] as const;

  for (const { method, key, multiplier, isSum } of metrics) {
    const samples = await read(method, {
      unit: key === "hrv" ? "second" : undefined,
      period: 1440,
    });
    const grouped = new Map<string, number[]>();
    for (const r of samples) {
      if (typeof r.value !== "number" || !Number.isFinite(r.value) || !r.startDate) continue;
      const parsed = Date.parse(r.startDate);
      if (!Number.isFinite(parsed)) continue;
      const day = dayKey(new Date(parsed));
      grouped.set(day, [...(grouped.get(day) ?? []), r.value * multiplier]);
    }
    for (const [day, values] of grouped) {
      if (!values.length) continue;
      const aggregated = isSum
        ? values.reduce((a, b) => a + b, 0)
        : values.reduce((a, b) => a + b, 0) / values.length;
      if (!Number.isFinite(aggregated) || (key === "restingHr" ? aggregated <= 0 : aggregated < 0)) {
        continue;
      }
      const existing = dailyByDay.get(day) ?? { provider: "apple_health", day };
      existing[key] = aggregated;
      dailyByDay.set(day, existing);
    }
  }

  result.dailyHealth = [...dailyByDay.values()].sort((a, b) => a.day.localeCompare(b.day));
  result.sleepNights = appleSleepNights(await read("getSleepSamples"));
  return result;
}

export async function androidHealthExtra(
  native: Record<string, unknown>,
  existingGrants?: { recordType: string; accessType: string }[],
): Promise<DeviceHealthExtra> {
  const result = empty();
  const permission = native.requestPermission as
    | ((types: { recordType: string; accessType: string }[]) => Promise<{ recordType: string; accessType: string }[]>)
    | undefined;
  const aggregate = native.aggregateRecord as ((options: unknown) => Promise<Record<string, unknown>>) | undefined;
  const read = native.readRecords as ((type: string, options: unknown) => Promise<Record<string, unknown>>) | undefined;

  let grants: { recordType: string; accessType: string }[] = existingGrants ?? [];
  if (!existingGrants && typeof permission === "function") {
    try {
      grants = await permission.call(
        native,
        ["Steps", "RestingHeartRate", "HeartRateVariabilityRmssd", "SleepSession"].map((recordType) => ({
          recordType,
          accessType: "read",
        })),
      );
    } catch {
      return result;
    }
  }

  const allowed = (type: string) => grants.some((p) => p.recordType === type && p.accessType === "read");

  for (let i = 6; i >= 0; i--) {
    const start = startOfZonedDay(shiftAppDay(new Date(), -i));
    const end = startOfZonedDay(shiftAppDay(start, 1));
    const timeRangeFilter = { operator: "between", startTime: start.toISOString(), endTime: end.toISOString() };
    const row: NonNullable<SyncResult["dailyHealth"]>[number] = {
      provider: "google_health",
      day: dayKey(start),
    };

    if (typeof aggregate === "function") {
      for (const [recordType, key, field] of [
        ["Steps", "steps", "COUNT_TOTAL"],
        ["RestingHeartRate", "restingHr", "BPM_AVG"],
      ] as const) {
        if (allowed(recordType)) {
          try {
            const value = await aggregate.call(native, { recordType, timeRangeFilter });
            if (typeof value[field] === "number" && Number.isFinite(value[field])) {
              const num = value[field] as number;
              if (key === "restingHr" ? num > 0 : num >= 0) {
                row[key] = num;
              }
            }
          } catch {
            /* Missing permission or unavailable source remains a gap. */
          }
        }
      }
    }

    if (typeof read === "function" && allowed("HeartRateVariabilityRmssd")) {
      try {
        const data = await read.call(native, "HeartRateVariabilityRmssd", { timeRangeFilter });
        const records = (data.records ?? []) as { heartRateVariabilityMillis?: number }[];
        const values = records
          .map((r) => r.heartRateVariabilityMillis)
          .filter((v): v is number => typeof v === "number" && Number.isFinite(v) && v >= 0);
        if (values.length) {
          row.hrv = values.reduce((a, b) => a + b, 0) / values.length;
        }
      } catch {
        /* Optional sensor. */
      }
    }

    if (typeof read === "function" && allowed("SleepSession")) {
      try {
        const data = await read.call(native, "SleepSession", { timeRangeFilter });
        const sessions = (data.records ?? []) as AndroidSession[];
        const intervals: HealthKitSample[] = [];
        for (const session of sessions) {
          const stages = session.stages ?? [];
          if (stages.length > 0) {
            for (const stage of stages) {
              const value = ({ 1: "AWAKE", 2: "ASLEEP", 3: "AWAKE_OUT_OF_BED", 4: "ASLEEP_CORE", 5: "ASLEEP_DEEP", 6: "ASLEEP_REM" } as Record<
                number,
                string
              >)[stage.stage ?? 0];
              if (value) {
                intervals.push({
                  value,
                  startDate: stage.startTime,
                  endDate: stage.endTime,
                  sourceId: session.metadata?.dataOrigin ?? "health-connect",
                });
              }
            }
          } else if (session.startTime && session.endTime) {
            intervals.push({
              value: "ASLEEP",
              startDate: session.startTime,
              endDate: session.endTime,
              sourceId: session.metadata?.dataOrigin ?? "health-connect",
            });
          }
        }
        result.sleepNights.push(
          ...appleSleepNights(intervals).map((n) => ({
            ...n,
            id: n.id.startsWith("apple-health-") ? n.id.replace("apple-health-", "health-connect-") : `health-connect-${n.id}`,
            source: "google_health" as const,
          })),
        );
      } catch {
        /* No recorded staging, no invented asleep duration. */
      }
    }

    result.dailyHealth.push(row);
  }

  // Deduplicate sleep nights by day, keeping the longest session if multiple exist
  const sleepByDay = new Map<string, SleepNight>();
  for (const night of result.sleepNights) {
    const existing = sleepByDay.get(night.day);
    if (!existing || night.durationMin > existing.durationMin) {
      sleepByDay.set(night.day, night);
    }
  }
  result.sleepNights = [...sleepByDay.values()].sort((a, b) => a.day.localeCompare(b.day));

  return result;
}
