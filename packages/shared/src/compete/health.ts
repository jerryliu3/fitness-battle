import { weekEndAfter } from "../matching/waves";
import { settleElo } from "./elo";
import {
  ELO_BASE,
  ELO_CAP,
  ELO_FLOOR,
  clamp,
  dayKey,
  unitInterval,
  type ProviderId,
  type SportId,
} from "./sports";

/**
 * Health metrics sit beside volume sports. Each one is a bounded reading
 * (a night, or later a snapshot such as HRV or VO2max), not distance.
 * `nightly` is one wake-day. `snapshot` is reserved for point-in-time metrics.
 */
export const HEALTH_METRIC_IDS = ["sleep"] as const;
export type HealthMetricId = (typeof HEALTH_METRIC_IDS)[number];

export type HealthShape = "nightly" | "snapshot";

export interface HealthMetric {
  id: HealthMetricId;
  name: string;
  shape: HealthShape;
  scale: { min: number; max: number };
  unit: string;
  blurb: string;
}

export const HEALTH_METRICS: HealthMetric[] = [
  {
    id: "sleep",
    name: "Sleep",
    shape: "nightly",
    scale: { min: 0, max: 100 },
    unit: "score",
    blurb:
      "Last night’s sleep score from a tracker. The week ranks average nights, not distance.",
  },
];

/** Trackers that record a night of sleep. Strava does not. */
export const SLEEP_PROVIDER_IDS = [
  "garmin",
  "apple_health",
  "google_health",
  "whoop",
  "oura",
] as const satisfies readonly ProviderId[];

export type SleepSource = ProviderId | "history" | "manual";

export interface SleepNight {
  id: string;
  metric: "sleep";
  /** Wake day the night is credited to (YYYY-MM-DD, UTC). */
  day: string;
  /** 0–100 composite. Device score when the tracker sent one. */
  score: number;
  durationMin: number;
  efficiency: number | null;
  deepMin: number | null;
  remMin: number | null;
  lightMin: number | null;
  awakeMin: number | null;
  source: SleepSource;
  /** Recorded by a device, not typed in. */
  verified: boolean;
}

/**
 * Shared shape for a later snapshot metric (HRV, VO2max). Not stored yet.
 * Contest math should keep using a 0–100 `score` so the field stays comparable.
 */
export interface HealthSnapshotReading {
  id: string;
  metric: string;
  day: string;
  score: number;
  value: number;
  unit: string;
  source: SleepSource;
  verified: boolean;
}

export interface HealthRating {
  metric: HealthMetricId;
  elo: number;
  optedIn: boolean;
  lockElo: number;
  /** Inclusive UTC start of the open health week. */
  lockPeriod: string;
  autoEnrollNext: boolean;
}

export interface HealthPeriodResult {
  id: string;
  metric: HealthMetricId;
  periodStart: string;
  periodEnd: string;
  place: number;
  fieldSize: number;
  /** Contest score for the closed week (0–100). */
  score: number;
  eloBefore: number;
  eloAfter: number;
  settledAt: string;
}

export type CategoryFocus =
  | { family: "sport"; id: SportId }
  | { family: "health"; id: HealthMetricId };

const DAY_MS = 86_400_000;
const FIELD_RIVALS = 7;
const MAX_HEALTH_RESULTS = 104;

const RIVAL_NAMES = [
  "Maya Chen",
  "Leo Park",
  "Ava Singh",
  "Noah Brooks",
  "Priya Shah",
  "Hana Ito",
  "Sofia Rossi",
  "Mina Cho",
  "Lila Berg",
  "Omar Farouk",
  "Kai Lind",
  "Riley Quinn",
] as const;

export function healthMetricById(id: HealthMetricId): HealthMetric {
  const metric = HEALTH_METRICS.find((item) => item.id === id);
  if (!metric) throw new Error(`unknown_health_metric:${id}`);
  return metric;
}

export function providerRecordsSleep(provider: ProviderId): boolean {
  return (SLEEP_PROVIDER_IDS as readonly string[]).includes(provider);
}

export function freshHealthRatings(periodStart: string): HealthRating[] {
  return HEALTH_METRIC_IDS.map((metric) => ({
    metric,
    elo: ELO_BASE,
    optedIn: false,
    lockElo: ELO_BASE,
    lockPeriod: periodStart,
    autoEnrollNext: true,
  }));
}

