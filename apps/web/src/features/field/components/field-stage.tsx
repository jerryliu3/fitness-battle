"use client";
import { AppParagraph, AppText, typographyStyle } from "@/ui/section";
import { PortraitField } from "@/features/club/portrait-field";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import { playCue } from "@/lib/haptics";
import { usePathname } from "next/navigation";
import {
  portraitField,
  portraitFieldGap,
  arenaBaselineStorageKey,
  arenaFieldHigh,
  fieldDefaultSpan,
  clampCourseCenter,
  formatArenaOvertakeStatus,
  shellTabFromPath,
  readArenaBaseline,
  reconcileArenaOvertake,
  resolveArenaSelectedId,
  serializeArenaBaseline,
  stepArenaOvertake,
  type ArenaOvertakePlan,
  type ArenaSceneLane,
  type ArenaViewWindow,
  type BoardRow,
} from "@fitness-battle/shared";
import { useAuth } from "@/components/auth-context";
import { ExpandingField } from "./expanding-field";
import { ArenaLanes } from "@/features/focus/arena-lanes";
import {
  FieldGroundPicker,
  FieldOverview,
  useFieldAppearance,
} from "./field-course";
import { placeAt, valueAt, type SceneRunner } from "../geometry";
import type { FieldModel } from "../model";

