"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatedEmber } from "@/components/mascot/ember";
import type { EmberClipName } from "@fitness-battle/shared";
import {
  gapLabel,
  placeAt,
  stableLanes,
  trackWindow,
  trackY,
  valueAt,
  type SceneRunner,
} from "../geometry";

export function LaneTrack({
  runners,
  ghost,
  time,
  extra,
  selected,
  showGhost,
  unit,
  onSelect,
}: {
  runners: SceneRunner[];
  ghost: SceneRunner | null;
  time: number;
  extra: number;
  selected: string;
  showGhost: boolean;
  unit: string;
  onSelect: (id: string) => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const drag = useRef<{ y: number; min: number; moved: boolean } | null>(null);
  const [width, setWidth] = useState(720);
  const [span, setSpan] = useState(6);
  const [pan, setPan] = useState<number | null>(null);
  const [overview, setOverview] = useState(true);

  // Smooth spring-like interpolation for time & extra so checkpoint jumps glide smoothly
  const [animState, setAnimState] = useState({ t: time, ex: extra, moving: false });
  const targetRef = useRef({ t: time, ex: extra });
  targetRef.current = { t: time, ex: extra };

  useEffect(() => {
    let raf = 0;
    function step() {
      setAnimState((prev) => {
        const dt = targetRef.current.t - prev.t;
        const dex = targetRef.current.ex - prev.ex;
        if (Math.abs(dt) < 0.004 && Math.abs(dex) < 0.01) {
          return { t: targetRef.current.t, ex: targetRef.current.ex, moving: false };
        }
        const nextT = prev.t + dt * 0.18;
        const nextEx = prev.ex + dex * 0.22;
        raf = requestAnimationFrame(step);
        return { t: nextT, ex: nextEx, moving: true };
      });
    }
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [time, extra]);

  const lanes = stableLanes(runners);
  const you = lanes.find((runner) => runner.you) ?? lanes[0];

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setWidth(Math.max(280, entry.contentRect.width));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  if (!you || lanes.length === 0) return null;

  const displayTime = animState.t;
  const displayExtra = animState.ex;

  const height = 520;
  const total = valueAt(you, displayTime, displayExtra);
  const baseTotal = valueAt(you, displayTime, 0);
  const peak = Math.max(
    ...lanes.map((runner) => runner.series.at(-1) ?? 0),
    ghost?.series.at(-1) ?? 0,
    total,
    5,
  );
  const window = trackWindow(total, span, pan, overview ? peak : undefined);
  const plotWidth = width - 56;
  const laneWidth = plotWidth / lanes.length;
  const y = (distance: number) => trackY(distance, window.min, window.max, height);
  const startY = Math.max(70, Math.min(height - 36, y(window.min)));
  const leaderKm = Math.max(...lanes.map((r) => valueAt(r, displayTime, r.you ? displayExtra : 0)));
  const leaderY = Math.max(70, Math.min(height - 36, y(leaderKm)));
  const youPlace = placeAt(lanes, you.id, displayTime, displayExtra);
  const basePlace = placeAt(lanes, you.id, displayTime, 0);

  const emberClip: EmberClipName =
    youPlace < basePlace
      ? "celebrate"
      : animState.moving
        ? "dash"
        : youPlace === 1
          ? "celebrate"
          : "idle";

  const tickStep = overview
    ? Math.max(1, Math.ceil((window.max - window.min) / 6))
    : span <= 3
      ? 0.5
      : 1;
  const ticks = Array.from(
    { length: Math.ceil((window.max - window.min) / tickStep) + 1 },
    (_, i) => Math.ceil(window.min / tickStep) * tickStep + i * tickStep,
  ).filter((km) => km <= window.max + 0.001);
  const startVisible = window.min === 0;

  function nudge(delta: number) {
    setSpan(window.max - window.min);
    setOverview(false);
    setPan(Math.max(0, window.min + delta));
  }

  return (
    <div className="fd-lanes" ref={host}>
      <div className="fd-lane-tools">
        <div>
          <button
            type="button"
            aria-pressed={!overview && pan === null}
            onClick={() => {
              setSpan(6);
              setPan(null);
              setOverview(false);
            }}
          >
            Follow me
          </button>
          <button
            type="button"
            aria-pressed={overview}
            onClick={() => {
              setOverview(true);
              setPan(null);
            }}
          >
            Fit field
          </button>
        </div>
        <div>
          <button type="button" aria-label="Move track window back" onClick={() => nudge(-1)}>
            ↓
          </button>
          <button type="button" aria-label="Move track window forward" onClick={() => nudge(1)}>
            ↑
          </button>
          <button
            type="button"
            onClick={() => {
              setSpan((value) => (value <= 3 ? 6 : 3));
              setOverview(false);
            }}
          >
            {span <= 3 ? "Zoom out" : "Zoom in"}
          </button>
        </div>
      </div>
      <svg
        className="fd-lane-svg"
        viewBox={`0 0 ${width} ${height}`}
        role="group"
        aria-label="Straight field. Position is weekly distance or effort. Lane number is not rank."
        onPointerDown={(event) => {
          if (event.pointerType === "touch" || event.button !== 0) return;
          drag.current = { y: event.clientY, min: window.min, moved: false };
        }}
        onPointerMove={(event) => {
          const state = drag.current;
          if (!state || event.buttons !== 1) return;
          const delta = event.clientY - state.y;
          if (Math.abs(delta) > 5) {
            state.moved = true;
            setSpan(window.max - window.min);
            setOverview(false);
            setPan(
              Math.max(
                0,
                state.min + (delta / (height - 132)) * (window.max - window.min),
              ),
            );
          }
        }}
        onPointerUp={() => {
          drag.current = null;
        }}
      >
        <rect className="lane-ground" width={plotWidth} height={height} rx="14" />
        {lanes.map((runner, index) => (
          <rect
            key={runner.id}
            className={runner.you ? "lane-strip lane-yours" : "lane-strip"}
            x={index * laneWidth}
            y="0"
            width={laneWidth}
            height={height}
          />
        ))}
        {ticks.map((km) => (
          <g key={km}>
            <line className="lane-rule" x1="0" x2={plotWidth} y1={y(km)} y2={y(km)} />
            <text className="lane-tick" x={plotWidth + 8} y={y(km) + 4}>
              {km.toFixed(km % 1 === 0 ? 0 : 1)}
            </text>
          </g>
        ))}

        {/* Leader pace reference line */}
        {leaderKm > 0.1 ? (
          <line
            className="lane-leader-line"
            x1="0"
            x2={plotWidth}
            y1={leaderY}
            y2={leaderY}
          />
        ) : null}

        {startVisible ? (
          <text className="lane-start" x={plotWidth / 2} y={y(0) + 28} textAnchor="middle">
            START LINE
          </text>
        ) : null}

        {/* Effort wake bars behind each runner */}
        {lanes.map((runner, index) => {
          const km = valueAt(runner, displayTime, runner.you ? displayExtra : 0);
          const yy = Math.max(70, Math.min(height - 36, y(km)));
          const x = (index + 0.5) * laneWidth;
          const wakeHeight = Math.max(0, startY - yy);
          const baseYy = runner.you
            ? Math.max(70, Math.min(height - 36, y(baseTotal)))
            : yy;
          return (
            <g key={`${runner.id}-wake`} pointerEvents="none">
              {wakeHeight > 2 ? (
                <rect
                  className={runner.you ? "lane-wake lane-wake-you" : "lane-wake"}
                  x={x - (runner.you ? 6 : 4)}
                  y={yy}
                  width={runner.you ? 12 : 8}
                  height={wakeHeight}
                  rx={runner.you ? 6 : 4}
                />
              ) : null}
              {runner.you && displayExtra > 0.05 && baseYy > yy ? (
                <line
                  className="lane-extra-projection"
                  x1={x}
                  y1={baseYy}
                  x2={x}
                  y2={yy}
                />
              ) : null}
            </g>
          );
        })}

        {showGhost && ghost ? (
          <g>
            <circle
              className="lane-ghost"
              cx={laneWidth * (lanes.findIndex((runner) => runner.you) + 0.5)}
              cy={Math.max(70, Math.min(height - 36, y(valueAt(ghost, displayTime))))}
              r="12"
            />
          </g>
        ) : null}

        {lanes.map((runner, index) => {
          const km = valueAt(runner, time, extra);
          const animKm = valueAt(runner, displayTime, runner.you ? displayExtra : 0);
          const raw = y(animKm);
          const yy = Math.max(70, Math.min(height - 36, raw));
          const x = (index + 0.5) * laneWidth;
          const place = placeAt(lanes, runner.id, displayTime, displayExtra);
          return (
            <g
              key={runner.id}
              role="button"
              tabIndex={0}
              aria-label={`${runner.name}, ${km.toFixed(1)} ${unit}, ${gapLabel(runner, you, time, extra, unit)}`}
              onClick={() => {
                if (!drag.current?.moved) onSelect(runner.id);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelect(runner.id);
                }
              }}
              style={{ cursor: "pointer" }}
            >
              {runner.you ? (
                <circle
                  className="lane-you-halo"
                  cx={x}
                  cy={yy}
                  r="19"
                />
              ) : null}
              <circle
                className={
                  runner.id === selected
                    ? "lane-dot lane-selected"
                    : runner.you
                      ? "lane-dot lane-you"
                      : "lane-dot"
                }
                cx={x}
                cy={yy}
                r={runner.you ? 13 : 9}
              />
              {runner.you ? (
                <g
                  transform={`translate(${x - 22}, ${yy - 24})`}
                  pointerEvents="none"
                >
                  <AnimatedEmber clip={emberClip} size={44} shadow={false} />
                </g>
              ) : (
                <text
                  className="lane-dot-rank"
                  x={x}
                  y={yy + 3.5}
                  textAnchor="middle"
                  pointerEvents="none"
                >
                  {place}
                </text>
              )}
              <text
                className={runner.you ? "lane-val-label is-you" : "lane-val-label"}
                x={x}
                y={yy - (runner.you ? 22 : 14)}
                textAnchor="middle"
                pointerEvents="none"
              >
                {animKm.toFixed(1)}
              </text>
            </g>
          );
        })}
        {lanes.map((runner, index) => (
          <text
            key={`${runner.id}-label`}
            className={runner.you ? "lane-heading lane-heading-you" : "lane-heading"}
            x={(index + 0.5) * laneWidth}
            y="24"
            textAnchor="middle"
          >
            {runner.you ? "★ YOU" : runner.initials}
          </text>
        ))}
        <text className="lane-unit" x={plotWidth + 8} y="24">
          {unit.toUpperCase()}
        </text>
      </svg>
      <p className="fd-lane-note">
        {window.min.toFixed(1)}–{window.max.toFixed(1)} {unit}. Lanes stay put
        when rank changes.
      </p>
    </div>
  );
}