export function formatSleepDuration(minutes: number): string {
  const safe = Math.max(0, Math.round(minutes));
  const hours = Math.floor(safe / 60);
  const mins = safe % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

/** Prefer a device score. Otherwise blend duration, efficiency, and restorative sleep. */
export function scoreSleepNight(input: {
  durationMin: number;
  efficiency?: number | null;
  deepMin?: number | null;
  remMin?: number | null;
  deviceScore?: number | null;
}): number {
  if (input.deviceScore != null && Number.isFinite(input.deviceScore)) {
    return clamp(0, 100, Math.round(input.deviceScore));
  }
  const hours = input.durationMin / 60;
  const duration =
    hours <= 0 ? 0 : hours < 7 ? hours / 7 : hours <= 9 ? 1 : clamp(0, 1, 1 - (hours - 9) / 3);
  const efficiency =
    input.efficiency == null ? 0.75 : clamp(0, 1, input.efficiency / 100);
  const restorative =
    input.deepMin == null && input.remMin == null
      ? 0.7
      : clamp(
          0,
          1,
          ((input.deepMin ?? 0) + (input.remMin ?? 0)) /
            Math.max(input.durationMin, 1),
        ) / 0.45;
  return clamp(
    0,
    100,
    Math.round((0.5 * duration + 0.3 * efficiency + 0.2 * clamp(0, 1, restorative)) * 100),
  );
}

export function demoSleepNight(provider: SleepSource, day: string): SleepNight {
  const score = 58 + Math.round(unitInterval(`${provider}:sleep:${day}`) * 36);
  const durationMin = 360 + Math.round(unitInterval(`${provider}:dur:${day}`) * 180);
  const deepMin = Math.round(durationMin * (0.12 + unitInterval(`${provider}:deep:${day}`) * 0.1));
  const remMin = Math.round(durationMin * (0.16 + unitInterval(`${provider}:rem:${day}`) * 0.1));
  const awakeMin = Math.round(durationMin * (0.04 + unitInterval(`${provider}:awake:${day}`) * 0.06));
  const lightMin = Math.max(0, durationMin - deepMin - remMin - awakeMin);
  const efficiency = 78 + Math.round(unitInterval(`${provider}:eff:${day}`) * 18);
  return {
    id: `sleep-${provider}-${day}`,
    metric: "sleep",
    day,
    score,
    durationMin,
    efficiency,
    deepMin,
    remMin,
    lightMin,
    awakeMin,
    source: provider,
    verified: provider !== "manual",
  };
}

/** One night per wake-day. A verified device night wins over a manual entry. */
export function collapseNights(nights: SleepNight[]): SleepNight[] {
  const byDay = new Map<string, SleepNight>();
  for (const night of nights) {
    if (night.metric !== "sleep") continue;
    const current = byDay.get(night.day);
    if (!current) {
      byDay.set(night.day, night);
      continue;
    }
    const prefer =
      night.verified !== current.verified
        ? night.verified
        : night.score > current.score;
    if (prefer) byDay.set(night.day, night);
  }
  return [...byDay.values()].sort((a, b) => a.day.localeCompare(b.day));
}

function wakeDays(start: Date, end: Date, asOf: Date): string[] {
  const cap = new Date(Math.min(asOf.getTime(), end.getTime() - 1));
  const days: string[] = [];
  let cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
  const last = new Date(Date.UTC(cap.getUTCFullYear(), cap.getUTCMonth(), cap.getUTCDate()));
  while (cursor.getTime() <= last.getTime() && cursor.getTime() < end.getTime()) {
    days.push(cursor.toISOString().slice(0, 10));
    cursor = new Date(cursor.getTime() + DAY_MS);
  }
  return days;
}

export interface SleepContest {
  mean: number;
  nights: number;
  elapsed: number;
  /** Mean, pulled down when nights are missing. 0 when nothing was recorded. */
  score: number;
}

export function sleepContest(
  nights: SleepNight[],
  start: Date,
  end: Date,
  asOf: Date,
): SleepContest {
  const days = wakeDays(start, end, asOf);
  const collapsed = collapseNights(nights).filter((night) => days.includes(night.day));
  if (collapsed.length === 0 || days.length === 0) {
    return { mean: 0, nights: 0, elapsed: days.length, score: 0 };
  }
  const mean = collapsed.reduce((sum, night) => sum + night.score, 0) / collapsed.length;
  const coverage = collapsed.length / days.length;
  const score = mean * (0.75 + 0.25 * coverage);
  return {
    mean: Math.round(mean * 10) / 10,
    nights: collapsed.length,
    elapsed: days.length,
    score: Math.round(score * 10) / 10,
  };
}

export interface SleepBoardRow {
  id: string;
  name: string;
  elo: number;
  /** Contest score used for place. */
  score: number;
  mean: number;
  lastNight: number | null;
  nights: number;
  you: boolean;
  place: number;
}

export function sleepBoard(input: {
  name: string;
  nights: SleepNight[];
  elo: number;
  periodStart: string;
  periodEnd: Date;
  asOf: Date;
}): SleepBoardRow[] {
  const yours = sleepContest(
    input.nights,
    new Date(input.periodStart),
    input.periodEnd,
    input.asOf,
  );
  const last = collapseNights(input.nights)
    .filter((night) => {
      const day = night.day;
      const startKey = input.periodStart.slice(0, 10);
      const endKey = input.periodEnd.toISOString().slice(0, 10);
      return day >= startKey && day < endKey && day <= dayKey(input.asOf);
    })
    .at(-1);

  const rows: SleepBoardRow[] = [
    {
      id: "you",
      name: input.name,
      elo: input.elo,
      score: yours.score,
      mean: yours.mean,
      lastNight: last?.score ?? null,
      nights: yours.nights,
      you: true,
      place: 0,
    },
  ];

  for (let index = 0; index < FIELD_RIVALS; index += 1) {
    const name = RIVAL_NAMES[index % RIVAL_NAMES.length]!;
    const id = `sleep-rival:${input.periodStart}:${index}`;
    const elo = clamp(
      ELO_FLOOR,
      ELO_CAP,
      input.elo + Math.round((unitInterval(`${id}:elo`) - 0.5) * 220),
    );
    const base = 64 + ((elo - 800) / 800) * 18;
    const mean = clamp(42, 96, base + (unitInterval(`${id}:mean`) - 0.5) * 14);
    const lastNight = clamp(40, 99, mean + (unitInterval(`${id}:last`) - 0.5) * 8);
    rows.push({
      id,
      name,
      elo,
      score: Math.round(mean * 10) / 10,
      mean: Math.round(mean * 10) / 10,
      lastNight: Math.round(lastNight),
      nights: yours.elapsed || 1,
      you: false,
      place: 0,
    });
  }

  rows.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  return rows.map((row, index) => ({ ...row, place: index + 1 }));
}

export interface SleepDayCell {
  day: string;
  label: string;
  night: SleepNight | null;
  future: boolean;
}

export interface SleepView {
  optedIn: boolean;
  elo: number;
  periodStart: Date;
  periodEnd: Date;
  lastNight: SleepNight | null;
  days: SleepDayCell[];
  mean: number;
  contestScore: number;
  nightsLogged: number;
  elapsedNights: number;
  previousMean: number | null;
  place: number | null;
  fieldSize: number;
  rows: SleepBoardRow[];
  latestResult: HealthPeriodResult | null;
}

export function buildSleepView(input: {
  name: string;
  nights: SleepNight[];
  rating: HealthRating;
  results: HealthPeriodResult[];
  now: Date;
}): SleepView {
  const periodStart = new Date(input.rating.lockPeriod);
  const periodEnd = weekEndAfter(periodStart);
  const asOf = input.now < periodEnd ? input.now : new Date(periodEnd.getTime() - 1);
  const contest = sleepContest(input.nights, periodStart, periodEnd, asOf);
  const days = wakeDays(periodStart, periodEnd, new Date(periodEnd.getTime() - 1));
  const collapsed = collapseNights(input.nights);
  const today = dayKey(input.now);
  const cells: SleepDayCell[] = days.map((day) => ({
    day,
    label: new Date(`${day}T12:00:00.000Z`).toLocaleDateString("en-US", {
      weekday: "narrow",
      timeZone: "UTC",
    }),
    night: collapsed.find((night) => night.day === day) ?? null,
    future: day > today,
  }));
  const lastNight =
    [...collapsed].reverse().find((night) => night.day <= today) ?? null;
  const priorEnd = periodStart;
  const priorStart = new Date(priorEnd.getTime() - 7 * DAY_MS);
  const prior = sleepContest(input.nights, priorStart, priorEnd, priorEnd);
  const rows = input.rating.optedIn
    ? sleepBoard({
        name: input.name,
        nights: input.nights,
        elo: input.rating.elo,
        periodStart: periodStart.toISOString(),
        periodEnd,
        asOf,
      })
    : [];
  const you = rows.find((row) => row.you) ?? null;
  return {
    optedIn: input.rating.optedIn,
    elo: input.rating.elo,
    periodStart,
    periodEnd,
    lastNight,
    days: cells,
    mean: contest.mean,
    contestScore: contest.score,
    nightsLogged: contest.nights,
    elapsedNights: contest.elapsed,
    previousMean: prior.nights > 0 ? prior.mean : null,
    place: you?.place ?? null,
    fieldSize: rows.length,
    rows,
    latestResult:
      input.results.find((result) => result.metric === "sleep") ?? null,
  };
}

export function stageShares(night: SleepNight): {
  deep: number;
  rem: number;
  light: number;
  awake: number;
} {
  const deep = night.deepMin ?? 0;
  const rem = night.remMin ?? 0;
  const light = night.lightMin ?? 0;
  const awake = night.awakeMin ?? 0;
  const total = deep + rem + light + awake;
  if (total <= 0) return { deep: 0, rem: 0, light: 1, awake: 0 };
  return {
    deep: deep / total,
    rem: rem / total,
    light: light / total,
    awake: awake / total,
  };
}

export function appendHealthResults(
  existing: HealthPeriodResult[],
  additions: HealthPeriodResult[],
): HealthPeriodResult[] {
  const seen = new Set(existing.map((row) => row.id));
  const next = [...additions.filter((row) => !seen.has(row.id)), ...existing];
  return next.slice(0, MAX_HEALTH_RESULTS);
}

export function settleSleepWeeks<T extends {
  name: string;
  sleepNights: SleepNight[];
  healthRatings: HealthRating[];
  healthResults: HealthPeriodResult[];
}>(
  state: T,
  now: Date,
  settledAt: string,
): T {
  let next = state;
  let guard = 0;
  while (guard < 12) {
    const rating = next.healthRatings.find((item) => item.metric === "sleep");
    if (!rating?.optedIn) break;
    const start = new Date(rating.lockPeriod);
    const end = weekEndAfter(start);
    if (end.getTime() > now.getTime()) break;
    const rows = sleepBoard({
      name: next.name,
      nights: next.sleepNights,
      elo: rating.elo,
      periodStart: start.toISOString(),
      periodEnd: end,
      asOf: new Date(end.getTime() - 1),
    });
    const you = rows.find((row) => row.you);
    const place = you ? you.place - 1 : rows.length - 1;
    const score = you?.score ?? 0;
    const eloAfter = settleElo(
      rating.elo,
      rows.filter((row) => !row.you).map((row) => row.elo),
      place,
      rows.length,
      score,
      false,
    );
    const result: HealthPeriodResult = {
      id: `health:sleep:${start.toISOString()}`,
      metric: "sleep",
      periodStart: start.toISOString(),
      periodEnd: end.toISOString(),
      place: place + 1,
      fieldSize: rows.length,
      score,
      eloBefore: rating.elo,
      eloAfter,
      settledAt,
    };
    const stillDue = weekEndAfter(end).getTime() <= now.getTime();
    next = {
      ...next,
      healthRatings: next.healthRatings.map((item) =>
        item.metric !== "sleep"
          ? item
          : {
              ...item,
              elo: eloAfter,
              lockElo: eloAfter,
              lockPeriod: end.toISOString(),
              optedIn: item.autoEnrollNext || stillDue,
            },
      ),
      healthResults: appendHealthResults(next.healthResults, [result]),
    };
    guard += 1;
  }

  const rating = next.healthRatings.find((item) => item.metric === "sleep");
  if (rating?.optedIn) {
    const end = weekEndAfter(new Date(rating.lockPeriod));
    if (end.getTime() <= now.getTime()) {
      const live = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
      next = {
        ...next,
        healthRatings: next.healthRatings.map((item) =>
          item.metric === "sleep"
            ? { ...item, lockPeriod: live.toISOString(), lockElo: item.elo }
            : item,
        ),
      };
    }
  }
  return next;
}
