"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import { playCue } from "@/lib/haptics";
import { usePathname } from "next/navigation";
import {
  arenaBaselineStorageKey,
  arenaFieldHigh,
  clampArenaLaneCenterToField,
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
  placeAt,
  valueAt,
  type SceneRunner,
} from "../geometry";
import type { FieldModel } from "../model";

export function FieldStage({
  model,
  boardRows,
  sportTitle,
  tabActive = true,
}: {
  model: FieldModel;
  boardRows?: BoardRow[];
  sportTitle?: string;
  tabActive?: boolean;
}) {
  const { user } = useAuth();
  const pathname = usePathname();
  const reduced = useReducedMotion();
  const accountKey = user?.id ?? "guest";
  const unit = model.unit;
  const runners = useMemo<SceneRunner[]>(
    () =>
      model.runners.map((r) => ({
        id: r.id,
        name: r.name,
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

  const [mode, setMode] = useState<"lanes" | "standings">("lanes");
  const [lanesImmersive, setLanesImmersive] = useState(false);

  useEffect(() => {
    if (tabActive && shellTabFromPath(pathname)?.id === "arena") return;
    setLanesImmersive(false);
    setMode("lanes");
  }, [pathname, tabActive]);
  const [span, setSpan] = useState(model.gps ? (unit === "mi" ? 4 : 6) : 20);
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
  const [showGhost, setShowGhost] = useState(true);
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
    const runner = runners.find((item) => item.id === id) ?? (ghost?.id === id ? ghost : null);
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
        lastUpdated: model.runners.find((runner) => runner.id === r.id)
          ?.lastUpdated,
        you: r.you,
      })),
    [runners, time, model.runners],
  );
  const fieldHigh = useMemo(() => arenaFieldHigh(fieldLanes), [fieldLanes]);
  const clampViewCenter = useCallback(
    (value: number, viewSpan: number) =>
      clampArenaLaneCenterToField(
        value,
        viewSpan,
        fieldHigh,
        unit === "pts" ? 20 : 8,
      ),
    [fieldHigh, unit],
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
    unit,
    persistArenaBaseline,
  ]);

  useEffect(() => {
    if (!overtakePlan || replayEpoch === 0) return;
    if (reduced) { setOvertakeProgress(1); return; }
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
  const displaySpan = centerTween !== null && centerTweenRef.current
    ? centerTweenRef.current.fromSpan + (centerTweenRef.current.toSpan - centerTweenRef.current.fromSpan) * centerTween
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

  const tweenCenterTo = (target: number, nextSpan = view.span, follow = false) => {
    const clamped = clampViewCenter(target, nextSpan);
    const fromSpan = view.span;
    const from = liveCenterRef.current;
    if (Math.abs(from - clamped) < 0.05 && Math.abs(fromSpan - nextSpan) < 0.05) {
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
    centerTweenRef.current = { from, to: clamped, start, raf: 0, fromSpan, toSpan: nextSpan };
    setCenterTween(0);
    centerTweenRef.current.raf = requestAnimationFrame(tick);
  };

  useEffect(() => () => {
    if (centerTweenRef.current) cancelAnimationFrame(centerTweenRef.current.raf);
  }, []);

  const trackSelected = resolveArenaSelectedId(
    selected,
    [...runners, ...(ghost ? [ghost] : [])],
    showGhost,
  );

  if (!you) return <p className="fb-copy">Join a field to see your lanes.</p>;

  return (
    <section className="focus-arena-stage" hidden={!tabActive} aria-hidden={!tabActive}>
      <div className="focus-arena-total">
        <div>
          <p className="fb-kicker focus-arena-sport">
            {sportTitle ?? "Your week"}
          </p>
          <strong>
            {displayTotal.toFixed(1)}
            <small>{unit}</small>
          </strong>
        </div>
        <span className="focus-status">
          {displayPlace} / {runners.length}
          <small>your place</small>
        </span>
      </div>
      {overtakePlan && overtakeStatus && (
        <div
          className="focus-overtake-banner"
          role="status"
          aria-live="polite"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            padding: "8px 12px",
            marginBottom: 10,
            borderRadius: 12,
            background: overtakePlan.hasOvertake ? "#d4ee8940" : "#eef3e8",
            border: `1px solid ${overtakePlan.hasOvertake ? "#9bbf63" : "#d7e0cf"}`,
            fontSize: 13,
            color: "#26382d",
          }}
        >
          <span>
            <b>{overtakeStatus.headline}</b>
            {overtakeStatus.detail ? ` · ${overtakeStatus.detail}` : null}
          </span>
        </div>
      )}
      {ghost && (
        <p className="focus-gain">
          {total - valueAt(ghost, time) >= 0 ? "+" : ""}
          {(total - valueAt(ghost, time)).toFixed(1)} {unit} vs past you · same
          cutoff
        </p>
      )}
      <div className="focus-segments" role="tablist" aria-label="Arena view">
        {(["lanes", "standings"] as const).map((m) => (
          <button key={m} role="tab" aria-selected={mode === m}
            onClick={() => {
              if (m !== mode) void playCue("selection");
              setReplayEpoch(0);
              setOvertakeProgress(1);
              setMode(m);
            }}>
            {m === "lanes" ? "Lanes" : "Standings"}
          </button>
        ))}
      </div>

      <div>
      <div style={{ display: "flow-root" }}>
        <ExpandingField
          open={lanesImmersive && tabActive}
          tabActive={tabActive}
          onClose={() => setLanesImmersive(false)}
        >
          <div className="focus-field-toolbar">
            <span className="fb-note">{mode === "standings" ? "Ranked by this week's effort" : lanesImmersive ? "Drag to pan · swipe across peers" : "Click the field to expand · swipe across peers"}</span>
          </div>
          <div className="focus-track-frame">
              <ArenaLanes
                presentation={mode === "standings" ? "standings" : "lanes"}
                scores={Object.fromEntries((boardRows ?? []).map((row) => [row.id, row.elo]))}
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
          </div>

          <div hidden={mode === "standings"}>
          <div
            className="focus-zoom-slider"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 4px 6px",
            }}
          >
            <span className="fb-note" style={{ fontSize: 12 }}>
              Zoom
            </span>
            <input
              type="range"
              min="2"
              max={Math.max(model.gps ? 40 : 100, Math.ceil(view.span))}
              step="1"
              value={view.span}
              onChange={(e) => {
                const current = view.center;
                cancelCenterTween();
                setSpan(Number(e.target.value));
                if (center !== null) setCenter(current);
              }}
              onPointerUp={() => void playCue("selection")}
              onKeyUp={(e) => {
                if (e.key.startsWith("Arrow")) void playCue("selection");
              }}
              aria-label="Field zoom"
              style={{ flex: 1, accentColor: "#26382d" }}
            />
            <span
              className="fb-note"
              style={{ fontSize: 11, minWidth: 44, textAlign: "right" }}
            >
              ±{(view.span / 2).toFixed(0)} {unit}
            </span>
          </div>
          <div className="focus-viewport-actions" aria-label="Field viewport">
            <button
              type="button"
              className="focus-viewport-btn"
              title="Center on you"
              aria-label="Center me"
              onClick={() => {
                void playCue("light");
                tweenCenterTo(total, view.span, true);
              }}
            >
              ⊙
            </button>
            <button
              type="button"
              className="focus-viewport-btn"
              title="Fit full field"
              aria-label="Fit field"
              onClick={() => {
                void playCue("light");
                const values = runners.map((r) => valueAt(r, time));
                const min = Math.min(...values);
                const max = Math.max(...values);
                const mid = (min + max) / 2;
                const spread = Math.max(4, max - min + 2);
                tweenCenterTo(mid, spread * 1.2);
              }}
            >
              ⤢
            </button>
          </div>

          <div className="focus-track-caption">
            <span>
              ± {(view.span / 2).toFixed(1)} {unit} around{" "}
              {center === null ? "you" : view.center.toFixed(1)}
            </span>
            {ghost && (
              <label>
                <input
                  type="checkbox"
                  checked={showGhost}
                  onChange={(e) => {
                    const next = e.target.checked;
                    setShowGhost(next);
                    if (!next && selected === ghost?.id) setSelected(null);
                  }}
                />{" "}
                Past you
              </label>
            )}
          </div>
          </div>
        </ExpandingField>
      </div>
      </div>
    </section>
  );
}
