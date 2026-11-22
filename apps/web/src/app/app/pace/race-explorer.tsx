"use client";

import Link from "next/link";
import { AppHeading, typographyStyle } from "@/ui/section";
import { Fragment, useEffect, useId, useMemo, useRef, useState } from "react";
import {
  analyzeRaceSplits,
  RACE_CATEGORY_FILTERS,
  RACE_DISTANCES,
  RACE_METERS,
  raceClock,
  raceEditionOptions,
  raceEventGroups,
  racePercentileBadge,
  racePercentLabel,
  type RaceCoverage,
  type RaceEditionAnalytics,
  type RaceResultReport,
  type RaceResultsPage,
  type RaceTimingSplits,
  type SavedRaceResult,
  type raceQuery,
} from "@fitness-battle/shared";
import { useAuth } from "@/components/auth-context";
import { useCompete } from "@/components/compete-context";
import { useRaceFavorites } from "./favorites";
import { computeSplitMetrics, SportFilterBar, SPORTS, type SportId } from "./sport-filter-bar";

type Query = ReturnType<typeof raceQuery>;

const SAVED_EDITIONS_KEY = "overtaek:saved-editions:v1";
const PINNED_PERFORMANCE_KEY = "overtaek:pinned-athletes:v2";
const OVERLAY_EDITIONS_KEY = "overtaek:overlay-editions:v1";
const OVERLAY_COLORS = ["#637482", "#142b3b", "#24765c"] as const;

const clientResultsCache = new Map<string, RaceResultsPage>();
const rowSplitsMemoryCache = new Map<number, RaceTimingSplits | null>();
const reportMemoryCache = new Map<number, RaceResultReport>();
let splitDictionaryLoaded = false;

type PinnedRecord = {
  id: number;
  name: string;
  timeMs: number;
  eventName: string;
  year: number;
  distanceSlug: string;
};

type OverlayDataset = {
  editionId: number;
  label: string;
  analytics: RaceEditionAnalytics;
};

export function formatEditionDisplay(eventName: string, year: number): string {
  const trimmed = eventName.trim();
  return trimmed.includes(String(year)) ? trimmed : `${trimmed} ${year}`;
}

function gaussianSmooth(values: number[]): number[] {
  return values.map((_, i) => {
    let sum = 0;
    let weightSum = 0;
    for (let k = -2; k <= 2; k++) {
      const idx = Math.max(0, Math.min(values.length - 1, i + k));
      const w = Math.exp((-0.5 * k * k) / 1.8);
      sum += values[idx] * w;
      weightSum += w;
    }
    return weightSum > 0 ? sum / weightSum : 0;
  });
}

