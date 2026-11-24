import "server-only";
import { compactReplayPage, raceDateBounds } from "@fitness-battle/shared";
import type { RaceCoverage, RaceResultsPage, ReplayCompactPage, raceQuery } from "@fitness-battle/shared";
import { createRankingsClient } from "./rankings";

const RESULTS_TTL_MS = 30 * 60 * 1000;
const COVERAGE_TTL_MS = 30 * 60 * 1000;

const resultsCache = new Map<string, { expiresAt: number; data: RaceResultsPage }>();
const resultsInFlight = new Map<string, Promise<RaceResultsPage>>();

const reportCache = new Map<number, { expiresAt: number; data: import("@fitness-battle/shared").RaceResultReport | null }>();
const reportInFlight = new Map<number, Promise<import("@fitness-battle/shared").RaceResultReport | null>>();

const replayCache = new Map<string, { expiresAt: number; data: import("@fitness-battle/shared").ReplayPage | null }>();
const replayCompactCache = new Map<string, { expiresAt: number; data: ReplayCompactPage | null }>();
const replayCompactInFlight = new Map<string, Promise<ReplayCompactPage | null>>();
let compactRpcUnavailable = false;
let previewsRpcUnavailable = false;

let coursePreviewsCache: { expiresAt: number; data: Record<string, [number, number][]> } | null = null;
let coursePreviewsInFlight: Promise<Record<string, [number, number][]>> | null = null;

let coverageCache: { expiresAt: number; data: RaceCoverage[] } | null = null;
let coverageInFlight: Promise<RaceCoverage[]> | null = null;
let backgroundWarmStarted = false;

function warmCommonRankingsScopes(_coverage: RaceCoverage[]) {
  if (backgroundWarmStarted) return;
  backgroundWarmStarted = true;

  const queue: Array<{ distance: string; sex: string; editionId: number | null }> = [
    { distance: "marathon", sex: "all", editionId: null },
    { distance: "10k", sex: "all", editionId: null },
    { distance: "half_marathon", sex: "all", editionId: null },
    { distance: "5k", sex: "all", editionId: null },
  ];

  setTimeout(() => {
    void (async () => {
      for (const item of queue) {
        try {
          await loadRaceResults(item.distance, {
            sex: item.sex as ReturnType<typeof raceQuery>["sex"],
            year: null,
            editionId: item.editionId,
            editionError: null,
            timeframe: "all",
            from: "",
            through: "",
            dateError: null,
            percentile: "all",
            query: "",
            page: 1,
            includeWheelchair: false,
          });
        } catch {
          // Ignore background warm-up errors
        }
      }
    })();
  }, 2500);
}

export async function loadRaceResults(distance: string, query: ReturnType<typeof raceQuery>): Promise<RaceResultsPage> {
  const client = createRankingsClient();
  if (!client) throw new Error("Rankings are not configured");
  if (query.editionError) throw new Error(query.editionError);
  const bounds = raceDateBounds(query);
  const percentile = query.percentile ?? "all";
  const baseParams = {
    p_distance: distance,
    p_sex: query.sex,
    p_year: query.year,
    p_edition_id: query.editionId,
    p_query: query.query,
    p_page: query.page,
    p_from: bounds.from,
    p_until: bounds.until,
    p_include_wheelchair: query.includeWheelchair,
  };
  const cacheKey = JSON.stringify({ ...baseParams, p_percentile: percentile });
  const now = Date.now();
  const cached = resultsCache.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    return cached.data;
  }
  const existingFlight = resultsInFlight.get(cacheKey);
  if (existingFlight) return existingFlight;

  const task = (async () => {
    try {
      let { data, error } = await client.rpc("rankings_page_scoped", {
        ...baseParams,
        p_percentile: percentile,
      });
      if (
        error
        && query.includeWheelchair
        && (error.code === "PGRST202" || /p_include_wheelchair|schema cache/i.test(error.message))
      ) {
        const { p_include_wheelchair: _wc, ...legacyParams } = baseParams;
        ({ data, error } = await client.rpc("rankings_page_scoped", {
          ...legacyParams,
          p_percentile: percentile,
        }));
      }
      // Fallback for Rankings DBs that have not yet applied 20261110060000_pace_percentiles.sql
      if (error && percentile === "all" && (error.code === "PGRST202" || /p_percentile|schema cache/i.test(error.message))) {
        const { p_include_wheelchair: _wc, ...legacyParams } = baseParams;
        ({ data, error } = await client.rpc("rankings_page_scoped", legacyParams));
      }
      if (error || !data) throw new Error("Rankings unavailable");
      const page = data as RaceResultsPage;
      if (resultsCache.size > 400) {
        const firstKey = resultsCache.keys().next().value;
        if (firstKey) resultsCache.delete(firstKey);
      }
      resultsCache.set(cacheKey, { expiresAt: Date.now() + RESULTS_TTL_MS, data: page });
      return page;
    } finally {
      resultsInFlight.delete(cacheKey);
    }
  })();

  resultsInFlight.set(cacheKey, task);
  return task;
}

