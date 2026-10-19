"use client";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  arenaBaselineStorageKey,
  clampArenaLaneCenter,
  formatArenaOvertakeStatus,
  readArenaBaseline,
  reconcileArenaOvertake,
  resolveArenaSelectedId,
  selfLaneLabel,
  serializeArenaBaseline,
  stepArenaOvertake,
  type ArenaOvertakePlan,
  type ArenaSceneLane,
  type ArenaViewWindow,
  type BoardRow,
} from "@fitness-battle/shared";
import { useAuth } from "@/components/auth-context";
import { ArenaLanes } from "@/features/focus/arena-lanes";
import { defaultLook } from "../avatar";
import {
  gapLabel,
  placeAt,
  stableLanes,
  valueAt,
  type SceneRunner,
} from "../geometry";
import type { FieldModel } from "../model";

const LivePursuit = dynamic(
  () => import("./live-pursuit").then((m) => m.LivePursuit),
  {
    ssr: false,
    loading: () => <div className="fd-loading">Preparing your lanes…</div>,
  },
);

export function FieldStage({
  model,
  boardRows,
}: {
  model: FieldModel;
  boardRows?: BoardRow[];
}) {
  const { user } = useAuth();
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

  const [mode, setMode] = useState<"lanes" | "pursuit" | "standings">("lanes");
  const [camera, setCamera] = useState<"above" | "follow">("above");
  const [span, setSpan] = useState(model.gps ? 6 : 20);
  const [center, setCenter] = useState<number | null>(null);
  const [showGhost, setShowGhost] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [overtakePlan, setOvertakePlan] = useState<ArenaOvertakePlan | null>(
    null,
  );
  const [overtakeProgress, setOvertakeProgress] = useState(1);
  const [replayEpoch, setReplayEpoch] = useState(0);
  const committedRef = useRef<Record<string, Record<string, number>>>({});
  const lastSignatureRef = useRef<string | null>(null);

  const toggleSelect = (id: string) =>
    setSelected((prev) => (prev === id ? null : id));

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
    committedRef.current[scopeKey] = nextCommitted;
    try {
      localStorage.setItem(key, snapshot);
    } catch {
      /* Storage optional */
    }
    if (!plan) {
      setOvertakePlan(null);
      setOvertakeProgress(1);
      return;
    }
    const reduced =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setCenter(null);
    setOvertakePlan(plan);
    if (reduced) {
      setOvertakeProgress(1);
      setReplayEpoch(0);
    } else {
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
  ]);

  useEffect(() => {
    if (!overtakePlan || replayEpoch === 0) return;
    let raf = 0;
    const start = performance.now();
    const duration = overtakePlan.durationMs;
    const tick = (now: number) => {
      const next = Math.min(1, (now - start) / duration);
      setOvertakeProgress(next);
      if (next < 1) {
        raf = requestAnimationFrame(tick);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [overtakePlan, replayEpoch]);

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

  const view: ArenaViewWindow = {
    center: clampArenaLaneCenter(
      center ?? (overtakeFrame ? overtakeFrame.viewCenter : total),
      span,
    ),
    span,
  };

  const trackSelected = resolveArenaSelectedId(
    selected,
    [...runners, ...(ghost ? [ghost] : [])],
    showGhost,
  );

  const chosen =
    selected == null
      ? null
      : selected === ghost?.id
        ? showGhost
          ? ghost
          : null
        : (runners.find((r) => r.id === selected) ?? null);

  const recentreForSelection = useRef<string | null>(null);
  useEffect(() => {
    if (!selected || mode !== "lanes") {
      recentreForSelection.current = null;
      return;
    }
    if (recentreForSelection.current === selected) return;
    recentreForSelection.current = selected;
    const runner =
      selected === ghost?.id && showGhost && ghost
        ? ghost
        : runners.find((r) => r.id === selected) ?? null;
    if (!runner) return;
    const target = valueAt(runner, time);
    setCenter((prev) => {
      const next = clampArenaLaneCenter(target, span);
      return prev === next ? prev : next;
    });
  }, [selected, mode, span, showGhost, ghost, runners, time]);

  if (!you) return <p className="fb-copy">Join a field to see your lanes.</p>;

  return (
    <section className="focus-arena-stage">
      <div className="focus-arena-total">
        <div>
          <p className="fb-kicker">Your week in motion</p>
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
          {!overtakeFrame && (
            <button
              type="button"
              className="fb-btn-ghost"
              style={{ padding: "2px 8px", fontSize: 12 }}
              onClick={() => {
                setCenter(null);
                setOvertakeProgress(0);
                setReplayEpoch((n) => n + 1);
              }}
            >
              ↻ Replay
            </button>
          )}
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
        {(["lanes", "pursuit", "standings"] as const).map((m) => {
          const isPursuit = m === "pursuit";
          return (
            <button
              key={m}
              role="tab"
              aria-selected={mode === m}
              disabled={isPursuit}
              title={isPursuit ? "3D pursuit (coming soon)" : undefined}
              style={
                isPursuit ? { opacity: 0.5, cursor: "not-allowed" } : undefined
              }
              onClick={() => {
                if (isPursuit) return;
                setMode(m);
                setUnavailable(false);
              }}
            >
              {m === "lanes"
                ? "2D lanes"
                : m === "pursuit"
                  ? "3D pursuit (coming soon)"
                  : "Standings"}
            </button>
          );
        })}
      </div>

      {mode === "standings" ? (
        <div className="focus-standings" style={{ margin: "14px 0" }}>
          {[...runners]
            .sort((a, b) => valueAt(b, time) - valueAt(a, time))
            .map((r) => (
              <button
                key={r.id}
                onClick={() => toggleSelect(r.id)}
                aria-pressed={selected === r.id}
              >
                <span>{placeAt(runners, r.id, time, 0)}</span>
                <b>{r.you ? selfLaneLabel(r.name) : r.name}</b>
                <small>
                  Effort Score{" "}
                  {boardRows?.find((row) => row.id === r.id)?.elo ?? "—"}
                </small>
                <strong>
                  {valueAt(r, time).toFixed(1)} {unit}
                </strong>
              </button>
            ))}
        </div>
      ) : (
        <>
          <div className="focus-track-frame">
            {mode === "pursuit" && !unavailable ? (
              <>
                <LivePursuit
                  runners={stableLanes(runners)}
                  ghost={ghost}
                  time={time}
                  extra={0}
                  selected={trackSelected || you.id}
                  showGhost={showGhost}
                  camera={camera}
                  look={defaultLook}
                  unit={unit}
                  view={view}
                  onPan={(v) => setCenter(Math.max(0, v))}
                  onSelect={toggleSelect}
                  onUnavailable={() => setUnavailable(true)}
                />
                <div className="focus-camera">
                  <button
                    onClick={() =>
                      setCamera(camera === "above" ? "follow" : "above")
                    }
                  >
                    {camera === "above" ? "Follow camera" : "Above camera"}
                  </button>
                </div>
              </>
            ) : (
              <ArenaLanes
                lanes={sceneLanes}
                view={view}
                unit={unit}
                selected={trackSelected || you.id}
                onSelect={toggleSelect}
                onPan={(v) => setCenter(clampArenaLaneCenter(v, span))}
                overtakeFrame={overtakeFrame}
                overtakePlan={overtakePlan}
              />
            )}
            {unavailable && (
              <p className="fb-note">
                3D is unavailable on this device. Your 2D lanes remain
                interactive.
              </p>
            )}
          </div>

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
              max={model.gps ? 40 : 100}
              step="1"
              value={span}
              onChange={(e) => setSpan(Number(e.target.value))}
              aria-label="Field zoom"
              style={{ flex: 1, accentColor: "#26382d" }}
            />
            <span
              className="fb-note"
              style={{ fontSize: 11, minWidth: 44, textAlign: "right" }}
            >
              ±{(span / 2).toFixed(0)} {unit}
            </span>
          </div>

          <div className="focus-track-caption">
            <span>
              ± {(span / 2).toFixed(1)} {unit} around{" "}
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
        </>
      )}

      {chosen && (
        <div
          className="focus-athlete-popup"
          role="dialog"
          aria-label="Athlete details"
        >
          <div className="focus-athlete-popup-head">
            <b>{chosen.you ? selfLaneLabel(chosen.name) : chosen.name}</b>
            <button
              type="button"
              aria-label="Close"
              onClick={() => setSelected(null)}
              className="focus-athlete-popup-close"
            >
              ×
            </button>
          </div>
          <div className="focus-athlete-popup-body">
            <strong>
              {valueAt(chosen, time).toFixed(1)} {unit}
            </strong>
            <span className="fb-note">
              · {gapLabel(chosen, you, time, 0, unit)}
            </span>
            {chosen.ghost && <span className="fb-note">· past you</span>}
          </div>
        </div>
      )}
    </section>
  );
}
