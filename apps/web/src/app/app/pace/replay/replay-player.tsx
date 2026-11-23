"use client";

import { AppHeading, AppText, typographyStyle } from "@/ui/section";
import { useEffect, useMemo, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import {
  analyzeRaceSplits,
  buildCompiledReplayField,
  buildReplayCourseIndex,
  compileReplayRunner,
  evaluateFieldDistances,
  fillMercatorPositions,
  loadReplayCompactField,
  pickNearestRunnerId,
  RACE_DISTANCES,
  RACE_METERS,
  raceClock,
  raceEventGroups,
  raceSourceUrl,
  replayCoordinateAt,
  replayDistance,
  replayFeatures,
  selectFieldRankSlice,
  validateReplayCourse,
  type CompiledReplayRunner,
  type RaceCoverage,
  type ReplayCompactPage,
  type ReplayCourseIndex,
  type ReplayData,
} from "@fitness-battle/shared";
import { webEnv } from "@/lib/env";
import { useAuth } from "@/components/auth-context";
import { addMapboxAttribution, mapboxAttributionOptions } from "@/components/maps/mapbox-attribution";
import { useRaceFavorites } from "../favorites";
import { coursePreviewsMemoryCache, formatEditionDisplay, RaceRouteArt } from "../race-explorer";
import { computeSplitMetrics, SportFilterBar, SPORTS, type SportId } from "../sport-filter-bar";
import { FieldWebGLLayer } from "./field-webgl-layer";

const replayDataMemoryCache = new Map<string, ReplayData>();

function computeCourseBearing(courseIndex: ReplayCourseIndex, metres: number): number {
  const before = replayCoordinateAt(courseIndex, Math.max(0, metres - 40));
  const after = replayCoordinateAt(courseIndex, metres + 40);
  const dLon = ((after[0] - before[0]) * Math.PI) / 180;
  const lat1 = (before[1] * Math.PI) / 180;
  const lat2 = (after[1] * Math.PI) / 180;
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  const brng = (Math.atan2(y, x) * 180) / Math.PI;
  return Number.isFinite(brng) ? (brng + 360) % 360 : 0;
}

function visiblePageWindow(current: number, total: number): Array<number | "ellipsis"> {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i);
  const pages: Array<number | "ellipsis"> = [0];
  const start = Math.max(1, current - 1);
  const end = Math.min(total - 2, current + 1);
  if (start > 1) pages.push("ellipsis");
  for (let i = start; i <= end; i++) pages.push(i);
  if (end < total - 2) pages.push("ellipsis");
  pages.push(total - 1);
  return pages;
}

function applyRunnerLayerPaint(
  instance: mapboxgl.Map,
  pinnedIds: number[],
  cameraTargetId: number | null,
  challengerId: number,
) {
  const focusId = cameraTargetId ?? -1;
  const pinnedList = pinnedIds.length > 0 ? pinnedIds : [-1];
  if (instance.getLayer("runners-halo")) {
    instance.setPaintProperty("runners-halo", "circle-radius", [
      "case",
      ["==", ["get", "id"], focusId],
      16,
      ["in", ["get", "id"], ["literal", pinnedList]],
      13,
      ["==", ["get", "id"], challengerId],
      12,
      0,
    ]);
    instance.setPaintProperty("runners-halo", "circle-color", [
      "case",
      ["==", ["get", "id"], focusId],
      "#FFB800",
      ["in", ["get", "id"], ["literal", pinnedList]],
      "#FFB800",
      "#24765c",
    ]);
  }
  if (instance.getLayer("runners")) {
    instance.setLayoutProperty("runners", "circle-sort-key", [
      "case",
      ["==", ["get", "id"], focusId],
      3,
      ["in", ["get", "id"], ["literal", pinnedList]],
      2,
      ["==", ["get", "id"], challengerId],
      2,
      0,
    ]);
    instance.setPaintProperty("runners", "circle-radius", [
      "case",
      ["==", ["get", "id"], focusId],
      8.5,
      ["in", ["get", "id"], ["literal", pinnedList]],
      7,
      ["==", ["get", "id"], challengerId],
      7,
      ["interpolate", ["linear"], ["zoom"], 10, 1.8, 12.5, 2.7, 15, 4.4],
    ]);
    instance.setPaintProperty("runners", "circle-color", [
      "case",
      ["==", ["get", "id"], focusId],
      "#FFB800",
      ["in", ["get", "id"], ["literal", pinnedList]],
      "#FFB800",
      ["==", ["get", "id"], challengerId],
      "#24765c",
      "#1c3547",
    ]);
    instance.setPaintProperty("runners", "circle-opacity", [
      "case",
      ["==", ["get", "id"], focusId],
      1,
      ["in", ["get", "id"], ["literal", pinnedList]],
      1,
      ["==", ["get", "id"], challengerId],
      1,
      0.42,
    ]);
    instance.setPaintProperty("runners", "circle-blur", [
      "case",
      ["==", ["get", "id"], focusId],
      0,
      ["in", ["get", "id"], ["literal", pinnedList]],
      0,
      ["==", ["get", "id"], challengerId],
      0,
      0.15,
    ]);
    instance.setPaintProperty("runners", "circle-stroke-width", [
      "case",
      ["==", ["get", "id"], focusId],
      2.6,
      ["in", ["get", "id"], ["literal", pinnedList]],
      2.2,
      ["==", ["get", "id"], challengerId],
      2.2,
      0,
    ]);
    instance.setPaintProperty("runners", "circle-stroke-color", "#ffffff");
  }
}

function ProgressiveSplitSignature({
  runner,
  distanceSlug,
  currentDistM,
  totalDistM,
  active,
}: {
  runner: CompiledReplayRunner;
  distanceSlug: string;
  currentDistM: number;
  totalDistM: number;
  active: boolean;
}) {
  const analysis = useMemo(() => analyzeRaceSplits(runner.splits, distanceSlug), [runner.splits, distanceSlug]);
  if (analysis.status !== "ready") return <span className="ovt-hint">—</span>;
  const validRows = analysis.rows.filter(r => r.paceMsPerKm !== null && Number.isFinite(r.paceMsPerKm));
  if (validRows.length < 2) return <span className="ovt-hint">—</span>;

  const paces = validRows.map(r => r.paceMsPerKm!);
  const mean = paces.reduce((a, b) => a + b, 0) / paces.length;
  const minP = Math.min(...paces, mean * 0.91);
  const maxP = Math.max(...paces, mean * 1.09);
  const span = Math.max(1, maxP - minP);

  const pts: [number, number][] = [
    { distanceM: 0, pace: paces[0] },
    ...validRows.map(r => ({ distanceM: r.distanceM, pace: r.paceMsPerKm! })),
  ].map(pt => [
    5 + (Math.max(0, Math.min(totalDistM, pt.distanceM)) / Math.max(1, totalDistM)) * 100,
    4 + ((pt.pace - minP) / span) * 16,
  ]);

  const path = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
  const frac = totalDistM > 0 ? Math.max(0, Math.min(1, currentDistM / totalDistM)) : 0;
  const clipWidth = 5 + frac * 100;

  let dotY = pts[0][1];
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    if (clipWidth <= b[0] || i === pts.length - 1) {
      const w = b[0] > a[0] ? Math.max(0, Math.min(1, (clipWidth - a[0]) / (b[0] - a[0]))) : 0;
      dotY = a[1] + (b[1] - a[1]) * w;
      break;
    }
  }

  const clipId = `replay-sig-${runner.id}`;
  const { stroke, badge, tone } = computeSplitMetrics(analysis, runner.splits.finishMs);
  return (
    <span className="ovt-split-cell" title={tone === "negative" ? `Negative split (${badge})` : tone === "positive" ? `Positive split (${badge})` : "Even split"}>
      <svg
        className="ovt-replay-micro"
        viewBox="0 0 110 25"
        aria-label="Recorded split pace signature progressively revealed with elapsed time"
      >
        <defs>
          <clipPath id={clipId}>
            <rect x="0" y="0" width={clipWidth.toFixed(2)} height="25" />
          </clipPath>
        </defs>
        <path d={path} fill="none" stroke="#d0dad7" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <path
          d={path}
          fill="none"
          stroke={stroke}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          clipPath={`url(#${clipId})`}
        />
        <circle
          cx={clipWidth.toFixed(2)}
          cy={dotY.toFixed(2)}
          r="2.9"
          fill={stroke}
          stroke="#142b3b"
          strokeWidth="1.2"
          opacity={active ? 1 : 0}
        />
      </svg>
      {badge && <span className={`ovt-split-badge ${tone}`}>{badge}</span>}
    </span>
  );
}