export function FieldStage({
  model,
  boardRows,
  sportTitle,
  tabActive = true,
  arenaView,
  onArenaViewChange,
  chromeInHeader = false,
}: {
  model: FieldModel;
  boardRows?: BoardRow[];
  sportTitle?: string;
  tabActive?: boolean;
  arenaView?: "lanes2d" | "standings" | "3d";
  onArenaViewChange?: (view: "lanes2d" | "standings" | "3d") => void;
  chromeInHeader?: boolean;
}) {
  const { user } = useAuth();
  const pathname = usePathname();
  const reduced = useReducedMotion();
  const accountKey = user?.id ?? "guest";
  const [appearance, setAppearance] = useFieldAppearance(
    accountKey,
    model.sport,
  );
  const unit = model.unit;
  const runners = useMemo<SceneRunner[]>(
    () =>
      model.runners.map((r) => ({
        id: r.id,
        name: r.name,
        avatarUrl: r.avatarUrl,
        initials: r.initials,
        series: [0, ...r.km],
        you: r.you,
      })),
    [model.runners],
  );
  const time = Math.max(
    0,
    (runners.find((r) => r.you)?.series.length ?? 1) - 1,
  );
  const you = runners.find((r) => r.you);
  const total = you ? valueAt(you, time) : 0;
  const ghost: SceneRunner | null = model.ghost
    ? {
        id: model.ghost.id,
        name: model.ghost.name,
        initials: model.ghost.initials,
        series: [0, ...model.ghost.km],
        ghost: true,
      }
    : null;

  const [dimension, setDimension] = useState<"2d" | "3d">("2d");
  const [mode, setMode] = useState<"lanes" | "standings">("lanes");
  const controlledView = arenaView != null;
  const activeMode =
    controlledView && arenaView === "standings" ? "standings" : "lanes";
  const activeDimension =
    controlledView && arenaView === "3d" ? "3d" : "2d";
  const viewMode = controlledView ? activeMode : mode;
  const viewDimension = controlledView ? activeDimension : dimension;
  const [lanesImmersive, setLanesImmersive] = useState(false);

  useEffect(() => {
    if (tabActive && shellTabFromPath(pathname)?.id === "arena") return;
    setLanesImmersive(false);
    setMode("lanes");
  }, [pathname, tabActive]);
  const [span, setSpan] = useState(fieldDefaultSpan(unit));
  const [center, setCenter] = useState<number | null>(null);
  const [centerTween, setCenterTween] = useState<number | null>(null);
  const centerTweenRef = useRef<{
    from: number;
    to: number;
    start: number;
    raf: number;
    fromSpan: number;
    toSpan: number;
  } | null>(null);
  const liveCenterRef = useRef(0);
  const showGhost = true;
  const [selected, setSelected] = useState<string | null>(null);
  const [overtakePlan, setOvertakePlan] = useState<ArenaOvertakePlan | null>(
    null,
  );
  const [overtakeProgress, setOvertakeProgress] = useState(1);
  const [replayEpoch, setReplayEpoch] = useState(0);
  const committedRef = useRef<Record<string, Record<string, number>>>({});
  const lastSignatureRef = useRef<string | null>(null);
  const pendingBaselineRef = useRef<{
    key: string;
    snapshot: string;
    scopeKey: string;
    nextCommitted: Record<string, number>;
  } | null>(null);

  const persistArenaBaseline = useCallback(
    (
      key: string,
      snapshot: string,
      scopeKey: string,
      nextCommitted: Record<string, number>,
    ) => {
      committedRef.current[scopeKey] = nextCommitted;
      try {
        localStorage.setItem(key, snapshot);
      } catch {
        /* Storage optional */
      }
    },
    [],
  );

  const toggleSelect = (id: string) => {
    const runner =
      runners.find((item) => item.id === id) ??
      (ghost?.id === id ? ghost : null);
    if (!runner) return;
    setSelected(id);
    tweenCenterTo(valueAt(runner, time));
  };

  const fieldLanes: ArenaSceneLane[] = useMemo(
    () =>
      runners.map((r) => ({
        id: r.id,
        name: r.name,
        initials: r.initials,
        value: valueAt(r, time),
        avatarUrl: r.avatarUrl,
        lastUpdated: model.runners.find((runner) => runner.id === r.id)
          ?.lastUpdated,
        you: r.you,
      })),
    [runners, time, model.runners],
  );
  const fieldHigh = useMemo(() => arenaFieldHigh(fieldLanes), [fieldLanes]);
  const clampViewCenter = useCallback(
    (value: number, viewSpan: number) =>
      clampCourseCenter(value, viewSpan, fieldHigh, unit, appearance.ground),
    [fieldHigh, unit, appearance.ground],
  );

  const sceneLanes: ArenaSceneLane[] = useMemo(
    () =>
      showGhost && ghost
        ? [
            ...fieldLanes,
            {
              id: ghost.id,
              name: ghost.name,
              initials: ghost.initials,
              value: valueAt(ghost, time),
              ghost: true,
            },
          ]
        : fieldLanes,
    [fieldLanes, ghost, showGhost, time],
  );

  useEffect(() => {
    if (!tabActive) return;
    const key = arenaBaselineStorageKey(accountKey, model.sport, model.track);
    const scopeKey = `${key}:${model.periodStart}:${unit}`;
    const signature = `${scopeKey}|${fieldLanes
      .map((lane) => `${lane.id}:${lane.value.toFixed(3)}`)
      .join(",")}`;
    if (lastSignatureRef.current === signature) return;
    lastSignatureRef.current = signature;

    let previous: Record<string, number> | null = null;
    try {
      previous = readArenaBaseline(
        localStorage.getItem(key),
        model.periodStart,
        unit,
      );
    } catch {
      previous = committedRef.current[scopeKey] ?? null;
    }
    const plan = reconcileArenaOvertake(fieldLanes, previous);
    const snapshot = serializeArenaBaseline(
      model.periodStart,
      fieldLanes,
      unit,
    );
    const nextCommitted: Record<string, number> = {};
    for (const lane of fieldLanes) {
      nextCommitted[lane.id] = lane.value;
    }
    if (pendingBaselineRef.current) {
      const pending = pendingBaselineRef.current;
      persistArenaBaseline(
        pending.key,
        pending.snapshot,
        pending.scopeKey,
        pending.nextCommitted,
      );
      pendingBaselineRef.current = null;
    }
    if (!plan) {
      persistArenaBaseline(key, snapshot, scopeKey, nextCommitted);
      setOvertakePlan(null);
      setOvertakeProgress(1);
      return;
    }
    const reduced =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (centerTweenRef.current?.raf) {
      cancelAnimationFrame(centerTweenRef.current.raf);
    }
    centerTweenRef.current = null;
    setCenterTween(null);
    setCenter(null);
    setMode("lanes");
    setOvertakePlan(plan);
    if (reduced) {
      persistArenaBaseline(key, snapshot, scopeKey, nextCommitted);
      setOvertakeProgress(1);
      setReplayEpoch(0);
    } else {
      pendingBaselineRef.current = {
        key,
        snapshot,
        scopeKey,
        nextCommitted,
      };
      setOvertakeProgress(0);
      setReplayEpoch((n) => n + 1);
    }
  }, [
    accountKey,
    fieldLanes,
    model.periodStart,
    model.sport,
    model.track,
    tabActive,
    unit,
    persistArenaBaseline,
  ]);

  useEffect(() => {
    if (!overtakePlan || replayEpoch === 0) return;
    if (reduced) {
      setOvertakeProgress(1);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const duration = overtakePlan.durationMs;
    const tick = (now: number) => {
      const next = Math.min(1, (now - start) / duration);
      setOvertakeProgress(next);
      if (next >= 1 && pendingBaselineRef.current) {
        const pending = pendingBaselineRef.current;
        persistArenaBaseline(
          pending.key,
          pending.snapshot,
          pending.scopeKey,
          pending.nextCommitted,
        );
        pendingBaselineRef.current = null;
      }
      if (next < 1) {
        raf = requestAnimationFrame(tick);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [overtakePlan, replayEpoch, reduced, persistArenaBaseline]);

  const overtakeFrame = useMemo(
    () =>
      overtakePlan && overtakeProgress < 1
        ? stepArenaOvertake(overtakePlan, overtakeProgress, span)
        : null,
    [overtakePlan, overtakeProgress, span],
  );

  const overtakeStatus = useMemo(
    () =>
      overtakePlan
        ? formatArenaOvertakeStatus(overtakePlan, overtakeFrame, unit)
        : null,
    [overtakeFrame, overtakePlan, unit],
  );

  const displayTotal = overtakeFrame ? overtakeFrame.youValue : total;
  const displayPlace =
    overtakeFrame && you
      ? overtakeFrame.currentRank
      : you
        ? placeAt(runners, you.id, time, 0)
        : 0;

  const followCenter = overtakeFrame ? overtakeFrame.viewCenter : total;
  const resolvedCenter = clampViewCenter(center ?? followCenter, span);
  const displaySpan =
    centerTween !== null && centerTweenRef.current
      ? centerTweenRef.current.fromSpan +
        (centerTweenRef.current.toSpan - centerTweenRef.current.fromSpan) *
          centerTween
      : span;
  const displayCenter =
    centerTween !== null && centerTweenRef.current
      ? clampViewCenter(
          centerTweenRef.current.from +
            (centerTweenRef.current.to - centerTweenRef.current.from) *
              centerTween,
          displaySpan,
        )
      : resolvedCenter;
  liveCenterRef.current = displayCenter;

  const view: ArenaViewWindow = {
    center: displayCenter,
    span: displaySpan,
  };

  const cancelCenterTween = () => {
    if (centerTweenRef.current?.raf) {
      cancelAnimationFrame(centerTweenRef.current.raf);
    }
    centerTweenRef.current = null;
    setCenterTween(null);
  };

  const tweenCenterTo = (
    target: number,
    nextSpan = view.span,
    follow = false,
  ) => {
    const clamped = clampViewCenter(target, nextSpan);
    const fromSpan = view.span;
    const from = liveCenterRef.current;
    if (
      Math.abs(from - clamped) < 0.05 &&
      Math.abs(fromSpan - nextSpan) < 0.05
    ) {
      cancelCenterTween();
      setCenter(follow ? null : clamped);
      setSpan(nextSpan);
      return;
    }
    cancelCenterTween();
    const reduced =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setCenter(follow ? null : clamped);
      setSpan(nextSpan);
      return;
    }
    const start = performance.now();
    const duration = 420;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setCenterTween(eased);
      if (t < 1) {
        const raf = requestAnimationFrame(tick);
        if (centerTweenRef.current) centerTweenRef.current.raf = raf;
      } else {
        centerTweenRef.current = null;
        setCenterTween(null);
        setCenter(follow ? null : clamped);
        setSpan(nextSpan);
      }
    };
    centerTweenRef.current = {
      from,
      to: clamped,
      start,
      raf: 0,
      fromSpan,
      toSpan: nextSpan,
    };
    setCenterTween(0);
    centerTweenRef.current.raf = requestAnimationFrame(tick);
  };

  const centerOnYou = () => {
    tweenCenterTo(total, view.span, true);
  };
  void centerOnYou;

  useEffect(
    () => () => {
      if (centerTweenRef.current)
        cancelAnimationFrame(centerTweenRef.current.raf);
    },
    [],
  );

  const trackSelected = resolveArenaSelectedId(
    selected,
    [...runners, ...(ghost ? [ghost] : [])],
    showGhost,
  );

  if (!you) return <AppParagraph typographyRole="body" className="fb-copy">Join a field to see your lanes.</AppParagraph>;

  return (
    <section
      className="focus-arena-stage"
      hidden={!tabActive}
      aria-hidden={!tabActive}
    >
      {!chromeInHeader ? (
      <div className="focus-arena-total">
        <div>
          <AppParagraph typographyRole="badgeLabel" className="fb-kicker">Accumulated this week</AppParagraph>
          <strong>
            {displayTotal.toFixed(1)}
            <AppText as="small" role="caption" secondary>{unit}</AppText>
          </strong>
        </div>
        <span className="focus-status">
          {displayPlace} / {runners.length}
          <AppText as="small" role="caption" secondary>your place</AppText>
        </span>
      </div>
      ) : null}
      {!chromeInHeader && overtakePlan && overtakeStatus && (
        <div
          className="focus-overtake-banner"
          role="status"
          aria-live="polite"
          style={{
    ...typographyStyle("supporting"),
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    padding: "8px 12px",
    marginBottom: 10,
    borderRadius: 12,
    background: overtakePlan.hasOvertake ? "#d4ee8940" : overtakePlan.passedByIds?.length ? "#fff3d6" : "#eef3e8",
    border: `1px solid ${overtakePlan.hasOvertake ? "#9bbf63" : overtakePlan.passedByIds?.length ? "#e6c36a" : "#d7e0cf"}`,
    color: "#26382d"
}}
        >
          <span>
            <b>{overtakeStatus.headline}</b>
            {overtakeStatus.detail ? ` · ${overtakeStatus.detail}` : null}
          </span>
        </div>
      )}
      {!chromeInHeader ? (
      <div className="focus-segments" role="tablist" aria-label="Arena view">
        {(["lanes", "standings", "3d"] as const).map((m) => (
          <button
            key={m}
            role="tab"
            aria-selected={
              m === "3d"
                ? viewMode === "lanes" && viewDimension === "3d"
                : viewMode === m && (m === "standings" || viewDimension === "2d")
            }
            onClick={() => {
              void playCue("selection");
              setReplayEpoch(0);
              setOvertakeProgress(1);
              const next =
                m === "3d" ? "3d" : m === "standings" ? "standings" : "lanes2d";
              if (controlledView) onArenaViewChange?.(next);
              else {
                setMode(m === "3d" ? "lanes" : m);
                setDimension(m === "3d" ? "3d" : "2d");
              }
            }}
          >
            {m === "lanes" ? "2D map" : m === "3d" ? "3D field" : "Standings"}
          </button>
        ))}
      </div>
      ) : null}

      {viewDimension === "3d" && viewMode === "lanes" && tabActive ? (
        <PortraitField
          lanes={sceneLanes.map((l) => ({
            ...l,
            value: overtakeFrame?.laneValues[l.id] ?? l.value,
          }))}
          view={view}
          unit={unit}
          onZoom={(value) => {
            cancelCenterTween();
            setSpan(value);
          }}
          onSelect={toggleSelect}
        />
      ) : null}
      <div hidden={viewDimension === "3d" && viewMode === "lanes"}>
        <div style={{ display: "flow-root" }}>
          <ExpandingField
            open={lanesImmersive && tabActive}
            tabActive={tabActive}
            onClose={() => setLanesImmersive(false)}
          >
            <div className="focus-field-toolbar">
              <span className="fb-note">
                {viewMode === "standings"
                  ? "Ranked by this week's effort"
                  : lanesImmersive
                    ? "Drag to pan · swipe across peers"
                    : null}
              </span>
            </div>
            <div className="focus-track-frame">
              {viewMode === "lanes" && (
                <FieldGroundPicker
                  appearance={appearance}
                  onChange={setAppearance}
                />
              )}
              {viewMode === "lanes" ? (
                <div className="club-map-status">
                  <b>
                    {displayPlace} / {runners.length} PLACE
                  </b>
                  <span>
                    {portraitFieldGap(
                      portraitField(sceneLanes, view).nextGap,
                      unit,
                    )}
                  </span>
                </div>
              ) : null}
              <ArenaLanes
                appearance={appearance}
                presentation={viewMode === "standings" ? "standings" : "lanes"}
                scores={Object.fromEntries(
                  (boardRows ?? []).map((row) => [row.id, row.elo]),
                )}
                immersive={lanesImmersive}
                lanes={sceneLanes}
                view={view}
                unit={unit}
                selected={trackSelected || you.id}
                onSelect={toggleSelect}
                onBackgroundTap={() => {
                  void playCue("light");
                  setLanesImmersive(true);
                }}
                onPan={(v) => {
                  cancelCenterTween();
                  setSpan(view.span);
                  setCenter(clampViewCenter(v, view.span));
                }}
                overtakeFrame={overtakeFrame}
                overtakePlan={overtakePlan}
              />
              {viewMode === "standings" && ghost && <div className="club-past-self"><span>Past you · unranked</span><strong>{valueAt(ghost, time).toFixed(1)} {unit}</strong></div>}
              {viewMode === "lanes" ? (
                <>
                  <div
                    className="focus-zoom-slider"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "10px 4px 6px",
                    }}
                  >
                    <span className="fb-note" style={{ ...typographyStyle("caption") }}>
                      Zoom
                    </span>
                    <input
                      type="range"
                      min={model.gps ? 0.5 : 2}
                      max={Math.max(model.gps ? 40 : 100, Math.ceil(view.span))}
                      step={model.gps ? "any" : 1}
                      value={view.span}
                      onChange={(e) => {
                        const current = view.center;
                        cancelCenterTween();
                        setSpan(Number(e.target.value));
                        if (center !== null) setCenter(current);
                      }}
                      onPointerUp={() => void playCue("selection")}
                      onKeyUp={(e) => {
                        if (e.key.startsWith("Arrow"))
                          void playCue("selection");
                      }}
                      aria-label="Field zoom"
                      style={{ flex: 1, accentColor: "#26382d" }}
                    />
                    <span
                      className="fb-note"
                      style={{ ...typographyStyle("caption"), minWidth: 44, textAlign: "right" }}
                    >
                      ±
                      {(view.span / 2).toLocaleString("en-US", {
                        maximumFractionDigits: unit === "pts" ? 0 : 2,
                      })}{" "}
                      {unit}
                    </span>
                  </div>
                </>
              ) : null}
            </div>

            <div hidden={viewMode === "standings"}>
              <FieldOverview
                lanes={
                  overtakeFrame
                    ? sceneLanes.map((l) => ({
                        ...l,
                        value: overtakeFrame.laneValues[l.id] ?? l.value,
                      }))
                    : sceneLanes
                }
                view={view}
                unit={unit}
                onNavigate={(value) =>
                  tweenCenterTo(
                    value,
                    appearance.ground === "oval"
                      ? Math.min(view.span, fieldDefaultSpan(unit) / 2)
                      : view.span,
                  )
                }
              />
            </div>
          </ExpandingField>
        </div>
      </div>
    </section>
  );
}
