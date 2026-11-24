import {
  RACE_DISTANCES,
  compileReplayRunner,
  loadReplayField,
  type CompiledReplayRunner,
  type RaceCoverage,
  type ReplayData,
  type ReplayPage,
} from "@fitness-battle/shared";
import { mobileEnv } from "./env";

export type CachedReplayField = {
  data: ReplayData;
  compiled: CompiledReplayRunner[];
};

let coverageMemoryCache: RaceCoverage[] | null = null;
let coverageInFlight: Promise<RaceCoverage[] | null> | null = null;

let coursePreviewsMemoryCache: Record<string, [number, number][]> | null = null;
let coursePreviewsInFlight: Promise<Record<string, [number, number][]> | null> | null = null;

const replayFieldCache = new Map<string, CachedReplayField>();
const replayFieldInFlight = new Map<string, Promise<CachedReplayField>>();

export function getCachedCoverage(): RaceCoverage[] | null {
  return coverageMemoryCache;
}

export function getCachedCoursePreviews(): Record<string, [number, number][]> {
  return coursePreviewsMemoryCache ?? {};
}

export function getCachedReplayField(key: string): CachedReplayField | null {
  return replayFieldCache.get(key) ?? null;
}

export function loadCoverageCached(): Promise<RaceCoverage[] | null> {
  if (coverageMemoryCache) return Promise.resolve(coverageMemoryCache);
  if (coverageInFlight) return coverageInFlight;
  coverageInFlight = fetch(`${mobileEnv.apiUrl}/api/rankings/coverage`)
    .then(r => (r.ok ? (r.json() as Promise<RaceCoverage[]>) : null))
    .then(list => {
      if (Array.isArray(list)) {
        coverageMemoryCache = list;
        return list;
      }
      return null;
    })
    .catch(() => null)
    .finally(() => {
      coverageInFlight = null;
    });
  return coverageInFlight;
}

export function loadCoursePreviewsCached(): Promise<Record<string, [number, number][]> | null> {
  if (coursePreviewsMemoryCache) return Promise.resolve(coursePreviewsMemoryCache);
  if (coursePreviewsInFlight) return coursePreviewsInFlight;
  coursePreviewsInFlight = fetch(`${mobileEnv.apiUrl}/api/rankings/courses`)
    .then(r => (r.ok ? (r.json() as Promise<Record<string, [number, number][]>>) : null))
    .then(map => {
      if (map && typeof map === "object") {
        coursePreviewsMemoryCache = map;
        return map;
      }
      return null;
    })
    .catch(() => null)
    .finally(() => {
      coursePreviewsInFlight = null;
    });
  return coursePreviewsInFlight;
}

export function replayScopeCacheKey(
  editionId: number,
  distanceSlug: string,
  sex: string,
  ids?: string | null,
  includeWheelchair = false,
): string {
  const params = new URLSearchParams({
    edition: String(editionId),
    distance: distanceSlug,
    sex,
    clock: "chip",
  });
  if (includeWheelchair) params.set("wheelchair", "1");
  return `${params.toString()}|${ids ?? ""}`;
}

export function loadAndCompileReplayField({
  editionId,
  distanceSlug,
  sex,
  ids = null,
  includeWheelchair = false,
  signal,
  onProgress,
}: {
  editionId: number;
  distanceSlug: string;
  sex: string;
  ids?: string | null;
  includeWheelchair?: boolean;
  signal?: AbortSignal;
  onProgress?: (count: number) => void;
}): Promise<CachedReplayField> {
  const key = replayScopeCacheKey(editionId, distanceSlug, sex, ids, includeWheelchair);
  const cached = replayFieldCache.get(key);
  if (cached) return Promise.resolve(cached);

  const inFlight = replayFieldInFlight.get(key);
  if (inFlight && !signal) return inFlight;

  const storedDistance = RACE_DISTANCES.find(d => d.slug === distanceSlug)?.stored ?? "marathon";
  const scopeParams = new URLSearchParams({
    edition: String(editionId),
    distance: distanceSlug,
    sex,
    clock: "chip",
  });
  if (includeWheelchair) scopeParams.set("wheelchair", "1");

  const promise = loadReplayField(
    async after => {
      const params = new URLSearchParams(scopeParams);
      params.set("after", String(after));
      if (ids !== null && ids.trim() !== "") params.set("ids", ids);
      const res = await fetch(`${mobileEnv.apiUrl}/api/rankings/replay?${params}`, { signal });
      if (!res.ok) {
        throw new Error(
          res.status === 404
            ? "Reviewed course and checkpoint timing profiles are not yet available for this race edition."
            : "Replay could not load.",
        );
      }
      return (await res.json()) as ReplayPage;
    },
    () => Boolean(signal?.aborted),
    onProgress ?? (() => {}),
  )
    .then(value => {
      const compiled: CompiledReplayRunner[] = [];
      for (const r of value.runners) {
        const c = compileReplayRunner(r, storedDistance);
        if (c) compiled.push(c);
      }
      const entry: CachedReplayField = { data: value, compiled };
      if (replayFieldCache.size >= 8) {
        const oldest = replayFieldCache.keys().next().value;
        if (oldest) replayFieldCache.delete(oldest);
      }
      replayFieldCache.set(key, entry);
      return entry;
    })
    .finally(() => {
      replayFieldInFlight.delete(key);
    });

  if (!signal) replayFieldInFlight.set(key, promise);
  return promise;
}