export async function loadRaceReport(id: number): Promise<import("@fitness-battle/shared").RaceResultReport | null> {
  const now = Date.now();
  const cached = reportCache.get(id);
  if (cached && cached.expiresAt > now) return cached.data;
  const inflight = reportInFlight.get(id);
  if (inflight) return inflight;

  const client = createRankingsClient();
  if (!client) throw new Error("Rankings are not configured");

  const task = (async () => {
    try {
      const { data, error } = await client.rpc("rankings_result_with_identity", { p_id: id });
      if (error) throw new Error("Result unavailable");
      if (reportCache.size > 300) {
        const firstKey = reportCache.keys().next().value;
        if (firstKey !== undefined) reportCache.delete(firstKey);
      }
      reportCache.set(id, { expiresAt: Date.now() + RESULTS_TTL_MS, data });
      return data;
    } finally {
      reportInFlight.delete(id);
    }
  })();

  reportInFlight.set(id, task);
  return task;
}

export async function loadSavedRaceResults(ids: number[]): Promise<import("@fitness-battle/shared").SavedRaceResult[]> {
  const client = createRankingsClient();
  if (!client) throw new Error("Rankings are not configured");
  const { data, error } = await client.rpc("rankings_saved", { p_ids: ids });
  if (error || !Array.isArray(data)) throw new Error("Results unavailable");
  return data;
}

export async function loadRaceCoverage(): Promise<import("@fitness-battle/shared").RaceCoverage[]> {
  const now = Date.now();
  if (coverageCache && coverageCache.expiresAt > now) {
    warmCommonRankingsScopes(coverageCache.data);
    return coverageCache.data;
  }
  if (coverageInFlight) return coverageInFlight;

  const client = createRankingsClient();
  if (!client) throw new Error("Rankings are not configured");

  coverageInFlight = (async () => {
    try {
      const { data, error } = await client.rpc("rankings_coverage");
      if (error || !Array.isArray(data)) throw new Error("Coverage unavailable");
      const typed = data as RaceCoverage[];
      coverageCache = { expiresAt: Date.now() + COVERAGE_TTL_MS, data: typed };
      warmCommonRankingsScopes(typed);
      return typed;
    } finally {
      coverageInFlight = null;
    }
  })();

  return coverageInFlight;
}

export async function loadEditionHistory(edition: number, distance: string, sex: string): Promise<import("@fitness-battle/shared").RaceEditionTrend[]> {
  const client = createRankingsClient();
  if (!client) throw new Error("Rankings unavailable");
  const { data, error } = await client.rpc("rankings_edition_history", { p_edition_id: edition, p_distance: distance, p_sex: sex });
  if (error || !Array.isArray(data)) throw new Error("History unavailable");
  return data;
}

export async function loadAthleteHistory(id: number, page: number): Promise<import("@fitness-battle/shared").RaceAthleteHistory | null> {
  const client = createRankingsClient();
  if (!client) throw new Error("Rankings unavailable");
  const { data, error } = await client.rpc("rankings_athlete_page", { p_athlete_id: id, p_page: page });
  if (error) throw new Error("Athlete history unavailable");
  return data;
}

export async function loadReplayPage(
  edition: number,
  distance: string,
  sex: string,
  clock: string,
  ids: number[] | null,
  after: number,
  includeWheelchair = false,
): Promise<import("@fitness-battle/shared").ReplayPage | null> {
  const key = JSON.stringify({ edition, distance, sex, clock, ids, after, includeWheelchair });
  const now = Date.now();
  const cached = replayCache.get(key);
  if (cached && cached.expiresAt > now) return cached.data;

  const client = createRankingsClient();
  if (!client) throw new Error("Rankings unavailable");
  const baseParams = {
    p_edition_id: edition,
    p_distance: distance,
    p_sex: sex,
    p_clock: clock,
    p_ids: ids,
    p_after: after,
    p_include_wheelchair: includeWheelchair,
  };
  let { data, error } = await client.rpc("rankings_replay_page", baseParams);
  if (
    error
    && (error.code === "PGRST202" || /p_include_wheelchair|schema cache/i.test(error.message))
  ) {
    const { p_include_wheelchair: _wc, ...legacyParams } = baseParams;
    ({ data, error } = await client.rpc("rankings_replay_page", legacyParams));
  }
  if (error) throw new Error("Replay unavailable");
  if (replayCache.size > 100) {
    const firstKey = replayCache.keys().next().value;
    if (firstKey) replayCache.delete(firstKey);
  }
  replayCache.set(key, { expiresAt: Date.now() + RESULTS_TTL_MS, data });
  return data;
}