function catmullRomPath(points: [number, number][]): string {
  if (!points.length) return "";
  if (points.length === 1) return `M${points[0][0].toFixed(2)} ${points[0][1].toFixed(2)}`;
  let out = `M${points[0][0].toFixed(2)} ${points[0][1].toFixed(2)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];
    const c1: [number, number] = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: [number, number] = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    out += ` C${c1[0].toFixed(2)} ${c1[1].toFixed(2)} ${c2[0].toFixed(2)} ${c2[1].toFixed(2)} ${p2[0].toFixed(2)} ${p2[1].toFixed(2)}`;
  }
  return out;
}

function inferEditionDate(eventName: string, year: number): string {
  const lower = eventName.toLowerCase();
  if (lower.includes("boston")) return `Apr 21, ${year}`;
  if (lower.includes("london")) return `Apr 27, ${year}`;
  if (lower.includes("eesti")) return `Sep 7, ${year}`;
  if (lower.includes("berlin")) return `Sep 21, ${year}`;
  if (lower.includes("chicago")) return `Oct 12, ${year}`;
  return String(year);
}

function estimateAtTimeMs(analytics: RaceEditionAnalytics | null | undefined, targetMs: number) {
  if (!analytics || !analytics.bins.length || analytics.total <= 0) return null;
  const binMap = new Map(analytics.bins.map(b => [b.bucket, b.count]));
  const maxBucket = Math.max(...analytics.bins.map(b => b.bucket), 0);
  let fasterCount = 0;
  for (let b = 0; b <= maxBucket; b++) {
    const count = binMap.get(b) ?? 0;
    if (!count) continue;
    const binStart = analytics.minimumMs + b * analytics.binWidthMs;
    const binEnd = binStart + analytics.binWidthMs;
    if (targetMs >= binEnd) {
      fasterCount += count;
    } else if (targetMs > binStart) {
      fasterCount += count * ((targetMs - binStart) / Math.max(1, analytics.binWidthMs));
    }
  }
  const rank = Math.max(1, Math.min(analytics.total, Math.round(fasterCount) + 1));
  const fasterThan = Math.max(0, Math.min(100, ((analytics.total - fasterCount) / analytics.total) * 100));
  const bucket = Math.max(0, Math.min(maxBucket, Math.floor((targetMs - analytics.minimumMs) / Math.max(1, analytics.binWidthMs))));
  return { rank, fasterThan, total: analytics.total, bucket };
}

export function SplitSparkline({ splits, distanceSlug }: { splits: RaceTimingSplits | null | undefined; distanceSlug: string }) {
  const analysis = useMemo(() => analyzeRaceSplits(splits, distanceSlug), [splits, distanceSlug]);
  if (analysis.status !== "ready" || !splits) {
    return <span className="ovt-hint" title="Recorded checkpoint splits are not available for this result">—</span>;
  }
  const validPaces = analysis.rows.map(r => r.paceMsPerKm).filter((p): p is number => p !== null && Number.isFinite(p) && p > 0);
  if (validPaces.length < 2) return <span className="ovt-hint">—</span>;
  const mean = validPaces.reduce((a, b) => a + b, 0) / validPaces.length;
  const minP = Math.min(...validPaces, mean * 0.92);
  const maxP = Math.max(...validPaces, mean * 1.08);
  const span = Math.max(1, maxP - minP);
  const d = validPaces
    .map((p, idx) => {
      const x = 5 + (idx / Math.max(1, validPaces.length - 1)) * 100;
      const y = 4 + ((p - minP) / span) * 15;
      return `${idx === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
  const { stroke, badge, tone } = computeSplitMetrics(analysis, splits.finishMs);
  return (
    <span className="ovt-split-cell" title={tone === "negative" ? `Negative split (${badge})` : tone === "positive" ? `Positive split (${badge})` : "Even split"}>
      <svg className="ovt-micro-spark" viewBox="0 0 110 23" aria-label="Recorded checkpoint pace profile">
        <path d={d} fill="none" stroke={stroke} strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {badge && <span className={`ovt-split-badge ${tone}`}>{badge}</span>}
    </span>
  );
}

export const coursePreviewsMemoryCache: { data: Record<string, [number, number][]> | null } = { data: null };

export function RaceRouteArt({
  eventName,
  year,
  coursePoints,
}: {
  editionId?: number;
  eventName: string;
  year: number;
  coursePoints?: [number, number][] | null;
}) {
  const city = useMemo(() => {
    const lower = eventName.toLowerCase();
    if (lower.includes("chicago")) return "CHICAGO";
    if (lower.includes("berlin")) return "BERLIN";
    if (lower.includes("london")) return "LONDON";
    if (lower.includes("boston")) return "BOSTON";
    if (lower.includes("eesti")) return "TALLINN";
    return eventName.replace(/\b20\d\d\b/g, "").trim().split(/\s+/).slice(0, 2).join(" ").toUpperCase();
  }, [eventName]);

  const projected = useMemo(() => {
    if (!coursePoints || coursePoints.length < 2) return null;
    const lons = coursePoints.map(p => p[0]);
    const lats = coursePoints.map(p => p[1]);
    const minLon = Math.min(...lons);
    const maxLon = Math.max(...lons);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const midLatRad = (((minLat + maxLat) / 2) * Math.PI) / 180;
    const cosLat = Math.max(0.2, Math.cos(midLatRad));
    const spanX = Math.max(1e-6, (maxLon - minLon) * cosLat);
    const spanY = Math.max(1e-6, maxLat - minLat);

    const W = 460;
    const H = 180;
    const padX = 54;
    const padY = 26;
    const scale = Math.min((W - padX * 2) / spanX, (H - padY * 2) / spanY);
    const drawW = spanX * scale;
    const drawH = spanY * scale;
    const offsetX = (W - drawW) / 2;
    const offsetY = (H - drawH) / 2;

    const pts: [number, number][] = coursePoints.map(([lon, lat]) => [
      offsetX + (lon - minLon) * cosLat * scale,
      offsetY + (maxLat - lat) * scale,
    ]);
    const path = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
    return { path, start: pts[0], end: pts[pts.length - 1] };
  }, [coursePoints]);

  return (
    <div className={`ovt-race-art ${projected ? "has-gps" : "no-gps"}`}>
      <span className="ovt-artlabel">{city} · {year}</span>
      <svg viewBox="0 0 460 180" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
        <g fill="none" stroke="#9fa5af" strokeOpacity=".13" strokeWidth="1">
          <path d="M0 36H460M0 90H460M0 144H460M92 0V180M184 0V180M276 0V180M368 0V180" />
        </g>
        {projected && (
          <>
            <path d={projected.path} fill="none" stroke="#FFB800" strokeOpacity=".22" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" />
            <path d={projected.path} fill="none" stroke="#FFB800" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx={projected.start[0]} cy={projected.start[1]} r="5.5" fill="#ffffff" stroke="#142b3b" strokeWidth="2.5" />
            <circle cx={projected.end[0]} cy={projected.end[1]} r="5.5" fill="#FFB800" stroke="#142b3b" strokeWidth="2.5" />
          </>
        )}
      </svg>
      {!projected && <span className="ovt-art-nogps">NO GPS MAP</span>}
      <span className="ovt-artyr">{year}</span>
    </div>
  );
}

export function RaceExplorer({
  distance: initialDistance,
  initial,
  query,
  coverage,
  initialCoursePreviews,
}: {
  distance: string;
  initial: RaceResultsPage | null;
  query: Query;
  coverage: RaceCoverage[] | null;
  initialCoursePreviews?: Record<string, [number, number][]>;
}) {
  const gradId = useId();
  const { user } = useAuth();
  const { state: competeState } = useCompete();
  const saved = useRaceFavorites();

  const [coursePreviews] = useState<Record<string, [number, number][]>>(() => {
    if (initialCoursePreviews) {
      coursePreviewsMemoryCache.data = initialCoursePreviews;
      return initialCoursePreviews;
    }
    return coursePreviewsMemoryCache.data ?? {};
  });

  const [sport, setSport] = useState<SportId>("running");
  const [sportFormat, setSportFormat] = useState<string>(initialDistance);
  const [distance, setDistance] = useState(initialDistance);
  const [edition, setEdition] = useState(query.editionId?.toString() ?? "");
  const [search, setSearch] = useState(query.query);
  const [sex, setSex] = useState(query.sex);

  const activeSportObj = SPORTS.find(s => s.id === sport) ?? SPORTS[0];
  const isRunningSport = sport === "running";

  const [data, setData] = useState<RaceResultsPage | null>(initial);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initial) {
      clientResultsCache.set(`${initialDistance}|${query.editionId ?? ""}|${query.sex}|all|${query.query}|${query.page}`, initial);
    }
  }, []);

  const currentDistanceObj = RACE_DISTANCES.find(d => d.slug === distance) ?? RACE_DISTANCES[3];
  const storedDistance = currentDistanceObj.stored;

  const editions = useMemo(() => raceEditionOptions(coverage ?? [], storedDistance), [coverage, storedDistance]);
  const eventGroups = useMemo(
    () => raceEventGroups(coverage ?? [], sex).filter(g => g.distance_slug === storedDistance),
    [coverage, sex, storedDistance],
  );

  const [hoverTimeMs, setHoverTimeMs] = useState<number | null>(null);
  const [inspectTimeMs, setInspectTimeMs] = useState<number | null>(null);
  const [selectedBucket, setSelectedBucket] = useState<number | null>(null);

  const [zoomRange, setZoomRange] = useState<[number, number]>([0, 0.72]);
  const dragHandleRef = useRef<"left" | "right" | "pan" | null>(null);
  const dragStartRef = useRef<{ x: number; startRange: [number, number] }>({ x: 0, startRange: [0, 1] });
  const zoomTrackRef = useRef<HTMLDivElement | null>(null);
  const pinchDistRef = useRef<number | null>(null);
  const chartPanRef = useRef<{ active: boolean; didDrag: boolean; startX: number; startRange: [number, number] } | null>(null);
  const [isPanningChart, setIsPanningChart] = useState(false);

  const [overlayIds, setOverlayIds] = useState<number[]>([]);
  const [overlayData, setOverlayData] = useState<Record<string, OverlayDataset>>({});
  const overlayInFlightRef = useRef<Set<string>>(new Set());

  const [pinnedList, setPinnedList] = useState<PinnedRecord[]>([]);
  const [savedEditions, setSavedEditions] = useState<number[]>([]);

  const [modalMode, setModalMode] = useState<"races" | "compare" | null>(null);
  const [modalSearch, setModalSearch] = useState("");
  const [expandedRowId, setExpandedRowId] = useState<number | null>(null);
  const [expandedReports, setExpandedReports] = useState<Record<number, RaceResultReport>>({});
  const [reportBusyId, setReportBusyId] = useState<number | null>(null);

  const [rowSplits, setRowSplits] = useState<Record<number, RaceTimingSplits | null>>(() => {
    const init: Record<number, RaceTimingSplits | null> = {};
    rowSplitsMemoryCache.forEach((v, k) => {
      init[k] = v;
    });
    return init;
  });

  const [savedDetails, setSavedDetails] = useState<SavedRaceResult[]>([]);

  useEffect(() => {
    try {
      const rawPin = localStorage.getItem(PINNED_PERFORMANCE_KEY);
      if (rawPin) {
        const parsed = JSON.parse(rawPin) as unknown;
        if (Array.isArray(parsed)) {
          setPinnedList(
            parsed.filter(
              (p): p is PinnedRecord =>
                Boolean(p) && typeof (p as PinnedRecord).id === "number" && typeof (p as PinnedRecord).timeMs === "number",
            ),
          );
        }
      }
      if (user) {
        const rawEd = localStorage.getItem(SAVED_EDITIONS_KEY);
        if (rawEd) {
          const parsed = JSON.parse(rawEd) as unknown;
          if (Array.isArray(parsed)) setSavedEditions(parsed.filter((x): x is number => typeof x === "number"));
        }
      } else {
        setSavedEditions([]);
      }
      const rawOv = sessionStorage.getItem(`${OVERLAY_EDITIONS_KEY}:${distance}`);
      if (rawOv) {
        const parsed = JSON.parse(rawOv) as unknown;
        if (Array.isArray(parsed)) setOverlayIds(parsed.filter((x): x is number => typeof x === "number").slice(0, 3));
      }
    } catch {}
  }, [distance, user]);

  const abortControllerRef = useRef<AbortController | null>(null);
  function fetchResultsClient(next: {
    distance?: string;
    edition?: string;
    sex?: string;
    search?: string;
    page?: number;
    preserveSelection?: boolean;
  }) {
    const d = next.distance ?? distance;
    const ed = next.edition ?? edition;
    const sx = next.sex ?? sex;
    const q = (next.search ?? search).trim();
    const pg = next.page ?? 1;

    if (!next.preserveSelection) {
      setSelectedBucket(null);
      setInspectTimeMs(null);
    }

    const cacheKey = `${d}|${ed}|${sx}|all|${q}|${pg}`;
    const urlParams = new URLSearchParams({ distance: d, sex: sx, timeframe: "all", page: String(pg) });
    if (ed) urlParams.set("edition", ed);
    if (q) urlParams.set("q", q);

    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", `/app/pace?${urlParams.toString()}`);
    }

    const cached = clientResultsCache.get(cacheKey);
    if (cached) {
      setData(cached);
      setLoading(false);
      return;
    }

    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;
    setLoading(true);

    fetch(`/api/rankings?${urlParams.toString()}`, { signal: controller.signal })
      .then(r => (r.ok ? r.json() : null))
      .then((res: RaceResultsPage | null) => {
        if (!controller.signal.aborted && res) {
          clientResultsCache.set(cacheKey, res);
          setData(res);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
  }

  function requireAuth(action: "save" | "pin", target?: string): boolean {
    if (user) return false;
    window.dispatchEvent(new CustomEvent("ovt:require-auth", { detail: { action, target } }));
    return true;
  }

  function toggleSavedEdition(edId: number, label?: string) {
    if (requireAuth("save", label ?? "this race edition")) return;
    setSavedEditions(prev => {
      const next = prev.includes(edId) ? prev.filter(id => id !== edId) : [...prev, edId];
      try {
        localStorage.setItem(SAVED_EDITIONS_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }

  const analytics = data?.analytics ?? null;

  function pinRow(row: { id: number; athlete_name: string; rank_time_ms: number; event_name: string; edition_year: number; distance_slug: string }) {
    setPinnedList(prev => {
      const exists = prev.some(p => p.id === row.id);
      const next = exists
        ? prev.filter(p => p.id !== row.id)
        : [
            ...prev.slice(-3),
            {
              id: row.id,
              name: row.athlete_name,
              timeMs: row.rank_time_ms,
              eventName: row.event_name,
              year: row.edition_year,
              distanceSlug: row.distance_slug,
            },
          ];
      try {
        if (next.length > 0) localStorage.setItem(PINNED_PERFORMANCE_KEY, JSON.stringify(next));
        else localStorage.removeItem(PINNED_PERFORMANCE_KEY);
      } catch {}
      if (!exists && analytics && analytics.bins.length > 0) {
        const maxBucket = Math.max(...analytics.bins.map(b => b.bucket), 0);
        const totalBins = Math.max(1, maxBucket + 1);
        const fullMinMs = analytics.minimumMs;
        const fullMaxMs = analytics.minimumMs + totalBins * analytics.binWidthMs;
        const frac = Math.max(0, Math.min(1, (row.rank_time_ms - fullMinMs) / Math.max(1, fullMaxMs - fullMinMs)));
        setZoomRange(([lo, hi]) => {
          if (frac >= lo && frac <= hi) return [lo, hi];
          const span = hi - lo;
          const nextLo = Math.max(0, Math.min(1 - span, frac - span / 2));
          return [Number(nextLo.toFixed(3)), Number((nextLo + span).toFixed(3))];
        });
      }
      return next;
    });
  }

  function unpinId(id: number) {
    setPinnedList(prev => {
      const next = prev.filter(p => p.id !== id);
      try {
        if (next.length > 0) localStorage.setItem(PINNED_PERFORMANCE_KEY, JSON.stringify(next));
        else localStorage.removeItem(PINNED_PERFORMANCE_KEY);
      } catch {}
      return next;
    });
  }

  const savedIdsKey = saved.ids.join(",");
  useEffect(() => {
    if (!saved.ready || !savedIdsKey) {
      setSavedDetails([]);
      return;
    }
    let cancelled = false;
    fetch(`/api/rankings/saved?ids=${savedIdsKey}`)
      .then(r => (r.ok ? r.json() : []))
      .then((rows: SavedRaceResult[]) => {
        if (!cancelled && Array.isArray(rows)) setSavedDetails(rows);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [saved.ready, savedIdsKey]);

  useEffect(() => {
    if (splitDictionaryLoaded) return;
    splitDictionaryLoaded = true;
    fetch("/api/rankings/replay?edition=6&distance=marathon&sex=all&clock=chip")
      .then(res => (res.ok ? res.json() : null))
      .then((payload: { runners?: Array<{ id: number; splits?: RaceTimingSplits }> } | null) => {
        if (!Array.isArray(payload?.runners)) return;
        const batch: Record<number, RaceTimingSplits | null> = {};
        for (const r of payload.runners) {
          if (!r.splits) continue;
          rowSplitsMemoryCache.set(r.id, r.splits);
          batch[r.id] = r.splits;
        }
        setRowSplits(prev => ({ ...prev, ...batch }));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      const targets: Array<{ d: string; ed: string; sx: string }> = [
        ...RACE_CATEGORY_FILTERS.map(c => ({ d: distance, ed: edition, sx: c.value })),
        ...eventGroups.map(eg => ({ d: distance, ed: String(eg.edition_id), sx: sex })),
        ...RACE_DISTANCES.map(d => ({ d: d.slug, ed: "", sx: sex })),
      ];
      for (const t of targets) {
        if (cancelled) break;
        const key = `${t.d}|${t.ed}|${t.sx}|all||1`;
        if (clientResultsCache.has(key)) continue;
        const p = new URLSearchParams({ distance: t.d, sex: t.sx, timeframe: "all", page: "1" });
        if (t.ed) p.set("edition", t.ed);
        try {
          const res = await fetch(`/api/rankings?${p.toString()}`);
          if (res.ok) {
            clientResultsCache.set(key, (await res.json()) as RaceResultsPage);
          }
        } catch {}
      }
    }, 350);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [distance, sex, edition, eventGroups]);

  useEffect(() => {
    for (const edId of overlayIds) {
      const ovKey = `${distance}|${edId}|${sex}`;
      if (overlayData[ovKey] || overlayInFlightRef.current.has(ovKey)) continue;
      const meta = editions.find(e => e.edition_id === edId);
      const label = meta ? formatEditionDisplay(meta.event_name, meta.edition_year) : `Edition #${edId}`;
      const cachedPage = clientResultsCache.get(`${distance}|${edId}|${sex}|all||1`);
      if (cachedPage?.analytics) {
        setOverlayData(prev => ({
          ...prev,
          [ovKey]: { editionId: edId, label, analytics: cachedPage.analytics! },
        }));
        continue;
      }
      overlayInFlightRef.current.add(ovKey);
      const params = new URLSearchParams({ distance, edition: String(edId), sex, timeframe: "all", page: "1" });
      fetch(`/api/rankings?${params}`)
        .then(r => (r.ok ? r.json() : null))
        .then((page: RaceResultsPage | null) => {
          if (page) clientResultsCache.set(`${distance}|${edId}|${sex}|all||1`, page);
          if (page?.analytics) {
            setOverlayData(prev => ({
              ...prev,
              [ovKey]: { editionId: edId, label, analytics: page.analytics! },
            }));
          }
        })
        .catch(() => {})
        .finally(() => {
          overlayInFlightRef.current.delete(ovKey);
        });
    }
  }, [overlayIds, distance, sex, editions, overlayData]);

  function selectScopeEdition(edId: number | null) {
    const val = edId === null ? "" : String(edId);
    setEdition(val);
    setModalMode(null);
    fetchResultsClient({ edition: val, page: 1 });
  }

  function toggleOverlayEdition(edId: number) {
    if (edition) {
      setEdition("");
      fetchResultsClient({ edition: "", page: 1 });
    }
    setOverlayIds(prev => {
      const next = prev.includes(edId) ? prev.filter(id => id !== edId) : [...prev.slice(-2), edId];
      try {
        sessionStorage.setItem(`${OVERLAY_EDITIONS_KEY}:${distance}`, JSON.stringify(next));
      } catch {}
      return next;
    });
  }

  function openInReplayStudio(edId: number, distSlug = distance, runnerIds = "") {
    setModalMode(null);
    window.dispatchEvent(
      new CustomEvent("ovt:open-replay", {
        detail: { edition: String(edId), distance: distSlug, sex, clock: "chip", ids: runnerIds },
      }),
    );
  }

  const selectedEditionMeta = useMemo(
    () => editions.find(e => String(e.edition_id) === edition) ?? null,
    [editions, edition],
  );

  const personalEfforts = useMemo(() => {
    if (!user || !competeState?.activities) return [];
    const targetMeters = RACE_METERS[storedDistance];
    if (!targetMeters) return [];
    return competeState.activities
      .filter(a => a.sport === "running" && a.distanceM >= targetMeters && a.movingSec > 0)
      .map((a, idx) => ({
        pinId: -(idx + 1000),
        activityId: a.id,
        timeMs: Math.round(a.movingSec * (targetMeters / a.distanceM) * 1000),
        dateLabel: a.startedAt
          ? new Date(a.startedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
          : "Tracked effort",
      }))
      .sort((a, b) => a.timeMs - b.timeMs)
      .slice(0, 5);
  }, [user, competeState?.activities, storedDistance]);

  const activePins = useMemo(
    () => pinnedList.filter(p => p.distanceSlug === storedDistance),
    [pinnedList, storedDistance],
  );

  const savedForDistance = useMemo(
    () => savedDetails.filter(r => r.distance_slug === storedDistance),
    [savedDetails, storedDistance],
  );

  const allSavedPinned = useMemo(
    () => savedForDistance.length > 0 && savedForDistance.every(r => activePins.some(p => p.id === r.id)),
    [savedForDistance, activePins],
  );

  function toggleSavedAthletesPinned() {
    if (requireAuth("save", "your saved results")) return;
    if (!savedForDistance.length) return;
    setPinnedList(prev => {
      const savedIdSet = new Set(savedForDistance.map(r => r.id));
      let next: PinnedRecord[];
      if (allSavedPinned) {
        next = prev.filter(p => !savedIdSet.has(p.id));
      } else {
        const existingIds = new Set(prev.map(p => p.id));
        const toAdd: PinnedRecord[] = savedForDistance
          .filter(r => !existingIds.has(r.id))
          .map(r => ({
            id: r.id,
            name: r.athlete_name,
            timeMs: r.rank_time_ms,
            eventName: r.event_name,
            year: r.edition_year,
            distanceSlug: r.distance_slug,
          }));
        next = [...prev, ...toAdd];
      }
      try {
        if (next.length > 0) localStorage.setItem(PINNED_PERFORMANCE_KEY, JSON.stringify(next));
        else localStorage.removeItem(PINNED_PERFORMANCE_KEY);
      } catch {}
      return next;
    });
  }

  const visibleRows = useMemo(() => {
    if (!isRunningSport || !data?.rows) return [];
    return data.rows;
  }, [isRunningSport, data?.rows]);

  const chartSvgRef = useRef<SVGSVGElement | null>(null);

  const chartModel = useMemo(() => {
    if (!analytics || !analytics.bins.length || analytics.total <= 0) return null;
    const maxBucket = Math.max(...analytics.bins.map(b => b.bucket), 0);
    const totalBins = Math.max(1, maxBucket + 1);
    const fullMinMs = analytics.minimumMs;
    const fullMaxMs = analytics.minimumMs + totalBins * analytics.binWidthMs;
    const binMap = new Map(analytics.bins.map(b => [b.bucket, b.count]));
    const allDensities = Array.from({ length: totalBins }, (_, i) => (binMap.get(i) ?? 0) / Math.max(1, analytics.total));
    const allSmoothed = gaussianSmooth(allDensities);

    const startBin = Math.max(0, Math.min(totalBins - 2, Math.floor(zoomRange[0] * totalBins)));
    const endBin = Math.max(startBin + 2, Math.min(totalBins, Math.ceil(zoomRange[1] * totalBins)));
    const numBins = endBin - startBin;
    const minMs = fullMinMs + startBin * analytics.binWidthMs;
    const maxMs = fullMinMs + endBin * analytics.binWidthMs;

    const densities = allDensities.slice(startBin, endBin);
    const smoothed = allSmoothed.slice(startBin, endBin);

    const activeOverlays = (edition ? [] : overlayIds)
      .map((edId, idx) => {
        const ov = overlayData[`${distance}|${edId}|${sex}`];
        if (!ov || !ov.analytics.bins.length || ov.analytics.total <= 0) return null;
        const ovFull = Array(totalBins).fill(0) as number[];
        for (const b of ov.analytics.bins) {
          const centerMs = ov.analytics.minimumMs + (b.bucket + 0.5) * ov.analytics.binWidthMs;
          const targetIdx = Math.floor(((centerMs - fullMinMs) / Math.max(1, fullMaxMs - fullMinMs)) * totalBins);
          if (targetIdx >= 0 && targetIdx < totalBins) {
            ovFull[targetIdx] += b.count / ov.analytics.total;
          }
        }
        return {
          editionId: edId,
          label: ov.label,
          color: OVERLAY_COLORS[idx % OVERLAY_COLORS.length],
          dashed: idx === 1,
          smoothed: gaussianSmooth(ovFull).slice(startBin, endBin),
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);

    const maxDensity = Math.max(0.025, ...densities, ...smoothed, ...activeOverlays.flatMap(o => o.smoothed)) * 1.12;

    return { startBin, numBins, minMs, maxMs, densities, smoothed, activeOverlays, maxDensity };
  }, [analytics, overlayIds, overlayData, edition, distance, sex, zoomRange]);

  const activeInspectMs = hoverTimeMs ?? inspectTimeMs;
  const activeInspectStats = useMemo(
    () => (activeInspectMs !== null ? estimateAtTimeMs(analytics, activeInspectMs) : null),
    [analytics, activeInspectMs],
  );

  useEffect(() => {
    const svg = chartSvgRef.current;
    if (!svg) return;
    const onWheel = (e: WheelEvent) => {
      const rect = svg.getBoundingClientRect();
      const anchor = rect.width > 0 ? Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)) : 0.35;

      // 1. Trackpad pinch-to-zoom (browsers synthesize trackpad pinch as ctrlKey + deltaY)
      if (e.ctrlKey) {
        if (Math.abs(e.deltaY) < 0.5) return;
        e.preventDefault();
        setZoomRange(([lo, hi]) => {
          const span = hi - lo;
          const factor = Math.exp(e.deltaY * 0.012);
          const nextSpan = Math.max(0.12, Math.min(1, span * factor));
          const center = lo + anchor * span;
          const nextLo = Math.max(0, Math.min(1 - nextSpan, center - anchor * nextSpan));
          return [Number(nextLo.toFixed(3)), Number((nextLo + nextSpan).toFixed(3))];
        });
        return;
      }

      // 2. Trackpad horizontal two-finger slide -> pan or adjust window horizontally
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY) * 1.1 && Math.abs(e.deltaX) > 1.5) {
        e.preventDefault();
        setZoomRange(([lo, hi]) => {
          const span = hi - lo;
          const deltaFrac = (e.deltaX / Math.max(200, rect.width)) * span;
          if (span < 0.999) {
            const nextLo = Math.max(0, Math.min(1 - span, lo + deltaFrac));
            return [Number(nextLo.toFixed(3)), Number((nextLo + span).toFixed(3))];
          }
          // When at full width, horizontal slide trims/expands the right tail
          const nextHi = Math.max(0.2, Math.min(1, hi + e.deltaX / Math.max(200, rect.width)));
          return [lo, Number(nextHi.toFixed(3))];
        });
        return;
      }

      // 3. Differentiate physical mouse wheel (zoom window) vs trackpad 2-finger vertical slide (let page scroll)
      const rawWheelDeltaY = (e as WheelEvent & { wheelDeltaY?: number }).wheelDeltaY;
      const isTrackpadVerticalSlide =
        e.deltaMode === 0 &&
        (Math.abs(e.deltaX) > 0 ||
          !Number.isInteger(e.deltaY) ||
          Math.abs(e.deltaY) < 40 ||
          (typeof rawWheelDeltaY === "number" && Math.abs(rawWheelDeltaY) % 120 !== 0));

      if (isTrackpadVerticalSlide) {
        // Allow native vertical page scrolling on trackpad 2-finger vertical slide
        return;
      }

      if (Math.abs(e.deltaY) < 2) return;
      e.preventDefault();
      setZoomRange(([lo, hi]) => {
        const span = hi - lo;
        const nextSpan = Math.max(0.12, Math.min(1, span * (e.deltaY < 0 ? 0.86 : 1.16)));
        const center = lo + anchor * span;
        const nextLo = Math.max(0, Math.min(1 - nextSpan, center - anchor * nextSpan));
        return [Number(nextLo.toFixed(3)), Number((nextLo + nextSpan).toFixed(3))];
      });
    };
    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => svg.removeEventListener("wheel", onWheel);
  }, [chartModel !== null]);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const mode = dragHandleRef.current;
      const track = zoomTrackRef.current;
      if (!mode || !track) return;
      const rect = track.getBoundingClientRect();
      if (rect.width <= 0) return;
      const deltaFrac = (e.clientX - dragStartRef.current.x) / rect.width;
      const [sLo, sHi] = dragStartRef.current.startRange;
      const minSpan = 0.12;
      if (mode === "left") {
        setZoomRange([Number(Math.max(0, Math.min(sHi - minSpan, sLo + deltaFrac)).toFixed(3)), sHi]);
      } else if (mode === "right") {
        setZoomRange([sLo, Number(Math.min(1, Math.max(sLo + minSpan, sHi + deltaFrac)).toFixed(3))]);
      } else if (mode === "pan") {
        const span = sHi - sLo;
        const nextLo = Math.max(0, Math.min(1 - span, sLo + deltaFrac));
        setZoomRange([Number(nextLo.toFixed(3)), Number((nextLo + span).toFixed(3))]);
      }
    };
    const onUp = () => {
      dragHandleRef.current = null;
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, []);

  const L = 47;
  const R = 1122;
  const T = 84;
  const B = 330;

  function handleChartPointer(clientX: number, commit: boolean) {
    const svg = chartSvgRef.current;
    if (!svg || !chartModel || !analytics) return;
    const rect = svg.getBoundingClientRect();
    if (rect.width <= 0) return;
    const svgX = ((clientX - rect.left) / rect.width) * 1170;
    const q = Math.max(0, Math.min(1, (svgX - L) / (R - L)));
    const targetMs = Math.round(chartModel.minMs + q * (chartModel.maxMs - chartModel.minMs));

    if (!commit) {
      setHoverTimeMs(targetMs);
      return;
    }

    setInspectTimeMs(targetMs);
    const stats = estimateAtTimeMs(analytics, targetMs);
    if (!stats) return;
    const nextBucket = selectedBucket === stats.bucket ? null : stats.bucket;
    setSelectedBucket(nextBucket);
    if (nextBucket !== null) {
      const binStartMs = analytics.minimumMs + nextBucket * analytics.binWidthMs;
      const binStartStats = estimateAtTimeMs(analytics, binStartMs);
      const pageSize = data?.pageSize ?? 50;
      const targetPage = Math.max(1, Math.floor(((binStartStats?.rank ?? stats.rank) - 1) / pageSize) + 1);
      setSearch("");
      fetchResultsClient({ search: "", page: targetPage, preserveSelection: true });
    } else {
      fetchResultsClient({ page: 1, preserveSelection: false });
    }
  }

  function toggleExpandRow(resultId: number) {
    if (expandedRowId === resultId) {
      setExpandedRowId(null);
      return;
    }
    setExpandedRowId(resultId);
    const cached = reportMemoryCache.get(resultId);
    if (cached) {
      setExpandedReports(prev => ({ ...prev, [resultId]: cached }));
      return;
    }
    setReportBusyId(resultId);
    fetch(`/api/rankings/${resultId}`)
      .then(r => (r.ok ? r.json() : null))
      .then((rep: RaceResultReport | null) => {
        if (rep) {
          reportMemoryCache.set(resultId, rep);
          setExpandedReports(prev => ({ ...prev, [resultId]: rep }));
          if (rep.splits) {
            rowSplitsMemoryCache.set(resultId, rep.splits);
            setRowSplits(prev => ({ ...prev, [resultId]: rep.splits! }));
          }
        }
      })
      .catch(() => {})
      .finally(() => setReportBusyId(null));
  }

  const hoveredBucket = activeInspectStats?.bucket ?? null;

  return (
    <div className="ovt-observatory" aria-busy={loading}>
      <div className="ovt-visual-wrap" id="visual-wrap">
        <SportFilterBar
          sport={sport}
          onSportChange={nextSport => {
            if (nextSport === sport) return;
            const targetObj = SPORTS.find(s => s.id === nextSport) ?? SPORTS[0];
            setSport(nextSport);
            setSportFormat(nextSport === "running" ? distance : targetObj.formats[0].value);
            setSelectedBucket(null);
            setInspectTimeMs(null);
          }}
          format={isRunningSport ? distance : sportFormat}
          onFormatChange={nextVal => {
            if (isRunningSport) {
              if (nextVal === distance) return;
              setDistance(nextVal);
              setSportFormat(nextVal);
              setEdition("");
              setOverlayIds([]);
              fetchResultsClient({ distance: nextVal, edition: "", page: 1 });
            } else {
              setSportFormat(nextVal);
            }
          }}
          sex={sex}
          onSexChange={nextSex => {
            if (nextSex === sex) return;
            setSex(nextSex);
            if (isRunningSport) fetchResultsClient({ sex: nextSex, page: 1 });
          }}
          rightSlot={
            <button
              type="button"
              className="ovt-btn gold"
              onClick={() => {
                setModalSearch("");
                setModalMode("compare");
              }}
              disabled={!isRunningSport || Boolean(edition)}
              title={edition ? "Return to All-time field to overlay multiple race curves" : "Overlay up to 3 race distributions"}
            >
              ＋ Compare races
            </button>
          }
          extraRow2={
            <>
              <button
                type="button"
                className={`ovt-filter-chip subtle ${allSavedPinned ? "active" : ""}`}
                aria-pressed={allSavedPinned}
                title={allSavedPinned ? "Unpin saved results from the chart" : "Pin your saved results onto the chart"}
                onClick={toggleSavedAthletesPinned}
              >
                {allSavedPinned ? "★ Saved pinned" : "☆ Saved results"}
              </button>

              {isRunningSport && edition && (
                <button
                  type="button"
                  className="ovt-chip gold"
                  onClick={() => selectScopeEdition(null)}
                  title="Return to All-time field"
                >
                  ← {selectedEditionMeta ? formatEditionDisplay(selectedEditionMeta.event_name, selectedEditionMeta.edition_year) : "Selected race"} <span>×</span>
                </button>
              )}

              {isRunningSport && selectedBucket !== null && analytics && (
                <button
                  type="button"
                  className="ovt-chip gold"
                  onClick={() => {
                    setSelectedBucket(null);
                    setInspectTimeMs(null);
                    fetchResultsClient({ page: 1 });
                  }}
                >
                  Selected band: {raceClock(analytics.minimumMs + selectedBucket * analytics.binWidthMs)}–
                  {raceClock(analytics.minimumMs + (selectedBucket + 1) * analytics.binWidthMs)} <span>×</span>
                </button>
              )}
            </>
          }
        />

        <div
          className="ovt-chart-surface"
          onTouchStart={e => {
            if (e.touches.length === 2) {
              pinchDistRef.current = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY,
              );
            }
          }}
          onTouchMove={e => {
            if (e.touches.length === 2 && pinchDistRef.current) {
              const dist = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY,
              );
              const ratio = pinchDistRef.current / Math.max(10, dist);
              pinchDistRef.current = dist;
              setZoomRange(([lo, hi]) => {
                const span = Math.max(0.12, Math.min(1, (hi - lo) * ratio));
                const mid = (lo + hi) / 2;
                const nextLo = Math.max(0, Math.min(1 - span, mid - span / 2));
                return [Number(nextLo.toFixed(3)), Number((nextLo + span).toFixed(3))];
              });
            }
          }}
          onTouchEnd={() => {
            pinchDistRef.current = null;
          }}
        >
          <div className="ovt-chart-overlay-label">
            <div className="ovt-count">{isRunningSport && data ? data.cohortTotal.toLocaleString() : "0"}</div>
            <small>{isRunningSport ? (edition ? "Edition finishers" : "Published field") : `${activeSportObj.label} field`}</small>
          </div>

          {!isRunningSport || !chartModel || !analytics ? (
            <div className="ovt-chart-empty">
              {!isRunningSport
                ? `No published ${activeSportObj.label} results yet.`
                : loading
                  ? "Updating chart…"
                  : "No distribution data for the selected filters."}
            </div>
          ) : (
            <svg
              ref={chartSvgRef}
              viewBox="0 0 1170 375"
              preserveAspectRatio="none"
              role="img"
              aria-label="Interactive performance distribution chart. Scroll to zoom, drag to pan when zoomed, or click a band to jump to matching athletes."
              onPointerDown={e => {
                if (e.button !== 0 && e.pointerType === "mouse") return;
                e.currentTarget.setPointerCapture?.(e.pointerId);
                chartPanRef.current = {
                  active: true,
                  didDrag: false,
                  startX: e.clientX,
                  startRange: [...zoomRange] as [number, number],
                };
              }}
              onPointerMove={e => {
                if (chartPanRef.current?.active) {
                  const dx = e.clientX - chartPanRef.current.startX;
                  if (Math.abs(dx) > 5 || chartPanRef.current.didDrag) {
                    chartPanRef.current.didDrag = true;
                    setIsPanningChart(true);
                    setHoverTimeMs(null);
                    const [sLo, sHi] = chartPanRef.current.startRange;
                    const span = sHi - sLo;
                    if (span < 0.999 && chartSvgRef.current) {
                      const rect = chartSvgRef.current.getBoundingClientRect();
                      const plotPx = Math.max(100, rect.width * ((R - L) / 1170));
                      const deltaFrac = -(dx / plotPx) * span;
                      const nextLo = Math.max(0, Math.min(1 - span, sLo + deltaFrac));
                      setZoomRange([Number(nextLo.toFixed(3)), Number((nextLo + span).toFixed(3))]);
                    }
                  }
                  return;
                }
                handleChartPointer(e.clientX, false);
              }}
              onPointerUp={e => {
                const wasDrag = chartPanRef.current?.didDrag ?? false;
                if (chartPanRef.current) {
                  chartPanRef.current = null;
                  setIsPanningChart(false);
                }
                if (!wasDrag) handleChartPointer(e.clientX, true);
              }}
              onPointerCancel={() => {
                chartPanRef.current = null;
                setIsPanningChart(false);
              }}
              onPointerLeave={() => {
                if (!chartPanRef.current?.active) setHoverTimeMs(null);
              }}
              className={`ovt-plot-target ${isPanningChart ? "is-panning" : ""}`}
            >
              <defs>
                <linearGradient id={`${gradId}-gold-bar`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#FFB800" stopOpacity="0.48" />
                  <stop offset="100%" stopColor="#FFB800" stopOpacity="0.16" />
                </linearGradient>
                <linearGradient id={`${gradId}-gold-area`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#FFB800" stopOpacity="0.22" />
                  <stop offset="100%" stopColor="#FFB800" stopOpacity="0.01" />
                </linearGradient>
              </defs>

              <g className="ovt-svg-grid">
                {[T, T + (B - T) * 0.25, T + (B - T) * 0.5, T + (B - T) * 0.75, B].map((yVal, idx) => (
                  <path key={idx} d={`M${L} ${yVal.toFixed(2)}H${R}`} />
                ))}
              </g>

              <g>
                {(() => {
                  const bw = (R - L) / chartModel.numBins;
                  const pts: [number, number][] = chartModel.smoothed.map((v, i) => [
                    L + (i + 0.5) * bw,
                    B - (v / chartModel.maxDensity) * (B - T),
                  ]);
                  const linePath = catmullRomPath(pts);
                  const areaPath = pts.length
                    ? `${linePath} L${pts[pts.length - 1][0].toFixed(2)} ${B} L${pts[0][0].toFixed(2)} ${B} Z`
                    : "";
                  return (
                    <>
                      {areaPath && <path d={areaPath} fill={`url(#${gradId}-gold-area)`} />}
                      {chartModel.densities.map((v, i) => {
                        const globalBucket = chartModel.startBin + i;
                        const x = L + i * bw;
                        const y = B - (v / chartModel.maxDensity) * (B - T);
                        const isHighlighted = selectedBucket === globalBucket || (hoverTimeMs !== null && hoveredBucket === globalBucket);
                        return (
                          <rect
                            key={globalBucket}
                            x={x.toFixed(2)}
                            y={y.toFixed(2)}
                            width={Math.max(1, bw - 0.6).toFixed(2)}
                            height={Math.max(0, B - y).toFixed(2)}
                            rx="2"
                            fill={isHighlighted ? "#FFB800" : `url(#${gradId}-gold-bar)`}
                            opacity={isHighlighted ? 1 : selectedBucket === null ? 0.92 : 0.45}
                            className="ovt-hist-bar"
                          />
                        );
                      })}
                      <path d={linePath} fill="none" stroke="#C88A00" strokeWidth="2.6" strokeLinecap="round" opacity="0.92" />
                    </>
                  );
                })()}

                {chartModel.activeOverlays.map(ov => {
                  const bw = (R - L) / chartModel.numBins;
                  const pts: [number, number][] = ov.smoothed.map((v, i) => [
                    L + (i + 0.5) * bw,
                    B - (v / chartModel.maxDensity) * (B - T),
                  ]);
                  return (
                    <path
                      key={ov.editionId}
                      d={catmullRomPath(pts)}
                      fill="none"
                      stroke={ov.color}
                      strokeWidth="2.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeDasharray={ov.dashed ? "7 4" : undefined}
                    />
                  );
                })}

                {activePins.length > 0 &&
                  (() => {
                    const visiblePins = activePins
                      .filter(p => p.timeMs >= chartModel.minMs && p.timeMs <= chartModel.maxMs)
                      .sort((a, b) => a.timeMs - b.timeMs || a.id - b.id);
                    if (!visiblePins.length) return null;

                    const tierRightEdges: number[] = [];
                    const badgeH = 24;
                    const laidOut = visiblePins.map(p => {
                      const q = (p.timeMs - chartModel.minMs) / Math.max(1, chartModel.maxMs - chartModel.minMs);
                      const xx = L + q * (R - L);
                      const binIdx = Math.min(chartModel.numBins - 1, Math.max(0, Math.floor(q * chartModel.numBins)));
                      const yy = B - (chartModel.densities[binIdx] / chartModel.maxDensity) * (B - T);
                      const labelText = `📌 ${p.name} · ${raceClock(p.timeMs)}  ×`;
                      const badgeW = Math.max(120, Math.min(280, labelText.length * 6.5 + 24));
                      const badgeX = Math.max(10, Math.min(1160 - badgeW, xx - badgeW / 2));

                      let tier = 0;
                      while (tier < 3 && tierRightEdges[tier] !== undefined && badgeX < tierRightEdges[tier] + 8) {
                        tier++;
                      }
                      tierRightEdges[tier] = Math.max(tierRightEdges[tier] ?? 0, badgeX + badgeW);
                      return { id: p.id, xx, yy, labelText, badgeX, badgeY: 6 + tier * 27, badgeW, badgeH };
                    });

                    return (
                      <g className="ovt-pinned-markers">
                        {laidOut.map(item => (
                          <g key={`line-${item.id}`}>
                            <line
                              x1={item.xx}
                              x2={item.xx}
                              y1={item.badgeY + item.badgeH}
                              y2={Math.max(item.badgeY + item.badgeH, item.yy - 5)}
                              stroke="#142b3b"
                              strokeWidth="1.6"
                              strokeDasharray="3 3"
                            />
                            <circle cx={item.xx} cy={item.yy} r="5.5" fill="#FFB800" stroke="#142b3b" strokeWidth="2" />
                          </g>
                        ))}
                        {laidOut.map(item => (
                          <g
                            key={`pill-${item.id}`}
                            style={{ cursor: "pointer" }}
                            onPointerDown={e => e.stopPropagation()}
                            onPointerUp={e => {
                              e.stopPropagation();
                              unpinId(item.id);
                            }}
                          >
                            <title>Click to remove pin</title>
                            <rect
                              x={item.badgeX}
                              y={item.badgeY}
                              width={item.badgeW}
                              height={item.badgeH}
                              rx="12"
                              fill="#ffffff"
                              stroke="#cbd5dc"
                              strokeWidth="1.2"
                            />
                            <text
                              x={item.badgeX + item.badgeW / 2}
                              y={item.badgeY + 16}
                              fill="#142b3b"
                              className="ovt-svg-pill-label"
                              textAnchor="middle"
                            >
                              {item.labelText}
                            </text>
                          </g>
                        ))}
                      </g>
                    );
                  })()}

                {activeInspectMs !== null &&
                  activeInspectMs >= chartModel.minMs &&
                  activeInspectMs <= chartModel.maxMs &&
                  (() => {
                    const q = (activeInspectMs - chartModel.minMs) / Math.max(1, chartModel.maxMs - chartModel.minMs);
                    const xx = L + q * (R - L);
                    const binIdx = Math.min(chartModel.numBins - 1, Math.max(0, Math.floor(q * chartModel.numBins)));
                    const yy = B - (chartModel.densities[binIdx] / chartModel.maxDensity) * (B - T);
                    return (
                      <g>
                        <line x1={xx} x2={xx} y1={T} y2={B} stroke="#D49400" strokeWidth="1.5" strokeDasharray="3 3" />
                        <circle cx={xx} cy={yy} r="5.5" fill="#FFB800" stroke="#142b3b" strokeWidth="2" />
                      </g>
                    );
                  })()}
              </g>

              <g>
                {[0, 1, 2, 3, 4, 5].map(j => (
                  <text key={j} x={L + ((R - L) * j) / 5} y="358" fill="#637482" className="ovt-svg-axis-label" textAnchor="middle">
                    {raceClock(chartModel.minMs + ((chartModel.maxMs - chartModel.minMs) * j) / 5)}
                  </text>
                ))}
              </g>
            </svg>
          )}
        </div>

        {chartModel && analytics && (
          <div className="ovt-zoom-bar">
            <span className="ovt-zoom-label">
              Window: <b>{raceClock(chartModel.minMs)} – {raceClock(chartModel.maxMs)}</b>
            </span>
            <div
              ref={zoomTrackRef}
              className="ovt-zoom-track"
              aria-label="Finish-time zoom window. Drag handles to adjust range or scroll on the chart to zoom."
            >
              <div
                className="ovt-zoom-selection"
                style={{
                  left: `${zoomRange[0] * 100}%`,
                  width: `${Math.max(4, (zoomRange[1] - zoomRange[0]) * 100)}%`,
                }}
                onPointerDown={e => {
                  if ((e.target as HTMLElement).dataset.handle) return;
                  e.preventDefault();
                  dragHandleRef.current = "pan";
                  dragStartRef.current = { x: e.clientX, startRange: [...zoomRange] as [number, number] };
                }}
              >
                <span
                  className="ovt-zoom-handle left"
                  data-handle="left"
                  onPointerDown={e => {
                    e.preventDefault();
                    e.stopPropagation();
                    dragHandleRef.current = "left";
                    dragStartRef.current = { x: e.clientX, startRange: [...zoomRange] as [number, number] };
                  }}
                />
                <span
                  className="ovt-zoom-handle right"
                  data-handle="right"
                  onPointerDown={e => {
                    e.preventDefault();
                    e.stopPropagation();
                    dragHandleRef.current = "right";
                    dragStartRef.current = { x: e.clientX, startRange: [...zoomRange] as [number, number] };
                  }}
                />
              </div>
            </div>
          </div>
        )}

        <div className="ovt-chart-footer">
          <div className="ovt-readout" aria-live="polite">
            <span className="ovt-dot" />
            {activeInspectMs !== null && activeInspectStats ? (
              <>
                <strong>
                  {raceClock(activeInspectMs)} · Faster than {racePercentLabel(activeInspectStats.fasterThan)}
                </strong>
                <small>
                  Est. #{activeInspectStats.rank.toLocaleString()} · Click band to jump table to these finishers
                </small>
              </>
            ) : isRunningSport && analytics ? (
              <>
                <strong>{raceClock(analytics.medianMs)} · Median finish</strong>
                <small>
                  Fastest {raceClock(analytics.fastestMs)}
                  {analytics.benchmarks?.top10Ms ? ` · Top 10% ${raceClock(analytics.benchmarks.top10Ms)}` : ""} · Click any bar to jump to finishers
                </small>
              </>
            ) : (
              <strong>{isRunningSport ? "Inspect a time on the chart" : `${activeSportObj.label} distribution`}</strong>
            )}
          </div>

          {isRunningSport && !edition && overlayIds.length > 0 && (
            <div className="ovt-chart-footer-right">
              <div className="ovt-overlaychips">
                {overlayIds.map((edId, idx) => {
                  const meta = editions.find(e => e.edition_id === edId);
                  const label = meta ? formatEditionDisplay(meta.event_name, meta.edition_year) : `Edition #${edId}`;
                  return (
                    <span key={edId} className="ovt-overlaychip">
                      <i style={{ background: OVERLAY_COLORS[idx % OVERLAY_COLORS.length] }} />
                      {label}
                      <button type="button" onClick={() => toggleOverlayEdition(edId)} aria-label={`Remove ${label} comparison`}>
                        ×
                      </button>
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {isRunningSport && personalEfforts.length > 0 && (
        <div className="ovt-personal-strip" aria-label="Your Overtaek results">
          <span className="ovt-chip gold">
            <span className="ovt-dot" /> Your results
          </span>
          <div className="ovt-personal-efforts">
            {personalEfforts.map(eff => {
              const isPinned = activePins.some(p => p.id === eff.pinId);
              return (
                <div key={eff.activityId} className="ovt-personal-effort-pill">
                  <strong>{raceClock(eff.timeMs)}</strong>
                  <small>{eff.dateLabel}</small>
                  <button
                    type="button"
                    className={`ovt-btn ${isPinned ? "gold" : ""}`}
                    style={{ ...typographyStyle("caption"), padding: "4px 10px" }}
                    onClick={() =>
                      pinRow({
                        id: eff.pinId,
                        athlete_name: competeState?.name || user?.displayName || "You",
                        rank_time_ms: eff.timeMs,
                        event_name: `Overtaek ${currentDistanceObj.label}`,
                        edition_year: new Date().getFullYear(),
                        distance_slug: storedDistance,
                      })
                    }
                  >
                    {isPinned ? "✓ On chart" : "Pin"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="ovt-mini-title">
        <AppHeading level={2} role="heading">Race editions</AppHeading>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {edition && (
            <Link href={`/pace/history?edition=${edition}&distance=${distance}&sex=${sex}`} className="ovt-btn quiet">
              Compare years ↗
            </Link>
          )}
          <button
            type="button"
            className="ovt-btn quiet"
            onClick={() => {
              setModalSearch("");
              setModalMode("races");
            }}
          >
            View all races ↗
          </button>
        </div>
      </div>

      {isRunningSport && coverage && (
        <div className="ovt-race-shelf" role="region" aria-label="Race editions carousel">
          {eventGroups.map(ed => {
            const isSelected = String(ed.edition_id) === edition;
            const isComparing = overlayIds.includes(ed.edition_id);
            const isSavedEdition = savedEditions.includes(ed.edition_id);
            const coursePts = coursePreviews[`${ed.edition_id}:${ed.distance_slug}`] ?? null;
            const hasReplayMap = Boolean(coursePts && coursePts.length >= 2);
            return (
              <article
                key={`${ed.edition_id}:${ed.distance_slug}`}
                className={`ovt-race-card ${isSelected ? "selected" : ""} ${isComparing ? "comparing" : ""}`}
                onClick={() => selectScopeEdition(isSelected ? null : ed.edition_id)}
              >
                <RaceRouteArt eventName={ed.event_name} year={ed.edition_year} coursePoints={coursePts} />
                <div className="ovt-race-info">
                  <AppHeading level={3} role="label">{formatEditionDisplay(ed.event_name, ed.edition_year)}</AppHeading>
                  <small>
                    {inferEditionDate(ed.event_name, ed.edition_year)} · {ed.published_count.toLocaleString()} finishes
                  </small>
                  <div className="ovt-race-actions" onClick={e => e.stopPropagation()}>
                    <button
                      type="button"
                      className={`ovt-btn ${isSelected ? "gold" : "primary"}`}
                      onClick={() => selectScopeEdition(isSelected ? null : ed.edition_id)}
                    >
                      {isSelected ? "✓ Exploring" : "Explore"}
                    </button>
                    <button
                      type="button"
                      className={`ovt-btn ${isComparing ? "gold" : ""}`}
                      onClick={() => toggleOverlayEdition(ed.edition_id)}
                      title={isComparing ? "Remove comparison curve" : "Overlay race distribution"}
                    >
                      {isComparing ? "✓ Compare" : "＋ Compare"}
                    </button>
                    <button
                      type="button"
                      className="ovt-btn icon"
                      onClick={() => toggleSavedEdition(ed.edition_id, formatEditionDisplay(ed.event_name, ed.edition_year))}
                      aria-pressed={isSavedEdition}
                      title={isSavedEdition ? "Remove saved race" : "Save race edition"}
                    >
                      {isSavedEdition ? "★" : "☆"}
                    </button>
                    <button
                      type="button"
                      className="ovt-btn icon"
                      disabled={!hasReplayMap}
                      onClick={() => openInReplayStudio(ed.edition_id, distance)}
                      title={hasReplayMap ? "Open in Replay Studio" : "GPS course replay is not available for this edition"}
                      aria-label={`Open ${ed.event_name} in Replay Studio`}
                    >
                      ▶
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <div className="ovt-athlete-head">
        <AppHeading level={2} role="heading">
          {edition
            ? selectedEditionMeta
              ? `${formatEditionDisplay(selectedEditionMeta.event_name, selectedEditionMeta.edition_year)} rankings`
              : "Race rankings"
            : "Athlete index"}
        </AppHeading>

        <form
          className="ovt-athlete-search-bar"
          onSubmit={e => {
            e.preventDefault();
            fetchResultsClient({ search, page: 1 });
          }}
        >
          <input
            type="search"
            name="q"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Find an athlete or bib…"
            aria-label="Search athletes or bib"
            maxLength={100}
          />
          <button type="submit" className="ovt-btn primary" disabled={loading}>
            Search
          </button>
          {(search || selectedBucket !== null || edition) && (
            <button
              type="button"
              className="ovt-btn"
              onClick={() => {
                setSearch("");
                setEdition("");
                setSelectedBucket(null);
                setInspectTimeMs(null);
                fetchResultsClient({ search: "", edition: "", page: 1 });
              }}
            >
              Reset
            </button>
          )}
        </form>
      </div>

      <div className={`ovt-index-results ${loading ? "is-loading" : ""}`}>
        {!isRunningSport ? (
          <div className="race-empty">
            <AppHeading level={2} role="heading">No published {activeSportObj.label} results yet</AppHeading>
            <p>Select Running to explore published marathon, half marathon, 10K, and 5K fields.</p>
          </div>
        ) : !data ? (
          <div className="race-empty" role="alert">
            <AppHeading level={2} role="heading">Results are unavailable</AppHeading>
            <button type="button" className="ovt-btn" onClick={() => fetchResultsClient({ page: 1 })}>
              Retry
            </button>
          </div>
        ) : visibleRows.length === 0 ? (
          <div className="race-empty">
            <AppHeading level={2} role="heading">No matching finishers</AppHeading>
            <p>Try another athlete name, bib, or category.</p>
          </div>
        ) : (
          <>
          <div className="ovt-tablebox" role="region" aria-label="Race results" tabIndex={0}>
            <table>
              <thead>
                <tr>
                  <th scope="col">Rank</th>
                  <th scope="col">Athlete</th>
                  <th scope="col">Finish</th>
                  <th scope="col" className="race-event-column">Event</th>
                  <th scope="col">Faster than</th>
                  <th scope="col">Splits</th>
                  <th scope="col" />
                </tr>
              </thead>
              <tbody>
                {visibleRows.map(row => {
                  const isPinned = activePins.some(p => p.id === row.id);
                  const isSaved = saved.ids.includes(row.id);
                  const isExpanded = expandedRowId === row.id;
                  const detailReport = expandedReports[row.id] ?? null;
                  const detailSplits = detailReport?.splits ?? rowSplits[row.id] ?? null;
                  const splitAnalysis = isExpanded && detailSplits ? analyzeRaceSplits(detailSplits, row.distance_slug) : null;
                  const inSelectedBand =
                    selectedBucket !== null &&
                    analytics !== null &&
                    row.rank_time_ms >= analytics.minimumMs + selectedBucket * analytics.binWidthMs &&
                    row.rank_time_ms < analytics.minimumMs + (selectedBucket + 1) * analytics.binWidthMs;
                  return (
                    <Fragment key={row.id}>
                      <tr
                        className={`${isPinned || inSelectedBand ? "focus" : ""} ${isExpanded ? "is-expanded" : ""}`}
                        onClick={() => toggleExpandRow(row.id)}
                        style={{ cursor: "pointer" }}
                      >
                        <td className="race-place">
                          <b>#{row.place.toLocaleString()}</b>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="ovt-namebtn"
                            aria-expanded={isExpanded}
                            onClick={e => {
                              e.stopPropagation();
                              toggleExpandRow(row.id);
                            }}
                          >
                            {row.athlete_name}
                            {reportBusyId === row.id ? " …" : ""}
                          </button>
                          <span className="race-mobile-event">{formatEditionDisplay(row.event_name, row.edition_year)}</span>
                        </td>
                        <td className="race-time">
                          <b>{raceClock(row.rank_time_ms)}</b>
                        </td>
                        <td className="race-event-column">{formatEditionDisplay(row.event_name, row.edition_year)}</td>
                        <td className="race-percentile-cell">
                          {row.percentile != null ? (
                            <span className="ovt-rankpill" title={`Faster than ${row.percentile.toFixed(1)}% of finishers`}>
                              {racePercentileBadge(row.percentile)}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td>
                          <SplitSparkline splits={rowSplits[row.id]} distanceSlug={row.distance_slug} />
                        </td>
                        <td onClick={e => e.stopPropagation()}>
                          <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                            <button
                              type="button"
                              className={`ovt-btn ${isPinned ? "gold" : ""}`}
                              style={{ padding: "6px 12px" }}
                              title={isPinned ? "Remove athlete marker from the distribution chart" : "Plot this athlete's finish time on the distribution chart above"}
                              onClick={() => {
                                pinRow(row);
                                document.getElementById("visual-wrap")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
                              }}
                            >
                              {isPinned ? "✓ On chart" : "Pin"}
                            </button>
                            <button
                              type="button"
                              className="ovt-btn icon"
                              style={{ padding: "6px 9px" }}
                              disabled={user ? !saved.ready || saved.busy : false}
                              onClick={() => {
                                if (requireAuth("save", `${row.athlete_name} (${raceClock(row.rank_time_ms)})`)) return;
                                void saved.toggle(row.id);
                              }}
                              aria-pressed={user ? isSaved : false}
                              title={user && isSaved ? "Saved result" : "Save result"}
                            >
                              {user && isSaved ? "★" : "☆"}
                            </button>
                          </div>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="ovt-row-detail">
                          <td colSpan={7}>
                            <div className="ovt-row-detail-inner">
                              <div className="ovt-detail-stats">
                                <span>
                                  <b>{formatEditionDisplay(row.event_name, row.edition_year)}</b>
                                  {row.bib ? ` · Bib #${row.bib}` : ""}
                                </span>
                                <span>
                                  {detailReport
                                    ? `Rank #${detailReport.place.toLocaleString()} of ${detailReport.total.toLocaleString()}`
                                    : `Rank #${row.place.toLocaleString()}`}
                                  {row.percentile != null ? ` · Faster than ${row.percentile.toFixed(1)}%` : ""}
                                </span>
                                <span>
                                  Finish: <b>{raceClock(row.rank_time_ms)}</b> ({row.rank_clock === "chip" ? "Chip" : "Official"})
                                </span>
                              </div>

                              {splitAnalysis?.status === "ready" && (
                                <div className="ovt-detail-splits">
                                  {splitAnalysis.rows
                                    .filter(sr => sr.elapsedMs !== null)
                                    .map(sr => (
                                      <span key={sr.distanceM} className="ovt-detail-split-pill">
                                        <small>{sr.label}</small>
                                        <b>{raceClock(sr.elapsedMs!)}</b>
                                      </span>
                                    ))}
                                </div>
                              )}

                              <div className="ovt-detail-actions">
                                {detailSplits && (
                                  <button
                                    type="button"
                                    className="ovt-btn primary"
                                    style={{ padding: "6px 13px" }}
                                    onClick={() => openInReplayStudio(detailReport?.result.event_edition_id ?? Number(edition || 6), distance, String(row.id))}
                                  >
                                    ▶ Replay performance
                                  </button>
                                )}
                                <Link href={`/pace/result/${row.id}`} className="ovt-btn" style={{ padding: "6px 13px" }}>
                                  Full report →
                                </Link>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          {data && (
            <div className="ovt-tablefooter">
              <nav className="race-pagination" aria-label="Results pages" style={{ marginTop: 0, flex: 1 }}>
                <button
                  type="button"
                  className="ovt-btn"
                  disabled={loading || data.page <= 1}
                  onClick={() => fetchResultsClient({ page: data.page - 1, preserveSelection: true })}
                >
                  ← Previous
                </button>
                <span>
                  Page {data.page.toLocaleString()} of {Math.max(1, Math.ceil(data.total / data.pageSize)).toLocaleString()}
                </span>
                <button
                  type="button"
                  className="ovt-btn"
                  disabled={loading || data.page * data.pageSize >= data.total}
                  onClick={() => fetchResultsClient({ page: data.page + 1, preserveSelection: true })}
                >
                  Next →
                </button>
              </nav>

              <form
                className="race-jump"
                style={{ marginTop: 0 }}
                onSubmit={e => {
                  e.preventDefault();
                  const value = new FormData(e.currentTarget).get("page");
                  fetchResultsClient({ page: Number(value), preserveSelection: true });
                }}
              >
                <label>
                  Page{" "}
                  <input
                    type="number"
                    name="page"
                    min="1"
                    max={Math.max(1, Math.ceil(data.total / data.pageSize))}
                    required
                    key={data.page}
                    defaultValue={data.page}
                  />
                </label>
                <button type="submit" className="ovt-btn" disabled={loading}>
                  Go
                </button>
              </form>
            </div>
          )}
          </>
        )}
      </div>

      {modalMode && (
        <div className="ovt-scrim" onClick={e => e.target === e.currentTarget && setModalMode(null)}>
          <div
            className="ovt-modal"
            role="dialog"
            aria-modal="true"
            aria-label={modalMode === "compare" ? "Compare up to 3 races" : "All race editions"}
          >
            <div className="ovt-modal-head">
              <div>
                <span className="ovt-kicker">RACE EXPLORER</span>
                <AppHeading level={2} role="heading">{modalMode === "compare" ? "Compare up to 3 races" : "All race editions"}</AppHeading>
              </div>
              <button type="button" className="ovt-btn" onClick={() => setModalMode(null)}>
                ✕ Close
              </button>
            </div>
            <input
              className="ovt-modal-search"
              type="search"
              placeholder="Search race or year…"
              aria-label="Search race editions"
              value={modalSearch}
              onChange={e => setModalSearch(e.target.value)}
              autoFocus
            />
            <div className="ovt-race-list">
              {eventGroups
                .filter(e => `${e.event_name} ${e.edition_year}`.toLowerCase().includes(modalSearch.trim().toLowerCase()))
                .map(ed => {
                  const isSelected = String(ed.edition_id) === edition;
                  const isComparing = overlayIds.includes(ed.edition_id);
                  return (
                    <div
                      key={`${ed.edition_id}:${ed.distance_slug}`}
                      className={`ovt-picker-row ${isSelected || isComparing ? "active" : ""}`}
                    >
                      <div>
                        <b>{formatEditionDisplay(ed.event_name, ed.edition_year)}</b>
                        <small>
                          {inferEditionDate(ed.event_name, ed.edition_year)} · {ed.published_count.toLocaleString()} finishes
                        </small>
                      </div>
                      <div className="ovt-picker-actions">
                        {modalMode === "compare" ? (
                          <button
                            type="button"
                            className={`ovt-btn ${isComparing ? "gold" : ""}`}
                            onClick={() => toggleOverlayEdition(ed.edition_id)}
                          >
                            {isComparing ? "✓ Added" : "＋ Add"}
                          </button>
                        ) : (
                          <>
                            <button
                              type="button"
                              className={`ovt-btn ${isComparing ? "gold" : ""}`}
                              onClick={() => toggleOverlayEdition(ed.edition_id)}
                            >
                              {isComparing ? "✓ Compare" : "＋ Compare"}
                            </button>
                            <button type="button" className="ovt-btn primary" onClick={() => selectScopeEdition(ed.edition_id)}>
                              Explore ↗
                            </button>
                            <button
                              type="button"
                              className="ovt-btn"
                              disabled={!coursePreviews[`${ed.edition_id}:${ed.distance_slug}`]}
                              title={coursePreviews[`${ed.edition_id}:${ed.distance_slug}`] ? "Open in Replay Studio" : "GPS course replay unavailable"}
                              onClick={() => openInReplayStudio(ed.edition_id, distance)}
                            >
                              ▶ Replay
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