type RunnerWithDistance = {
  runner: CompiledReplayRunner;
  distM: number;
  finished: boolean;
  finishMs: number;
};

function DuelAthleteCard({
  roleLabel,
  roleColor,
  entry,
  runners,
  excludeId,
  onSelect,
  onClear,
}: {
  roleLabel: string;
  roleColor: string;
  entry: RunnerWithDistance | null;
  runners: CompiledReplayRunner[];
  excludeId: number | null;
  onSelect: (id: number) => void;
  onClear: () => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const cardRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  const filtered = useMemo(() => {
    if (!open) return [];
    const q = query.trim().toLowerCase().replace(/^#/, "");
    const out: CompiledReplayRunner[] = [];
    for (let i = 0; i < runners.length; i++) {
      const r = runners[i];
      if (r.id === excludeId) continue;
      if (
        !q ||
        r.name.toLowerCase().includes(q) ||
        (r.bib && r.bib.toLowerCase().includes(q)) ||
        raceClock(r.splits.finishMs).includes(q)
      ) {
        out.push(r);
        if (out.length >= 60) break;
      }
    }
    return out;
  }, [open, runners, excludeId, query]);

  return (
    <div ref={cardRef} className={`ovt-duel-side ${entry ? "" : "is-empty"}`}>
      <div className="ovt-duel-card-head">
        <AppText role="label" as="small" style={{ color: roleColor }}>● {roleLabel}</AppText>
        {entry && (
          <button
            type="button"
            className="ovt-duel-clear"
            onClick={() => {
              onClear();
              setQuery("");
            }}
            aria-label={`Clear ${roleLabel} athlete`}
            title={`Clear ${roleLabel}`}
          >
            ×
          </button>
        )}
      </div>

      {entry ? (
        <>
          <b>
            {entry.runner.name}
            {entry.runner.bib ? ` · #${entry.runner.bib}` : ""}
          </b>
          <small>
            {(entry.distM / 1000).toFixed(2)} km (est.) · Finish {raceClock(entry.finishMs)}
          </small>
        </>
      ) : (
        <span className="ovt-duel-empty-title">No athlete selected</span>
      )}

      <div className="ovt-duel-search-wrap">
        <input
          type="search"
          className="ovt-duel-search-input"
          placeholder={entry ? "Search name or bib to switch…" : `Search ${roleLabel.toLowerCase()} by name or bib…`}
          aria-label={`Search ${roleLabel} athlete by name or bib`}
          value={query}
          onFocus={() => setOpen(true)}
          onChange={e => {
            setQuery(e.target.value);
            setOpen(true);
          }}
        />
        {open && (
          <div className="ovt-duel-search-results" role="listbox" aria-label={`${roleLabel} athlete results`}>
            {filtered.length === 0 ? (
              <div className="ovt-duel-search-empty">No matching athletes</div>
            ) : (
              filtered.map(r => {
                const isSelected = entry?.runner.id === r.id;
                return (
                  <button
                    key={r.id}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    className={`ovt-pill-option ${isSelected ? "is-selected" : ""}`}
                    onClick={() => {
                      onSelect(r.id);
                      setQuery("");
                      setOpen(false);
                    }}
                  >
                    <span className="ovt-pill-option-text">
                      <span>
                        {r.name}
                        {r.bib ? ` (#${r.bib})` : ""}
                      </span>
                      <small>{raceClock(r.splits.finishMs)}</small>
                    </span>
                    {isSelected && <span className="ovt-pill-check">✓</span>}
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function ReplayPlayer({
  scope,
  initialIds,
  initialCoverage = null,
  initialCoursePreviews,
  active = true,
}: {
  scope: { edition: string; distance: string; sex: string; clock: string };
  initialIds: string;
  initialCoverage?: RaceCoverage[] | null;
  initialCoursePreviews?: Record<string, [number, number][]>;
  active?: boolean;
}) {
  const { user } = useAuth();
  const saved = useRaceFavorites();

  const [coverage, setCoverage] = useState<RaceCoverage[] | null>(initialCoverage);
  useEffect(() => {
    if (coverage !== null) return;
    fetch("/api/rankings/coverage")
      .then(r => (r.ok ? r.json() : null))
      .then((c: RaceCoverage[] | null) => {
        if (Array.isArray(c)) setCoverage(c);
      })
      .catch(() => {});
  }, [coverage]);

  const [coursePreviews, setCoursePreviews] = useState<Record<string, [number, number][]> | null>(() => {
    if (initialCoursePreviews) {
      coursePreviewsMemoryCache.data = initialCoursePreviews;
      return initialCoursePreviews;
    }
    return coursePreviewsMemoryCache.data;
  });
  const [hideIneligible, setHideIneligible] = useState(false);

  useEffect(() => {
    if (coursePreviews !== null) return;
    fetch("/api/rankings/courses")
      .then(r => (r.ok ? r.json() : null))
      .then((p: Record<string, [number, number][]> | null) => {
        if (p && typeof p === "object") {
          coursePreviewsMemoryCache.data = p;
          setCoursePreviews(p);
        }
      })
      .catch(() => {});
  }, [coursePreviews]);

  const [sport, setSport] = useState<SportId>("running");
  const [sportFormat, setSportFormat] = useState<string>(scope.distance || "marathon");
  const [editionId, setEditionId] = useState<number>(Number(scope.edition) || 6);
  const [distanceSlug, setDistanceSlug] = useState<string>(scope.distance || "marathon");
  const [category, setCategory] = useState(scope.sex);
  const clock = "chip";
  const [ids, setIds] = useState<string | null>(initialIds ? initialIds : null);
  const [attempt, setAttempt] = useState(0);
  const [runnerSearch, setRunnerSearch] = useState("");

  const activeSportObj = SPORTS.find(s => s.id === sport) ?? SPORTS[0];
  const isRunningSport = sport === "running";

  useEffect(() => {
    const nextEd = Number(scope.edition) || 6;
    if (nextEd !== editionId) setEditionId(nextEd);
    if (scope.distance && scope.distance !== distanceSlug) setDistanceSlug(scope.distance);
    if (initialIds) setIds(initialIds);
  }, [scope.edition, scope.distance, initialIds]);

  const [data, setData] = useState<ReplayData | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");

  const [time, setTime] = useState(0);
  const [rankTime, setRankTime] = useState(0);
  const timeRef = useRef(0);
  const hudClockRef = useRef<HTMLElement | null>(null);
  const scrubberClockRef = useRef<HTMLSpanElement | null>(null);
  const scrubberInputRef = useRef<HTMLInputElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(64);
  const [wall, setWall] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [mapError, setMapError] = useState("");
  const [mapAttempt, setMapAttempt] = useState(0);
  const [ready, setReady] = useState(false);
  const [mapExpanded, setMapExpanded] = useState(false);

  // Multi-athlete pinning + single camera focus target among pinned athletes
  const [cameraMode, setCameraMode] = useState<"field" | "follow" | "chase3d">("field");
  const [pinnedIds, setPinnedIds] = useState<number[]>([]);
  const [cameraTargetId, setCameraTargetId] = useState<number | null>(null);

  // Head-to-head duel slots (both empty by default unless athletes are pinned or sent from Duel)
  const [duelPrimaryId, setDuelPrimaryId] = useState<number | null>(null);
  const [peerId, setPeerId] = useState<number | null>(null);

  const [replayMode, setReplayMode] = useState<"field" | "finish" | "duel">("field");
  const [page, setPage] = useState(0);
  const pageSize = 9;

  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerSearch, setPickerSearch] = useState("");

  const abort = useRef<AbortController | null>(null);
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);

  const distanceObj = useMemo(
    () => RACE_DISTANCES.find(d => d.slug === distanceSlug) ?? RACE_DISTANCES[3],
    [distanceSlug],
  );
  const storedDistance = distanceObj.stored;
  const totalMeters = RACE_METERS[storedDistance] ?? 42195;

  const allRaceEditions = useMemo(() => raceEventGroups(coverage ?? [], "all"), [coverage]);

  const activeRaceMeta = useMemo(
    () =>
      allRaceEditions.find(g => g.edition_id === editionId && g.distance_slug === storedDistance) ??
      allRaceEditions.find(g => g.edition_id === editionId) ??
      null,
    [allRaceEditions, editionId, storedDistance],
  );

  function selectRaceEdition(nextEditionId: number, nextDistanceStored?: string) {
    const distObj = nextDistanceStored
      ? (RACE_DISTANCES.find(d => d.stored === nextDistanceStored) ?? distanceObj)
      : distanceObj;
    setEditionId(nextEditionId);
    setDistanceSlug(distObj.slug);
    setIds(null);
    setPage(0);
    setPickerOpen(false);
  }

  function togglePinRunner(id: number) {
    setPinnedIds(prev => {
      const exists = prev.includes(id);
      if (exists) {
        const next = prev.filter(x => x !== id);
        setCameraTargetId(curr => (curr === id ? (next[0] ?? null) : curr));
        if (next.length === 0) setCameraMode("field");
        return next;
      }
      const next = [...prev, id];
      setCameraTargetId(curr => curr ?? id);
      return next;
    });
  }

  const scopeKey = useMemo(
    () =>
      new URLSearchParams({
        edition: String(editionId),
        distance: distanceSlug,
        sex: category,
        clock,
      }).toString(),
    [editionId, distanceSlug, category, clock],
  );

  useEffect(() => {
    if (active && map.current) {
      requestAnimationFrame(() => map.current?.resize());
    } else if (!active && playing) {
      setPlaying(false);
    }
  }, [active, playing, mapExpanded]);

  useEffect(() => {
    const cacheKey = `${scopeKey}|${ids ?? ""}`;
    const cached = replayDataMemoryCache.get(cacheKey);
    if (cached) {
      setData(cached);
      setBusy(false);
      setError("");
      return;
    }

    const controller = new AbortController();
    abort.current = controller;
    setBusy(true);
    setData(null);
    setError("");
    setProgress(0);
    timeRef.current = 0;
    setTime(0);
    setRankTime(0);
    setPlaying(false);
    setWall(false);
    void loadReplayCompactField(
      async after => {
        const params = new URLSearchParams(scopeKey);
        params.set("after", String(after));
        params.set("format", "compact");
        if (ids !== null && ids.trim() !== "") params.set("ids", ids);
        const response = await fetch(`/api/rankings/replay?${params}`, { signal: controller.signal });
        if (!response.ok) {
          throw new Error(
            response.status === 404
              ? "Reviewed course and checkpoint timing profiles are not yet available for this race edition."
              : "Replay could not load.",
          );
        }
        return response.json() as Promise<ReplayCompactPage>;
      },
      () => controller.signal.aborted,
      setProgress,
    )
      .then(value => {
        if (!controller.signal.aborted) {
          if (!validateReplayCourse(value.course, storedDistance)) {
            throw new Error("Course alignment needs review.");
          }
          replayDataMemoryCache.set(cacheKey, value);
          setData(value);
        }
      })
      .catch(e => {
        if (!controller.signal.aborted) {
          setError(e instanceof Error ? e.message : "Replay unavailable.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setBusy(false);
      });
    return () => controller.abort();
  }, [scopeKey, ids, attempt, storedDistance]);

  const runners = useMemo(
    () =>
      data?.runners.flatMap(r => {
        const compiled = compileReplayRunner(r, storedDistance);
        return compiled ? [compiled] : [];
      }) ?? [],
    [data, storedDistance],
  );

  // Preserve valid selections on field change, never auto-select default athletes
  useEffect(() => {
    if (!runners.length) {
      setPinnedIds([]);
      setCameraTargetId(null);
      setDuelPrimaryId(null);
      setPeerId(null);
      return;
    }
    const idSet = new Set(runners.map(r => r.id));
    setPinnedIds(prev => prev.filter(id => idSet.has(id)));
    setCameraTargetId(prev => (prev !== null && idSet.has(prev) ? prev : null));
    setDuelPrimaryId(prev => (prev !== null && idSet.has(prev) ? prev : null));
    setPeerId(prev => (prev !== null && idSet.has(prev) ? prev : null));
  }, [runners]);

  const savedInFieldIds = useMemo(() => {
    const idSet = new Set(runners.map(r => r.id));
    return saved.ids.filter(id => idSet.has(id));
  }, [runners, saved.ids]);

  const allSavedPinnedInReplay = useMemo(
    () => savedInFieldIds.length > 0 && savedInFieldIds.every(id => pinnedIds.includes(id)),
    [savedInFieldIds, pinnedIds],
  );

  function toggleSavedAthletesPinned() {
    if (!user) {
      window.dispatchEvent(
        new CustomEvent("ovt:require-auth", {
          detail: { action: "save", target: "your saved results" },
        }),
      );
      return;
    }
    if (!savedInFieldIds.length) return;
    setPinnedIds(prev => {
      if (allSavedPinnedInReplay) {
        const removeSet = new Set(savedInFieldIds);
        const next = prev.filter(id => !removeSet.has(id));
        setCameraTargetId(curr => (curr !== null && removeSet.has(curr) ? (next[0] ?? null) : curr));
        if (next.length === 0) setCameraMode("field");
        return next;
      }
      const next = Array.from(new Set([...prev, ...savedInFieldIds]));
      setCameraTargetId(curr => curr ?? savedInFieldIds[0] ?? null);
      return next;
    });
  }

  const courseIndex = useMemo(() => (data ? buildReplayCourseIndex(data.course) : null), [data]);
  const field = useMemo(() => buildCompiledReplayField(runners, wall), [runners, wall]);
  const timeline = useMemo(
    () => ({ wallAvailable: field.wallAvailable, origin: field.wallOrigin, duration: field.duration }),
    [field],
  );

  // Highlighted subset (pinned / camera target / duel) rendered as crisp Mapbox circles above the WebGL field
  const highlightedRunners = useMemo(() => {
    const idSet = new Set<number>(pinnedIds);
    if (cameraTargetId !== null) idSet.add(cameraTargetId);
    if (replayMode === "duel") {
      if (duelPrimaryId !== null) idSet.add(duelPrimaryId);
      if (peerId !== null) idSet.add(peerId);
    }
    const list: CompiledReplayRunner[] = [];
    for (const id of idSet) {
      const idx = field.idToIndex.get(id);
      if (idx !== undefined && runners[idx]) list.push(runners[idx]);
    }
    return list;
  }, [pinnedIds, cameraTargetId, replayMode, duelPrimaryId, peerId, field, runners]);

  const fieldLayerRef = useRef<FieldWebGLLayer | null>(null);
  const fieldDistancesRef = useRef<Float32Array>(new Float32Array(0));
  const mercatorXYRef = useRef<Float32Array>(new Float32Array(0));
  if (fieldDistancesRef.current.length !== field.count) {
    fieldDistancesRef.current = new Float32Array(field.count);
    mercatorXYRef.current = new Float32Array(field.count * 2);
  }

  const pushMapFrameRef = useRef<(targetTime: number) => void>(() => {});
  pushMapFrameRef.current = (targetTime: number) => {
    const instance = map.current;
    if (!instance || !data || !courseIndex) return;
    if (fieldLayerRef.current) {
      evaluateFieldDistances(field, targetTime, fieldDistancesRef.current);
      const activeCount = fillMercatorPositions(
        courseIndex,
        field,
        fieldDistancesRef.current,
        mercatorXYRef.current,
      );
      fieldLayerRef.current.updatePositions(
        mercatorXYRef.current,
        activeCount,
        courseIndex.originMx,
        courseIndex.originMy,
      );
    }
    const pinnedSrc = instance.getSource("runners") as mapboxgl.GeoJSONSource | undefined;
    if (pinnedSrc) {
      pinnedSrc.setData(
        highlightedRunners.length > 0
          ? replayFeatures(data.course, highlightedRunners, targetTime, timeline.origin, courseIndex)
          : { type: "FeatureCollection", features: [] },
      );
    }
  };

  const togglePinRunnerRef = useRef(togglePinRunner);
  togglePinRunnerRef.current = togglePinRunner;
  const pickContextRef = useRef({ courseIndex, field });
  pickContextRef.current = { courseIndex, field };

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const changed = () => {
      setReduced(preference.matches);
      if (preference.matches) setPlaying(false);
    };
    changed();
    preference.addEventListener("change", changed);
    return () => preference.removeEventListener("change", changed);
  }, []);

  useEffect(() => {
    const hidden = () => {
      if (document.hidden) setPlaying(false);
    };
    document.addEventListener("visibilitychange", hidden);
    return () => document.removeEventListener("visibilitychange", hidden);
  }, []);

  // Sync React time/rankTime when playback pauses so scrubber and leaderboard match exact stop frame
  useEffect(() => {
    if (!playing) {
      setTime(timeRef.current);
      setRankTime(timeRef.current);
      if (scrubberInputRef.current) {
        scrubberInputRef.current.value = String(timeRef.current);
      }
    }
  }, [playing]);

  useEffect(() => {
    if (!playing && scrubberInputRef.current) {
      scrubberInputRef.current.value = String(time);
    }
  }, [time, playing]);

  // 60–120fps WebGL rAF playback loop: zero GeoJSON tiling on field + smooth camera + 4Hz leaderboard sync
  useEffect(() => {
    if (!playing || reduced || !data || !courseIndex || timeline.duration <= 0) return;
    let rafId = 0;
    let previous = performance.now();
    let lastRankSync = previous;
    let lastDuelSync = previous;

    const tick = (now: number) => {
      const dt = Math.min(now - previous, 100);
      previous = now;
      const nextTime = Math.min(timeline.duration, timeRef.current + dt * speed);
      timeRef.current = nextTime;

      if (scrubberInputRef.current) {
        scrubberInputRef.current.value = String(nextTime);
      }
      if (scrubberClockRef.current) {
        scrubberClockRef.current.textContent = raceClock(nextTime);
      }
      if (hudClockRef.current) {
        hudClockRef.current.textContent =
          timeline.origin !== null ? new Date(timeline.origin + nextTime).toLocaleTimeString() : raceClock(nextTime);
      }

      if (ready && map.current) {
        pushMapFrameRef.current(nextTime);

        if (cameraMode !== "field" && cameraTargetId !== null) {
          const idx = field.idToIndex.get(cameraTargetId);
          const r = idx !== undefined ? runners[idx] : undefined;
          if (r) {
            const effectiveTime =
              nextTime - (timeline.origin !== null && Number.isFinite(r.startMs) ? r.startMs - timeline.origin : 0);
            const distM = replayDistance(r, Math.max(0, effectiveTime)) ?? 0;
            const coord = replayCoordinateAt(courseIndex, distM);
            if (cameraMode === "follow") {
              map.current.jumpTo({
                center: coord,
                zoom: Math.max(map.current.getZoom(), 13.8),
                pitch: 0,
                bearing: 0,
              });
            } else if (cameraMode === "chase3d") {
              map.current.jumpTo({
                center: coord,
                zoom: 15.2,
                pitch: 58,
                bearing: computeCourseBearing(courseIndex, distM),
              });
            }
          }
        }
      }

      if (nextTime >= timeline.duration) {
        setTime(nextTime);
        setRankTime(nextTime);
        setPlaying(false);
        return;
      }

      if (replayMode === "duel" && now - lastDuelSync >= 32) {
        lastDuelSync = now;
        setTime(nextTime);
      }
      if (now - lastRankSync >= 250) {
        lastRankSync = now;
        setRankTime(nextTime);
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [playing, reduced, speed, data, courseIndex, field, runners, timeline.duration, timeline.origin, ready, cameraMode, cameraTargetId, replayMode]);

  useEffect(() => {
    if (!data || !container.current || !webEnv.mapboxAccessToken) return;
    setReady(false);
    setMapError("");
    let instance: mapboxgl.Map;
    try {
      instance = new mapboxgl.Map({
        container: container.current,
        accessToken: webEnv.mapboxAccessToken,
        style: "mapbox://styles/mapbox/standard",
        projection: "mercator",
        center: data.course.points[0].slice(0, 2) as [number, number],
        zoom: 11.5,
        ...mapboxAttributionOptions,
        logoPosition: "bottom-left",
      });
    } catch {
      setMapError("This browser could not start the map.");
      return;
    }
    map.current = instance;
    addMapboxAttribution(instance);
    let styleLoaded = false;
    instance.on("error", event => {
      const err = (event as { error?: { name?: string; status?: number; message?: string } })?.error;
      if (err?.name === "AbortError" || (err?.message && /abort/i.test(err.message))) return;
      const isAuthFailure = err?.status === 401 || err?.status === 403;
      if (styleLoaded && !isAuthFailure) return;
      setMapError("Some map data could not load. Check your connection and Mapbox access.");
      setPlaying(false);
    });
    instance.on("idle", () => setMapError(""));
    instance.on("load", () => {
      styleLoaded = true;
      setMapError("");
      try {
        instance.setConfigProperty("basemap", "lightPreset", "day");
        instance.setConfigProperty("basemap", "showPointOfInterestLabels", false);
        instance.setConfigProperty("basemap", "showTransitLabels", false);
      } catch {
        // Older Mapbox style payloads may omit optional Standard config properties.
      }
      const coords = data.course.points.map(p => p.slice(0, 2) as [number, number]);
      instance.addSource("course", {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: { type: "LineString", coordinates: coords },
        },
      });
      instance.addLayer({
        id: "course-casing",
        type: "line",
        source: "course",
        slot: "middle",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": "#cbd5dc",
          "line-width": ["interpolate", ["linear"], ["zoom"], 10, 4, 15, 7],
          "line-opacity": 0.45,
        },
      });
      instance.addLayer({
        id: "course",
        type: "line",
        source: "course",
        slot: "middle",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": "#637482",
          "line-width": ["interpolate", ["linear"], ["zoom"], 10, 1.75, 15, 3],
          "line-opacity": 0.55,
        },
      });
      const fieldLayer = new FieldWebGLLayer();
      fieldLayerRef.current = fieldLayer;
      instance.addLayer(fieldLayer);
      instance.addSource("runners", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      instance.addLayer({
        id: "runners-halo",
        type: "circle",
        source: "runners",
        slot: "top",
        paint: { "circle-opacity": 0.28 },
      });
      instance.addLayer({
        id: "runners",
        type: "circle",
        source: "runners",
        slot: "top",
      });
      applyRunnerLayerPaint(instance, pinnedIds, cameraTargetId, replayMode === "duel" ? (peerId ?? -1) : -1);
      const bounds = new mapboxgl.LngLatBounds();
      for (const point of data.course.points) bounds.extend([point[0], point[1]]);
      instance.fitBounds(bounds, { padding: 56, duration: 0 });
      setReady(true);
    });
    instance.on("click", event => {
      const hit = instance.queryRenderedFeatures(event.point, { layers: ["runners"] });
      const hitId = Number(hit[0]?.properties?.id);
      if (Number.isSafeInteger(hitId)) {
        togglePinRunnerRef.current(hitId);
        return;
      }
      const { courseIndex: idx, field: f } = pickContextRef.current;
      if (!idx || f.count === 0) return;
      evaluateFieldDistances(f, timeRef.current, fieldDistancesRef.current);
      const picked = pickNearestRunnerId(
        idx,
        f,
        fieldDistancesRef.current,
        event.lngLat.lng,
        event.lngLat.lat,
        instance.getZoom(),
        14,
      );
      if (picked !== null) togglePinRunnerRef.current(picked);
    });

    const visObserver = new IntersectionObserver(entries => {
      if (!entries[0]?.isIntersecting) setPlaying(false);
    });
    visObserver.observe(container.current);

    const resizeObserver = new ResizeObserver(() => {
      instance.resize();
    });
    resizeObserver.observe(container.current);

    return () => {
      visObserver.disconnect();
      resizeObserver.disconnect();
      fieldLayerRef.current = null;
      instance.remove();
      map.current = null;
    };
  }, [data, mapAttempt]);

  useEffect(() => {
    if (ready && !playing) {
      pushMapFrameRef.current(time);
    }
  }, [ready, time, playing, highlightedRunners, field, courseIndex]);

  const { rankDistances, leaderDistM } = useMemo(() => {
    const out = new Float32Array(field.count);
    const maxDist = evaluateFieldDistances(field, rankTime, out);
    return { rankDistances: out, leaderDistM: maxDist };
  }, [field, rankTime]);

  const entryForId = (id: number | null): RunnerWithDistance | null => {
    if (id === null) return null;
    const idx = field.idToIndex.get(id);
    if (idx === undefined) return null;
    const r = runners[idx];
    if (!r) return null;
    const raw = rankDistances[idx];
    const distM = raw >= 0 ? raw : 0;
    const effective = rankTime - field.startOffsetMs[idx];
    return { runner: r, distM, finished: effective >= field.finishMs[idx], finishMs: field.finishMs[idx] };
  };

  const pinnedEntries = useMemo(
    () => pinnedIds.map(id => entryForId(id)).filter((e): e is RunnerWithDistance => Boolean(e)),
    [pinnedIds, field, runners, rankDistances, rankTime],
  );

  const cameraTargetEntry = useMemo(
    () => entryForId(cameraTargetId),
    [cameraTargetId, field, runners, rankDistances, rankTime],
  );

  const duelPrimaryEntry = useMemo(
    () => entryForId(duelPrimaryId),
    [duelPrimaryId, field, runners, rankDistances, rankTime],
  );

  const peerEntry = useMemo(
    () => entryForId(peerId),
    [peerId, field, runners, rankDistances, rankTime],
  );

  useEffect(() => {
    if (!ready || !map.current) return;
    const highlightPinned =
      replayMode === "duel" ? (duelPrimaryId !== null ? [duelPrimaryId] : []) : pinnedIds;
    const activeFocus = replayMode === "duel" ? duelPrimaryId : cameraTargetId;
    const pId = replayMode === "duel" ? (peerId ?? -1) : -1;
    applyRunnerLayerPaint(map.current, highlightPinned, activeFocus, pId);
  }, [ready, pinnedIds, cameraTargetId, duelPrimaryId, peerId, replayMode]);

  useEffect(() => {
    if (!ready || !map.current || !courseIndex || playing || cameraMode === "field" || !cameraTargetEntry) return;
    const coord = replayCoordinateAt(courseIndex, cameraTargetEntry.distM);
    if (cameraMode === "follow") {
      map.current.easeTo({
        center: coord,
        zoom: Math.max(map.current.getZoom(), 13.8),
        pitch: 0,
        bearing: 0,
        duration: 450,
      });
    } else if (cameraMode === "chase3d") {
      map.current.easeTo({
        center: coord,
        zoom: 15.2,
        pitch: 58,
        bearing: computeCourseBearing(courseIndex, cameraTargetEntry.distM),
        duration: 500,
      });
    }
  }, [ready, courseIndex, cameraMode, cameraTargetEntry?.distM, cameraTargetEntry?.runner.id, playing]);

  function cycleCameraMode() {
    if (!ready || !map.current || !data) return;
    if (cameraMode === "field") {
      if (cameraTargetId === null) {
        const topSlice = selectFieldRankSlice(field, rankDistances, "field", 0, 1);
        const topId = topSlice.indices.length > 0 ? field.ids[topSlice.indices[0]] : null;
        const firstTarget = pinnedIds[0] ?? topId;
        if (firstTarget !== null) {
          setCameraTargetId(firstTarget);
          if (!pinnedIds.includes(firstTarget)) setPinnedIds(prev => [...prev, firstTarget]);
        }
      }
      setCameraMode("follow");
    } else if (cameraMode === "follow") {
      setCameraMode("chase3d");
    } else {
      setCameraMode("field");
      const bounds = new mapboxgl.LngLatBounds();
      for (const point of data.course.points) bounds.extend([point[0], point[1]]);
      map.current.fitBounds(bounds, { padding: 56, pitch: 0, bearing: 0, duration: 650 });
    }
  }

  const rankSliceResult = useMemo(() => {
    if (replayMode === "duel") return { total: field.count, indices: [] as number[] };
    return selectFieldRankSlice(field, rankDistances, replayMode, page * pageSize, pageSize, runnerSearch);
  }, [replayMode, field, rankDistances, page, pageSize, runnerSearch]);

  const totalRunners = rankSliceResult.total;
  const totalPages = Math.max(1, Math.ceil(totalRunners / pageSize));
  const safePage = Math.max(0, Math.min(page, totalPages - 1));
  const pageSlice = useMemo<RunnerWithDistance[]>(() => {
    const slice =
      safePage === page
        ? rankSliceResult.indices
        : selectFieldRankSlice(
            field,
            rankDistances,
            replayMode === "finish" ? "finish" : "field",
            safePage * pageSize,
            pageSize,
            runnerSearch,
          ).indices;
    return slice.map(idx => {
      const raw = rankDistances[idx];
      const distM = raw >= 0 ? raw : 0;
      const effective = rankTime - field.startOffsetMs[idx];
      return {
        runner: runners[idx],
        distM,
        finished: effective >= field.finishMs[idx],
        finishMs: field.finishMs[idx],
      };
    });
  }, [safePage, page, rankSliceResult.indices, field, rankDistances, replayMode, pageSize, runnerSearch, runners, rankTime]);

  const visibleRaceEditions = useMemo(
    () => (isRunningSport ? allRaceEditions.filter(ed => ed.distance_slug === storedDistance) : []),
    [isRunningSport, allRaceEditions, storedDistance],
  );

  const fastestFinishMs = field.fastestFinishMs;

  const duelSeries = useMemo(() => {
    if (!duelPrimaryEntry || !peerEntry || timeline.duration <= 0) return null;
    const N = 88;
    const gapsM = Array.from({ length: N }, (_, idx) => {
      const t = (timeline.duration * idx) / (N - 1);
      return (replayDistance(duelPrimaryEntry.runner, t) ?? 0) - (replayDistance(peerEntry.runner, t) ?? 0);
    });
    const peak = Math.max(50, ...gapsM.map(Math.abs)) * 1.12;
    return { N, gapsM, peak };
  }, [duelPrimaryEntry?.runner, peerEntry?.runner, timeline.duration]);

  const source = data ? raceSourceUrl(data.course.sourceUrl) : null;

  return (
    <div className="ovt-replay-studio">
      <div className="ovt-replay-filter-card">
        <SportFilterBar
          sport={sport}
          onSportChange={nextSport => {
            if (nextSport === sport) return;
            const targetObj = SPORTS.find(s => s.id === nextSport) ?? SPORTS[0];
            setSport(nextSport);
            setSportFormat(nextSport === "running" ? distanceSlug : targetObj.formats[0].value);
          }}
          format={isRunningSport ? distanceSlug : sportFormat}
          onFormatChange={nextVal => {
            if (isRunningSport) {
              if (nextVal === distanceSlug) return;
              setDistanceSlug(nextVal);
              setSportFormat(nextVal);
              const nextStored = RACE_DISTANCES.find(d => d.slug === nextVal)?.stored;
              const match = allRaceEditions.find(ed => ed.distance_slug === nextStored);
              if (match) setEditionId(match.edition_id);
              setIds(null);
              setPage(0);
            } else {
              setSportFormat(nextVal);
            }
          }}
          sex={category}
          onSexChange={nextSex => {
            setCategory(nextSex);
            setPage(0);
          }}
        />
      </div>

      {!isRunningSport ? (
        <div className="race-empty">
          <AppHeading level={2} role="heading">No published {activeSportObj.label} replays yet</AppHeading>
          <p>Select Running to watch published marathon, half marathon, 10K, and 5K course replays.</p>
        </div>
      ) : (
        <>
          <section className="ovt-replay-races" aria-label="Choose a race edition to replay">
            <div className="ovt-mini-title">
              <AppHeading level={2} role="heading">Choose a race</AppHeading>
              <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                <label className="ovt-inline-check">
                  <input
                    type="checkbox"
                    checked={hideIneligible}
                    onChange={e => setHideIneligible(e.target.checked)}
                  />
                  <span>Hide ineligible races</span>
                </label>
                <button
                  type="button"
                  className="ovt-btn quiet"
                  onClick={() => {
                    setPickerSearch("");
                    setPickerOpen(true);
                  }}
                >
                  View all races ↗
                </button>
              </div>
            </div>
            <div className="ovt-replay-race-shelf">
              {(visibleRaceEditions.length > 0 ? visibleRaceEditions : allRaceEditions)
                .filter(ed => {
                  if (!hideIneligible || coursePreviews === null) return true;
                  const pts = coursePreviews[`${ed.edition_id}:${ed.distance_slug}`];
                  return Boolean(pts && pts.length >= 2);
                })
                .map(ed => {
                  const isActive = ed.edition_id === editionId && ed.distance_slug === storedDistance;
                  const distLabel = RACE_DISTANCES.find(d => d.stored === ed.distance_slug)?.label ?? ed.distance_slug;
                  const coursePts = coursePreviews ? (coursePreviews[`${ed.edition_id}:${ed.distance_slug}`] ?? null) : null;
                  const hasReplayMap = coursePreviews === null ? true : Boolean(coursePts && coursePts.length >= 2);
                  return (
                    <article
                      key={`${ed.edition_id}:${ed.distance_slug}`}
                      className={`ovt-replay-race-card ${isActive ? "active" : ""} ${!hasReplayMap ? "is-ineligible" : ""}`}
                      aria-disabled={!hasReplayMap}
                      onClick={() => {
                        if (hasReplayMap) selectRaceEdition(ed.edition_id, ed.distance_slug);
                      }}
                    >
                      <RaceRouteArt eventName={ed.event_name} year={ed.edition_year} coursePoints={coursePts} />
                      <div className="ovt-replay-race-card-foot">
                        <div>
                          <strong>{formatEditionDisplay(ed.event_name, ed.edition_year)}</strong>
                          <small>{distLabel}</small>
                        </div>
                        <button
                          type="button"
                          className={`ovt-btn ${isActive ? "gold" : ""}`}
                          disabled={!hasReplayMap}
                          onClick={e => {
                            e.stopPropagation();
                            if (hasReplayMap) selectRaceEdition(ed.edition_id, ed.distance_slug);
                          }}
                        >
                          {!hasReplayMap ? "No GPS map" : isActive ? "● Watching" : "▶ Watch"}
                        </button>
                      </div>
                    </article>
                  );
                })}
            </div>
          </section>

          <section className="ovt-replay-shell" aria-label="Course map and playback controls">
            <div className="ovt-replay-head">
              <div className="title">
                <strong>
                  {activeRaceMeta ? formatEditionDisplay(activeRaceMeta.event_name, activeRaceMeta.edition_year) : `Edition #${editionId}`} · {distanceObj.label}
                </strong>
              </div>
              <div className="ovt-replay-head-controls">
                <div className="ovt-seg is-dark" role="tablist" aria-label="Start clock alignment">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={!wall}
                    className={!wall ? "on" : ""}
                    title="All athletes start together at 0:00 chip time"
                    onClick={() => {
                      if (!wall) return;
                      setWall(false);
                      timeRef.current = 0;
                      setTime(0);
                      setRankTime(0);
                      setPlaying(false);
                    }}
                  >
                    Chip time
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={wall}
                    className={wall ? "on" : ""}
                    disabled={!timeline.wallAvailable}
                    title={
                      timeline.wallAvailable
                        ? "Replay actual time-of-day wave starts"
                        : "Time-of-day wave start times are not available for this edition"
                    }
                    onClick={() => {
                      if (wall || !timeline.wallAvailable) return;
                      setWall(true);
                      timeRef.current = 0;
                      setTime(0);
                      setRankTime(0);
                      setPlaying(false);
                    }}
                  >
                    Time of day
                  </button>
                </div>
              </div>
            </div>

        <div className={`ovt-replay-map-stage ${mapExpanded ? "is-expanded" : ""}`}>
          {data && (
            <>
              <div className="ovt-map-top-actions">
                <button
                  type="button"
                  className={`ovt-camera-toggle ${cameraMode !== "field" ? "active" : ""}`}
                  onClick={cycleCameraMode}
                >
                  {cameraMode === "field"
                    ? "◉ Field camera"
                    : cameraMode === "follow"
                      ? "◎ Following athlete"
                      : "◈ 3D Chase POV"}
                </button>
                <button
                  type="button"
                  className={`ovt-camera-toggle ${mapExpanded ? "active" : ""}`}
                  onClick={() => setMapExpanded(v => !v)}
                  aria-pressed={mapExpanded}
                  title={mapExpanded ? "Restore default map height" : "Expand map window"}
                >
                  {mapExpanded ? "⤡ Compact map" : "⤢ Expand map"}
                </button>
              </div>
              <div className="ovt-map-head">
                <span>{timeline.origin !== null ? "Time of day" : "Chip time"}</span>
                <strong ref={hudClockRef}>
                  {timeline.origin !== null ? new Date(timeline.origin + time).toLocaleTimeString() : raceClock(time)}
                </strong>
                <span>
                  {cameraTargetEntry
                    ? `${(cameraTargetEntry.distM / 1000).toFixed(2)} / ${(totalMeters / 1000).toFixed(1)} km · ${cameraTargetEntry.runner.name} (est.)`
                    : `${runners.length} athletes`}
                </span>
              </div>

              {/* Pinned Athlete Overlay Cards — click any card to focus the camera on that athlete */}
              {pinnedEntries.length > 0 && (
                <div className="ovt-pinned-cards" aria-label="Pinned athletes">
                  {pinnedEntries.map(entry => {
                    const isCameraTarget = entry.runner.id === cameraTargetId;
                    return (
                      <div
                        key={entry.runner.id}
                        role="button"
                        tabIndex={0}
                        className={`ovt-pinned-card ${isCameraTarget ? "is-focused" : ""}`}
                        onClick={() => {
                          setCameraTargetId(entry.runner.id);
                          if (cameraMode === "field") setCameraMode("follow");
                        }}
                        onKeyDown={e => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setCameraTargetId(entry.runner.id);
                            if (cameraMode === "field") setCameraMode("follow");
                          }
                        }}
                        title="Click to focus camera on this pinned athlete"
                      >
                        <div className="ovt-pinned-card-top">
                          <strong>{entry.runner.name}</strong>
                          <button
                            type="button"
                            className="ovt-pinned-card-close"
                            aria-label={`Unpin ${entry.runner.name}`}
                            onClick={e => {
                              e.stopPropagation();
                              togglePinRunner(entry.runner.id);
                            }}
                          >
                            ×
                          </button>
                        </div>
                        <small>
                          {entry.finished
                            ? `Finished · ${raceClock(entry.finishMs)}`
                            : `${(entry.distM / 1000).toFixed(2)} km`}
                          {isCameraTarget && cameraMode !== "field" ? " · ◎ Camera" : ""}
                        </small>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="ovt-map-legend">
                <span className="ovt-legend-dot" style={{ background: "#FFB800", border: "1.5px solid #fff" }} /> Pinned
                {replayMode === "duel" && (
                  <>
                    <span className="ovt-legend-dot" style={{ background: "#24765c", border: "1.5px solid #fff" }} /> Challenger
                  </>
                )}
                <span className="ovt-legend-dot" style={{ background: "rgba(28, 53, 71, 0.55)" }} /> Field
              </div>
            </>
          )}

          {busy && (
            <div className="ovt-map-status" role="status">
              <p>Loading {progress.toLocaleString()} timing profiles…</p>
              <button
                type="button"
                className="ovt-btn"
                onClick={() => {
                  abort.current?.abort();
                  setBusy(false);
                  setError("Replay loading cancelled.");
                }}
              >
                Cancel
              </button>
            </div>
          )}

          {error && !busy && (
            <div className="ovt-map-status" role="alert">
              <p>{error}</p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
                <button type="button" className="ovt-btn" onClick={() => setAttempt(n => n + 1)}>
                  Retry
                </button>
                {editionId !== 6 && (
                  <button type="button" className="ovt-btn gold" onClick={() => selectRaceEdition(6, "marathon")}>
                    Load Chicago Marathon 2025 Replay →
                  </button>
                )}
              </div>
            </div>
          )}

          {!webEnv.mapboxAccessToken ? (
            <div className="ovt-map-status" role="alert">
              Map access is not configured.
            </div>
          ) : (
            <div
              ref={container}
              className="ovt-replay-mapbox-canvas"
              aria-label="Estimated race positions along the reviewed course"
            />
          )}

          {mapError && (
            <div className="ovt-map-status" role="alert">
              <p>{mapError}</p>
              <button type="button" className="ovt-btn" onClick={() => setMapAttempt(n => n + 1)}>
                Retry map
              </button>
            </div>
          )}
        </div>

        <div className="ovt-replay-controls">
          <div className="ovt-progressrow">
            <button
              type="button"
              className="ovt-replay-play"
              disabled={reduced || !runners.length}
              aria-label={playing ? "Pause race replay" : "Play race replay"}
              onClick={() => {
                if (timeRef.current >= timeline.duration) {
                  timeRef.current = 0;
                  setTime(0);
                  setRankTime(0);
                }
                setPlaying(v => !v);
              }}
            >
              {playing ? "Ⅱ" : "▶"}
            </button>
            <span ref={scrubberClockRef} className="time">{raceClock(time)}</span>
            <input
              ref={scrubberInputRef}
              key={`${scopeKey}|${wall ? "w" : "c"}|${timeline.duration}`}
              type="range"
              className="ovt-thin-scrubber"
              min={0}
              max={Math.max(timeline.duration, 1)}
              step="any"
              defaultValue={time}
              aria-label="Replay elapsed race time"
              onChange={e => {
                const nextTime = Number(e.target.value);
                setPlaying(false);
                timeRef.current = nextTime;
                setTime(nextTime);
                setRankTime(nextTime);
                if (scrubberClockRef.current) scrubberClockRef.current.textContent = raceClock(nextTime);
                if (hudClockRef.current) {
                  hudClockRef.current.textContent =
                    timeline.origin !== null ? new Date(timeline.origin + nextTime).toLocaleTimeString() : raceClock(nextTime);
                }
                if (ready && map.current && data) {
                  pushMapFrameRef.current(nextTime);
                }
              }}
            />
            <span className="time">{raceClock(timeline.duration)}</span>
            <button
              type="button"
              className="ovt-speed-btn"
              onClick={() => setSpeed(s => (s === 64 ? 128 : s === 128 ? 256 : s === 256 ? 512 : 64))}
              title="Cycle playback speed"
            >
              {speed}×
            </button>
            {ids !== null && (
              <button type="button" className="ovt-speed-btn" disabled={busy} onClick={() => setIds(null)}>
                All runners
              </button>
            )}
          </div>
        </div>
      </section>

      {data && runners.length > 0 && (
        <section className="ovt-replay-panel" aria-label="Replay standings and head-to-head comparison">
          <div className="ovt-replay-panel-top">
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <strong>
                {replayMode === "field"
                  ? "Live order (est.)"
                  : replayMode === "finish"
                    ? "Finish order"
                    : "Head-to-head"}
              </strong>
              {pinnedIds.length > 0 && replayMode !== "duel" && (
                <button
                  type="button"
                  className="ovt-chip gold"
                  onClick={() => {
                    setPinnedIds([]);
                    setCameraTargetId(null);
                    setCameraMode("field");
                  }}
                  title="Clear all pinned athletes"
                >
                  📌 {pinnedIds.length} pinned <span>×</span>
                </button>
              )}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              {replayMode !== "duel" && (
                <>
                  <input
                    type="search"
                    className="ovt-replay-search-input"
                    placeholder="Find runner or bib…"
                    aria-label="Search runners in replay"
                    value={runnerSearch}
                    onChange={e => {
                      setRunnerSearch(e.target.value);
                      setPage(0);
                    }}
                  />
                  <button
                    type="button"
                    className={`ovt-filter-chip subtle ${allSavedPinnedInReplay ? "active" : ""}`}
                    aria-pressed={allSavedPinnedInReplay}
                    title={allSavedPinnedInReplay ? "Unpin saved results" : "Pin your saved results in this race"}
                    onClick={toggleSavedAthletesPinned}
                  >
                    {allSavedPinnedInReplay ? "★ Saved pinned" : "☆ Saved results"}
                  </button>
                </>
              )}

              <div className="ovt-seg" role="tablist" aria-label="Replay leaderboard mode">
                <button
                  type="button"
                  role="tab"
                  aria-selected={replayMode === "field"}
                  className={replayMode === "field" ? "on" : ""}
                  onClick={() => {
                    setReplayMode("field");
                    setPage(0);
                  }}
                >
                  Live order
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={replayMode === "finish"}
                  className={replayMode === "finish" ? "on" : ""}
                  onClick={() => {
                    setReplayMode("finish");
                    setPage(0);
                  }}
                >
                  Finish order
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={replayMode === "duel"}
                  className={replayMode === "duel" ? "on" : ""}
                  onClick={() => {
                    if (duelPrimaryId === null && pinnedIds.length >= 1) setDuelPrimaryId(pinnedIds[0]);
                    if (peerId === null && pinnedIds.length >= 2) setPeerId(pinnedIds[1]);
                    setReplayMode("duel");
                  }}
                >
                  Head-to-head
                </button>
              </div>
            </div>
          </div>

          {replayMode !== "duel" ? (
            <>
              <div className="ovt-tablebox" style={{ border: 0, borderRadius: 0 }}>
                <table className="ovt-replay-table">
                  <thead>
                    <tr>
                      <th>{replayMode === "finish" ? "Rank" : "Est. rank*"}</th>
                      <th>Runner</th>
                      <th>At {raceClock(rankTime)}</th>
                      <th>Est. gap</th>
                      <th>Splits · elapsed</th>
                      <th>Pin</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageSlice.map((entry, idx) => {
                      const rank = safePage * pageSize + idx + 1;
                      const isPinned = pinnedIds.includes(entry.runner.id);
                      const gapM = Math.max(0, leaderDistM - entry.distM);
                      return (
                        <tr key={entry.runner.id} className={isPinned ? "active" : ""}>
                          <td>
                            <b>{replayMode === "field" && rankTime === 0 ? "—" : `#${rank}`}</b>
                          </td>
                          <td>
                            <button
                              type="button"
                              className="ovt-namebtn"
                              onClick={() => togglePinRunner(entry.runner.id)}
                            >
                              {entry.runner.name}
                            </button>
                          </td>
                          <td>
                            <b>
                              {entry.finished
                                ? `Finished · ${raceClock(entry.finishMs)}`
                                : `${(entry.distM / 1000).toFixed(2)} km`}
                            </b>
                          </td>
                          <td className="delta">
                            {rankTime === 0
                              ? "—"
                              : entry.finished
                                ? entry.finishMs === fastestFinishMs
                                  ? "Leader"
                                  : `+${raceClock(entry.finishMs - fastestFinishMs)}`
                                : gapM < 5
                                  ? "Leader"
                                  : `−${Math.round(gapM).toLocaleString()} m`}
                          </td>
                          <td>
                            <ProgressiveSplitSignature
                              runner={entry.runner}
                              distanceSlug={storedDistance}
                              currentDistM={entry.distM}
                              totalDistM={totalMeters}
                              active={rankTime > 0}
                            />
                          </td>
                          <td>
                            <div style={{ display: "flex", gap: 6 }}>
                              <button
                                type="button"
                                className={`ovt-btn ${isPinned ? "gold" : ""}`}
                                style={{ padding: "6px 12px" }}
                                onClick={() => togglePinRunner(entry.runner.id)}
                              >
                                {isPinned ? "✓ Pinned" : "Pin"}
                              </button>
                              <button
                                type="button"
                                className="ovt-btn"
                                style={{ padding: "6px 12px" }}
                                onClick={() => {
                                  if (duelPrimaryId === null) {
                                    setDuelPrimaryId(entry.runner.id);
                                  } else if (duelPrimaryId !== entry.runner.id) {
                                    setPeerId(entry.runner.id);
                                  }
                                  setReplayMode("duel");
                                }}
                              >
                                Duel
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="ovt-replay-pagination">
                <span className="ovt-hint">
                  *Positions &amp; gaps interpolated between recorded checkpoints (not live GPS)
                  {source && (
                    <>
                      {" · "}
                      <a href={source} target="_blank" rel="noreferrer">
                        Source ↗
                      </a>
                    </>
                  )}
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <nav className="ovt-replay-pages" aria-label="Leaderboard pages">
                    <button
                      type="button"
                      disabled={safePage === 0}
                      onClick={() => setPage(p => Math.max(0, p - 1))}
                      aria-label="Previous page"
                    >
                      ‹
                    </button>
                    {visiblePageWindow(safePage, totalPages).map((item, idx) =>
                      item === "ellipsis" ? (
                        <span key={`el-${idx}`} className="ovt-hint" style={{ padding: "0 4px" }} aria-hidden="true">
                          …
                        </span>
                      ) : (
                        <button
                          key={item}
                          type="button"
                          className={item === safePage ? "active" : ""}
                          aria-current={item === safePage ? "page" : undefined}
                          onClick={() => setPage(item)}
                        >
                          {item + 1}
                        </button>
                      ),
                    )}
                    <button
                      type="button"
                      disabled={safePage >= totalPages - 1}
                      onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                      aria-label="Next page"
                    >
                      ›
                    </button>
                  </nav>

                  <form
                    className="race-jump"
                    style={{ marginTop: 0 }}
                    onSubmit={e => {
                      e.preventDefault();
                      const raw = Number(new FormData(e.currentTarget).get("page"));
                      if (Number.isFinite(raw)) {
                        setPage(Math.max(0, Math.min(totalPages - 1, Math.floor(raw) - 1)));
                      }
                    }}
                  >
                    <label>
                      Page{" "}
                      <input
                        type="number"
                        name="page"
                        min="1"
                        max={totalPages}
                        required
                        key={safePage + 1}
                        defaultValue={safePage + 1}
                      />
                    </label>
                    <button type="submit" className="ovt-btn" style={{ ...typographyStyle("caption"), padding: "5px 11px" }}>
                      Go
                    </button>
                  </form>
                </div>
              </div>
            </>
          ) : (
            <div className="ovt-duel">
              <div className="ovt-duel-people">
                <DuelAthleteCard
                  roleLabel="Focus"
                  roleColor="#C88A00"
                  entry={duelPrimaryEntry}
                  runners={runners}
                  excludeId={peerId}
                  onSelect={id => setDuelPrimaryId(id)}
                  onClear={() => setDuelPrimaryId(null)}
                />

                <span className="ovt-vs">VS</span>

                <DuelAthleteCard
                  roleLabel="Challenger"
                  roleColor="#637482"
                  entry={peerEntry}
                  runners={runners}
                  excludeId={duelPrimaryId}
                  onSelect={id => setPeerId(id)}
                  onClear={() => setPeerId(null)}
                />
              </div>

              {duelPrimaryEntry && peerEntry && duelSeries && (
                <>
                  <div className="ovt-duel-chart">
                    {(() => {
                      const Lx = 40;
                      const Rx = 1070;
                      const Ty = 24;
                      const By = 172;
                      const midY = 98;
                      const xAt = (i: number) => Lx + ((Rx - Lx) * i) / (duelSeries.N - 1);
                      const yAt = (v: number) => midY - (v / duelSeries.peak) * (By - Ty) * 0.45;
                      const pathD = duelSeries.gapsM
                        .map((v, i) => `${i === 0 ? "M" : "L"}${xAt(i).toFixed(2)} ${yAt(v).toFixed(2)}`)
                        .join(" ");
                      const cursorX =
                        Lx + ((Rx - Lx) * Math.max(0, Math.min(timeline.duration, time))) / Math.max(1, timeline.duration);
                      return (
                        <svg
                          viewBox="0 0 1120 215"
                          role="img"
                          aria-label="Estimated distance advantage over equal elapsed race time"
                        >
                          <path d={`M${Lx} ${midY}H${Rx}`} stroke="#d0dad7" strokeWidth="1.5" strokeDasharray="5 5" />
                          <path
                            d={pathD}
                            fill="none"
                            stroke="#FFB800"
                            strokeWidth="3.5"
                            strokeLinejoin="round"
                            strokeLinecap="round"
                          />
                          <line
                            x1={cursorX}
                            x2={cursorX}
                            y1="17"
                            y2="184"
                            stroke="#142b3b"
                            strokeDasharray="4 4"
                            strokeWidth="1.8"
                          />
                          <g fill="#637482" className="ovt-svg-pill-label">
                            <text x={Lx} y="204">
                              Start
                            </text>
                            <text x={Rx} y="204" textAnchor="end">
                              Finish
                            </text>
                            <text x="52" y="14">
                              Estimated distance advantage · {duelPrimaryEntry.runner.name} vs {peerEntry.runner.name}
                            </text>
                          </g>
                        </svg>
                      );
                    })()}
                  </div>

                  {(() => {
                    const gapM = duelPrimaryEntry.distM - peerEntry.distM;
                    const aheadRunner = gapM >= 0 ? duelPrimaryEntry.runner : peerEntry.runner;
                    return (
                      <div className="ovt-duel-moment">
                        <strong>{Math.abs(Math.round(gapM)).toLocaleString()} m</strong>
                        <span>
                          {Math.abs(gapM) < 2 ? "Estimated even at this moment" : `${aheadRunner.name} ahead (est.)`}
                        </span>
                        <span style={{ flex: 1 }} />
                        <button
                          type="button"
                          className="ovt-btn"
                          onClick={() => {
                            const f = duelPrimaryEntry.runner.id;
                            setDuelPrimaryId(peerEntry.runner.id);
                            setPeerId(f);
                          }}
                        >
                          ⇄ Swap
                        </button>
                      </div>
                    );
                  })()}
                </>
              )}
            </div>
          )}
        </section>
      )}
        </>
      )}

      {pickerOpen && (
        <div className="ovt-scrim" onClick={e => e.target === e.currentTarget && setPickerOpen(false)}>
          <div className="ovt-modal" role="dialog" aria-modal="true" aria-label="Choose a race to replay">
            <div className="ovt-modal-head">
              <div>
                <span className="ovt-kicker">REPLAY STUDIO</span>
                <AppHeading level={2} role="heading">Choose a race to replay</AppHeading>
              </div>
              <button type="button" className="ovt-btn" onClick={() => setPickerOpen(false)}>
                ✕ Close
              </button>
            </div>
            <input
              className="ovt-modal-search"
              type="search"
              placeholder="Search race or year…"
              aria-label="Search race editions"
              value={pickerSearch}
              onChange={e => setPickerSearch(e.target.value)}
              autoFocus
            />
            <div className="ovt-race-list">
              {allRaceEditions
                .filter(e =>
                  `${e.event_name} ${e.edition_year} ${e.distance_slug}`
                    .toLowerCase()
                    .includes(pickerSearch.trim().toLowerCase()),
                )
                .filter(ed => {
                  if (!hideIneligible || coursePreviews === null) return true;
                  const pts = coursePreviews[`${ed.edition_id}:${ed.distance_slug}`];
                  return Boolean(pts && pts.length >= 2);
                })
                .map(ed => {
                  const isActive = ed.edition_id === editionId && ed.distance_slug === storedDistance;
                  const distLabel = RACE_DISTANCES.find(d => d.stored === ed.distance_slug)?.label ?? ed.distance_slug;
                  const pts = coursePreviews ? (coursePreviews[`${ed.edition_id}:${ed.distance_slug}`] ?? null) : null;
                  const hasReplayMap = coursePreviews === null ? true : Boolean(pts && pts.length >= 2);
                  return (
                    <div
                      key={`${ed.edition_id}:${ed.distance_slug}`}
                      className={`ovt-picker-row ${isActive ? "active" : ""}`}
                    >
                      <div>
                        <b>{formatEditionDisplay(ed.event_name, ed.edition_year)}</b>
                        <small>
                          {distLabel} · {ed.published_count.toLocaleString()} finishes
                        </small>
                      </div>
                      <div className="ovt-picker-actions">
                        <button
                          type="button"
                          className={`ovt-btn ${isActive ? "gold" : "primary"}`}
                          disabled={!hasReplayMap}
                          onClick={() => selectRaceEdition(ed.edition_id, ed.distance_slug)}
                        >
                          {!hasReplayMap ? "No GPS map" : isActive ? "● Watching" : "▶ Replay"}
                        </button>
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
