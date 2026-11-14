import { type PaceRow } from "./compete/pace";
import { sportById } from "./compete/sports";
import {
  RACE_DISTANCES,
  raceClock,
  raceEditionChart,
  racePercentileBadge,
  type RaceBenchmarks,
  type RaceEditionAnalytics,
  type RaceResult,
} from "./race-rankings";

export type StandingsSource = "all" | "overtaek" | "published";

export interface StandingObservation {
  id: string;
  source: "overtaek" | "published";
  name: string;
  timeMs: number;
  subtitle: string;
  place: number;
  you?: boolean;
  badge?: string;
  raceResultId?: number;
  athleteId?: string;
}

export interface StandingsBin {
  bucket: number;
  count: number;
  height: number;
  fromMs: number;
  toMs: number;
  label: string;
  containsUser: boolean;
}

export interface StandingsDistribution {
  total: number;
  fastestMs: number;
  medianMs: number;
  slowestMs: number;
  minimumMs: number;
  binWidthMs: number;
  benchmarks: RaceBenchmarks | null;
  bins: StandingsBin[];
  yourTimeMs: number | null;
  yourBucket: number | null;
  yourPercentile: number | null;
}

const BENCHMARK_TO_RACE_SLUG: Record<string, (typeof RACE_DISTANCES)[number]["slug"]> = {
  "5k": "5k",
  "10k": "10k",
  half: "half-marathon",
  marathon: "marathon",
};

export function raceDistanceSlugForBenchmark(
  sport: "running" | "cycling",
  benchmarkId: string,
): (typeof RACE_DISTANCES)[number]["slug"] | null {
  if (sport !== "running") return null;
  return BENCHMARK_TO_RACE_SLUG[benchmarkId] ?? null;
}

function quantile(sortedAsc: number[], p: number): number {
  if (sortedAsc.length === 0) return 0;
  const idx = Math.min(sortedAsc.length - 1, Math.max(0, Math.floor((sortedAsc.length - 1) * p)));
  return sortedAsc[idx]!;
}

/**
 * Normalize Overtaek pace rows and/or published race results into one unified,
 * time-sorted leaderboard list.
 */
export function normalizeStandingsRows({
  source,
  sport,
  overtaekRows,
  publishedRows,
}: {
  source: StandingsSource;
  sport: "running" | "cycling";
  overtaekRows: readonly PaceRow[];
  publishedRows: readonly RaceResult[];
}): StandingObservation[] {
  const sportLabel = sportById(sport).name;
  const overtaek: StandingObservation[] =
    source === "published"
      ? []
      : overtaekRows.map((row) => ({
          id: `ot:${row.id}`,
          source: "overtaek",
          name: row.name,
          timeMs: Math.round(row.seconds * 1000),
          subtitle: row.city ? `${row.city} · Overtaek` : `${sportLabel} · Overtaek`,
          place: row.place,
          you: row.you,
          badge: "Overtaek",
          athleteId: row.id,
        }));

  const published: StandingObservation[] =
    source === "overtaek"
      ? []
      : publishedRows.map((row) => ({
          id: `pub:${row.id}`,
          source: "published",
          name: row.athlete_name,
          timeMs: row.rank_time_ms,
          subtitle: `${row.event_name} · ${row.edition_year}`,
          place: row.place,
          badge:
            row.percentile != null
              ? racePercentileBadge(row.percentile)
              : row.rank_clock === "chip"
                ? "Chip"
                : "Official",
          raceResultId: row.id,
        }));

  if (source === "published") return published;
  if (source === "overtaek") return overtaek;

  return [...overtaek, ...published]
    .sort((a, b) => a.timeMs - b.timeMs || a.name.localeCompare(b.name))
    .map((row, index) => ({ ...row, place: index + 1 }));
}

function buildDistributionFromSamples(
  timesMs: number[],
  yourTimeMs: number | null,
): StandingsDistribution | null {
  const valid = timesMs.filter((ms) => Number.isFinite(ms) && ms > 0).sort((a, b) => a - b);
  if (valid.length === 0) return null;

  const fastestMs = valid[0]!;
  const slowestMs = valid[valid.length - 1]!;
  const medianMs = quantile(valid, 0.5);
  const spread = Math.max(60_000, slowestMs - fastestMs);
  const binCount = Math.min(20, Math.max(5, valid.length));
  const binWidthMs = Math.max(1_000, Math.ceil(spread / binCount));
  const minimumMs = Math.max(0, fastestMs - (valid.length === 1 ? binWidthMs * 2 : 0));

  const counts = new Array<number>(binCount).fill(0);
  for (const ms of valid) {
    const bucket = Math.min(binCount - 1, Math.max(0, Math.floor((ms - minimumMs) / binWidthMs)));
    counts[bucket] = (counts[bucket] ?? 0) + 1;
  }
  const peak = Math.max(...counts, 1);
  const yourBucket =
    yourTimeMs != null
      ? Math.min(binCount - 1, Math.max(0, Math.floor((yourTimeMs - minimumMs) / binWidthMs)))
      : null;

  const slower = yourTimeMs != null ? valid.filter((ms) => ms > yourTimeMs).length : 0;
  const yourPercentile = yourTimeMs != null ? (slower / valid.length) * 100 : null;

  const benchmarks: RaceBenchmarks | null =
    valid.length >= 4
      ? {
          top1Ms: valid.length >= 20 ? quantile(valid, 0.01) : null,
          top5Ms: valid.length >= 10 ? quantile(valid, 0.05) : null,
          top10Ms: quantile(valid, 0.1),
          top25Ms: quantile(valid, 0.25),
          medianMs,
        }
      : null;

  return {
    total: valid.length,
    fastestMs,
    medianMs,
    slowestMs,
    minimumMs,
    binWidthMs,
    benchmarks,
    bins: counts.map((count, bucket) => {
      const fromMs = minimumMs + bucket * binWidthMs;
      const toMs = fromMs + binWidthMs;
      return {
        bucket,
        count,
        height: (count / peak) * 100,
        fromMs,
        toMs,
        label: `${raceClock(fromMs)} – under ${raceClock(toMs)}`,
        containsUser: yourBucket === bucket,
      };
    }),
    yourTimeMs,
    yourBucket,
    yourPercentile,
  };
}

