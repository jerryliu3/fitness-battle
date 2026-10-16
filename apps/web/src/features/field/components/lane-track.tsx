"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import {
  gapLabel,
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
  const reduced = useReducedMotion();
  const host = useRef<HTMLDivElement>(null);
  const drag = useRef<{ y: number; min: number; moved: boolean } | null>(null);
  const [width, setWidth] = useState(720);
  const [span, setSpan] = useState(6);
  const [pan, setPan] = useState<number | null>(null);
  const [overview, setOverview] = useState(true);
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

  const height = 520;
  const total = valueAt(you, time, extra);
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
        <rect className="lane-ground" width={plotWidth} height={height} />
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
        {startVisible ? (
          <text className="lane-start" x={plotWidth / 2} y={y(0) + 28} textAnchor="middle">
            START
          </text>
        ) : null}
        {showGhost && ghost ? (
          <g>
            <motion.circle
              initial={false}
              animate={{ cx: laneWidth * (lanes.findIndex((runner) => runner.you) + 0.5), cy: Math.max(70, Math.min(height - 36, y(valueAt(ghost, time)))) }}
              transition={{ duration: reduced || drag.current?.moved ? 0 : 0.32 }}
              className="lane-ghost"
              cx={laneWidth * (lanes.findIndex((runner) => runner.you) + 0.5)}
              cy={Math.max(70, Math.min(height - 36, y(valueAt(ghost, time))))}
              r="12"
            />
          </g>
        ) : null}
        {lanes.map((runner, index) => {
          const km = valueAt(runner, time, extra);
          const raw = y(km);
          const yy = Math.max(70, Math.min(height - 36, raw));
          const x = (index + 0.5) * laneWidth;
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
            >
              <motion.circle
                initial={false}
                animate={{ cx: x, cy: yy, r: (runner.you ? 11 : 7) + (runner.id === selected ? 3 : 0) }}
                transition={{ duration: reduced || drag.current?.moved ? 0 : 0.32, ease: [0.22, 1, 0.36, 1] }}
                className={
                  runner.id === selected
                    ? "lane-dot lane-selected"
                    : runner.you
                      ? "lane-dot lane-you"
                      : "lane-dot"
                }
              />
            </g>
          );
        })}
        {lanes.map((runner, index) => (
          <text
            key={`${runner.id}-label`}
            className={runner.you ? "lane-heading lane-heading-you" : "lane-heading"}
            x={(index + 0.5) * laneWidth}
            y="22"
            textAnchor="middle"
          >
            {runner.you ? "YOU" : runner.initials}
          </text>
        ))}
        <text className="lane-unit" x={plotWidth + 8} y="22">
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