export async function loadReplayCompactPage(
  edition: number,
  distance: string,
  sex: string,
  clock: string,
  ids: number[] | null,
  after: number,
  includeWheelchair = false,
): Promise<ReplayCompactPage | null> {
  const key = JSON.stringify({ edition, distance, sex, clock, ids, after, includeWheelchair });
  const now = Date.now();
  const cached = replayCompactCache.get(key);
  if (cached && cached.expiresAt > now) return cached.data;
  const inflight = replayCompactInFlight.get(key);
  if (inflight) return inflight;

  const task = (async () => {
    try {
      const client = createRankingsClient();
      if (!client) throw new Error("Rankings unavailable");

      let result: ReplayCompactPage | null = null;
      if (!compactRpcUnavailable) {
        const baseParams = {
          p_edition_id: edition,
          p_distance: distance,
          p_sex: sex,
          p_clock: clock,
          p_ids: ids,
          p_after: after,
          p_limit: 5000,
          p_include_wheelchair: includeWheelchair,
        };
        let { data, error } = await client.rpc("rankings_replay_compact_page", baseParams);
        if (
          error
          && (error.code === "PGRST202" || /p_include_wheelchair|schema cache/i.test(error.message))
        ) {
          const { p_include_wheelchair: _wc, ...legacyParams } = baseParams;
          ({ data, error } = await client.rpc("rankings_replay_compact_page", legacyParams));
        }
        if (error && (error.code === "PGRST202" || /rankings_replay_compact_page|schema cache/i.test(error.message))) {
          compactRpcUnavailable = true;
        } else if (error) {
          throw new Error("Replay unavailable");
        } else {
          result = (data as ReplayCompactPage | null) ?? null;
        }
      }

      if (compactRpcUnavailable) {
        const clockTyped = clock === "gun" ? "gun" : "chip";
        const first = await loadReplayPage(edition, distance, sex, clock, ids, after, includeWheelchair);
        if (!first) {
          result = null;
        } else {
          const combined = compactReplayPage(first, clockTyped);
          let cursor = first.next;
          for (let batch = 1; batch < 5 && cursor !== null; batch++) {
            const nextPage = await loadReplayPage(edition, distance, sex, clock, ids, cursor, includeWheelchair);
            if (!nextPage) break;
            const compacted = compactReplayPage(nextPage, clockTyped);
            combined.runners.push(...compacted.runners);
            cursor = compacted.next;
          }
          combined.next = cursor;
          result = combined;
        }
      }

      if (replayCompactCache.size > 100) {
        const firstKey = replayCompactCache.keys().next().value;
        if (firstKey) replayCompactCache.delete(firstKey);
      }
      replayCompactCache.set(key, { expiresAt: Date.now() + RESULTS_TTL_MS, data: result });
      return result;
    } finally {
      replayCompactInFlight.delete(key);
    }
  })();

  replayCompactInFlight.set(key, task);
  return task;
}

function simplifyCourseOutline(points: [number, number, number][], maxPoints = 96): [number, number][] {
  if (points.length <= maxPoints) return points.map(p => [p[0], p[1]]);
  const out: [number, number][] = [];
  const step = (points.length - 1) / (maxPoints - 1);
  for (let i = 0; i < maxPoints; i++) {
    const pt = points[Math.min(points.length - 1, Math.round(i * step))];
    out.push([pt[0], pt[1]]);
  }
  return out;
}

export async function loadReplayCoursePreviews(coverage?: RaceCoverage[] | null): Promise<Record<string, [number, number][]>> {
  const now = Date.now();
  if (coursePreviewsCache && coursePreviewsCache.expiresAt > now) {
    return coursePreviewsCache.data;
  }
  if (coursePreviewsInFlight) return coursePreviewsInFlight;

  coursePreviewsInFlight = (async () => {
    try {
      const client = createRankingsClient();
      if (client && !previewsRpcUnavailable) {
        const { data, error } = await client.rpc("rankings_replay_course_previews");
        if (!error && Array.isArray(data)) {
          const previews: Record<string, [number, number][]> = {};
          for (const row of data as Array<{ edition_id: number; distance_slug: string; points?: [number, number, number][] }>) {
            if (Array.isArray(row.points) && row.points.length >= 2) {
              previews[`${row.edition_id}:${row.distance_slug}`] = simplifyCourseOutline(row.points);
            }
          }
          coursePreviewsCache = { expiresAt: Date.now() + COVERAGE_TTL_MS, data: previews };
          return previews;
        }
        if (error && (error.code === "PGRST202" || /rankings_replay_course_previews|schema cache/i.test(error.message))) {
          previewsRpcUnavailable = true;
        }
      }

      const list = coverage ?? (await loadRaceCoverage());
      const uniquePairs = Array.from(
        new Map(list.map(c => [`${c.edition_id}:${c.distance_slug}`, { editionId: c.edition_id, distance: c.distance_slug }])).values(),
      );
      const settled = await Promise.allSettled(
        uniquePairs.map(async pair => {
          const page = await loadReplayPage(pair.editionId, pair.distance, "all", "chip", null, 0);
          return { key: `${pair.editionId}:${pair.distance}`, points: page?.course?.points ?? null };
        }),
      );
      const previews: Record<string, [number, number][]> = {};
      for (const res of settled) {
        if (res.status === "fulfilled" && res.value.points && res.value.points.length >= 2) {
          previews[res.value.key] = simplifyCourseOutline(res.value.points);
        }
      }
      coursePreviewsCache = { expiresAt: Date.now() + COVERAGE_TTL_MS, data: previews };
      return previews;
    } finally {
      coursePreviewsInFlight = null;
    }
  })();

  return coursePreviewsInFlight;
}