function clampBucket(bucket: number, minBucket: number, maxBucket: number): number {
  return Math.min(maxBucket, Math.max(minBucket, bucket));
}

function estimateBucketMedianMs(bins: readonly { count: number; fromMs: number; toMs: number }[], total: number): number {
  if (bins.length === 0 || total <= 0) return 0;
  const target = total * 0.5;
  let seen = 0;
  for (const bin of bins) {
    if (seen + bin.count >= target && bin.count > 0) {
      const fraction = (target - seen) / bin.count;
      return Math.round(bin.fromMs + fraction * (bin.toMs - bin.fromMs));
    }
    seen += bin.count;
  }
  const mid = bins[Math.floor(bins.length / 2)];
  return mid ? Math.round((mid.fromMs + mid.toMs) * 0.5) : 0;
}

/**
 * Build a unified distribution chart model from Overtaek rows, published race
 * analytics, or both combined.
 */
export function buildStandingsDistribution({
  source,
  overtaekRows,
  publishedAnalytics,
  yourSeconds,
}: {
  source: StandingsSource;
  overtaekRows: readonly PaceRow[];
  publishedAnalytics?: RaceEditionAnalytics | null;
  yourSeconds: number | null;
}): StandingsDistribution | null {
  const yourTimeMs = yourSeconds != null && Number.isFinite(yourSeconds) && yourSeconds > 0 ? Math.round(yourSeconds * 1000) : null;
  const overtaekTimes = overtaekRows
    .map((r) => Math.round(r.seconds * 1000))
    .filter((ms) => Number.isFinite(ms) && ms > 0);

  if (source === "overtaek" || !publishedAnalytics) {
    if (source === "published") return null;
    return buildDistributionFromSamples(overtaekTimes, yourTimeMs);
  }

  const baseBins = raceEditionChart(publishedAnalytics);
  const minBucket = baseBins[0]?.bucket ?? 0;
  const maxBucket = baseBins[baseBins.length - 1]?.bucket ?? 0;
  const countsByBucket = new Map<number, number>(baseBins.map((b) => [b.bucket, b.count]));
  let total = publishedAnalytics.total;
  let fastestMs = publishedAnalytics.fastestMs;
  let slowestMs = publishedAnalytics.slowestMs;
  const rawBucket = (ms: number) =>
    Math.floor((ms - publishedAnalytics.minimumMs) / publishedAnalytics.binWidthMs);

  if (source === "all" && overtaekTimes.length > 0 && baseBins.length > 0) {
    for (const ms of overtaekTimes) {
      const bucket = clampBucket(rawBucket(ms), minBucket, maxBucket);
      countsByBucket.set(bucket, (countsByBucket.get(bucket) ?? 0) + 1);
      total += 1;
      if (ms < fastestMs) fastestMs = ms;
      if (ms > slowestMs) slowestMs = ms;
    }
  }

  const counts = baseBins.map((b) => countsByBucket.get(b.bucket) ?? b.count);
  const peak = Math.max(...counts, 1);
  const yourBucket =
    yourTimeMs != null && baseBins.length > 0
      ? clampBucket(rawBucket(yourTimeMs), minBucket, maxBucket)
      : null;

  const bins = baseBins.map((b) => {
    const count = countsByBucket.get(b.bucket) ?? b.count;
    const fromMs = publishedAnalytics.minimumMs + b.bucket * publishedAnalytics.binWidthMs;
    return {
      bucket: b.bucket,
      count,
      height: (count / peak) * 100,
      fromMs,
      toMs: fromMs + publishedAnalytics.binWidthMs,
      label: b.label,
      containsUser: yourBucket === b.bucket,
    };
  });

  let yourPercentile: number | null = null;
  if (yourTimeMs != null && yourBucket != null && total > 0) {
    if (yourTimeMs <= fastestMs) yourPercentile = 99.9;
    else if (yourTimeMs >= slowestMs) yourPercentile = 0.1;
    else {
      let slower = 0;
      for (const b of bins) {
        if (b.bucket > yourBucket) slower += b.count;
        else if (b.bucket === yourBucket) slower += b.count * 0.5;
      }
      yourPercentile = Math.max(0.1, Math.min(99.9, (slower / total) * 100));
    }
  }

  return {
    total,
    fastestMs,
    medianMs:
      source === "all" && overtaekTimes.length > 0 && bins.length > 0
        ? estimateBucketMedianMs(bins, total)
        : publishedAnalytics.medianMs,
    slowestMs,
    minimumMs: publishedAnalytics.minimumMs,
    binWidthMs: publishedAnalytics.binWidthMs,
    benchmarks: publishedAnalytics.benchmarks ?? null,
    bins,
    yourTimeMs,
    yourBucket,
    yourPercentile,
  };
}
