"use client";
import { useEffect, useRef, useState } from "react";
import { ghost } from "../spatial-lab/model";
import {
  distanceFor,
  gapLabel,
  laneRunners,
  trackWindow,
  trackY,
  you,
} from "./model";

export interface SceneProps {
  time: number;
  extraKm: number;
  selected: string;
  showGhost: boolean;
  onSelect: (id: string) => void;
}

export function LaneTrack(props: SceneProps) {
  const host = useRef<HTMLDivElement>(null),
    drag = useRef<{ y: number; min: number; moved: boolean } | null>(null);
  const [width, setWidth] = useState(720),
    [span, setSpan] = useState(6),
    [pan, setPan] = useState<number | null>(null),
    [overview, setOverview] = useState(true);
  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setWidth(Math.max(250, entry.contentRect.width));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const height = 560,
    total = distanceFor(you, props.time, props.extraKm),
    peak = Math.max(...laneRunners.map((r) => r.km[2]), total);
  const window = trackWindow(total, span, pan, overview ? peak : undefined),
    plotWidth = width - 52,
    laneWidth = plotWidth / 9;
  const y = (distance: number) =>
    trackY(distance, window.min, window.max, height);
  const tickStep = overview
    ? Math.max(1, Math.ceil((window.max - window.min) / 6))
    : span === 3
      ? 0.5
      : 1;
  const ticks = Array.from(
    { length: Math.ceil((window.max - window.min) / tickStep) + 1 },
    (_, i) => Math.ceil(window.min / tickStep) * tickStep + i * tickStep,
  ).filter((km) => km <= window.max);
  const startVisible = window.min === 0;
  function nudge(delta: number) {
    setSpan(window.max - window.min);
    setOverview(false);
    setPan(Math.max(0, window.min + delta));
  }
  return (
    <div className="evo-lane-view" ref={host}>
      <div className="evo-track-tools">
        <div>
          <button
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
            aria-pressed={overview}
            onClick={() => {
              setOverview(true);
              setPan(null);
            }}
          >
            Fit field
          </button>
          <button
            onClick={() => {
              setOverview(false);
              setPan(0);
            }}
          >
            Starting line
          </button>
        </div>
        <div>
          <button
            aria-label="Move track window back one kilometer"
            onClick={() => nudge(-1)}
          >
            ↓
          </button>
          <button
            aria-label="Move track window forward one kilometer"
            onClick={() => nudge(1)}
          >
            ↑
          </button>
          <button
            aria-pressed={span === 3}
            onClick={() => {
              setSpan((v) => (v === 6 ? 3 : 6));
              setOverview(false);
            }}
          >
            {span === 3 ? "Zoom out" : "Zoom in"}
          </button>
        </div>
      </div>
      <div className="evo-lane-caption">
        <span>9 stable lanes · Distance ↑</span>
        <span>
          {window.min.toFixed(1)}–{window.max.toFixed(1)} km window
        </span>
      </div>
      <svg
        className="evo-lanes"
        viewBox={`0 0 ${width} ${height}`}
        role="group"
        aria-label="Nine-lane straight running track. Distance determines vertical position, lane number does not represent rank. Drag vertically to explore farther along the track."
        onPointerDown={(e) => {
          if (e.pointerType === "touch") {
            drag.current = null;
            return;
          }
          if (e.button !== 0) return;
          drag.current = { y: e.clientY, min: window.min, moved: false };
        }}
        onPointerMove={(e) => {
          const state = drag.current;
          if (!state || e.buttons !== 1) return;
          const delta = e.clientY - state.y;
          if (Math.abs(delta) > 5) {
            if (!state.moved) e.currentTarget.setPointerCapture(e.pointerId);
            state.moved = true;
            setSpan(window.max - window.min);
            setOverview(false);
            setPan(
              Math.max(
                0,
                state.min +
                  (delta / (height - 132)) * (window.max - window.min),
              ),
            );
          }
        }}
        onPointerUp={() => {
          if (drag.current && !drag.current.moved) drag.current = null;
        }}
        onPointerCancel={() => {
          drag.current = null;
        }}
      >
        <title>Forward movement from the same starting line</title>
        <rect className="lane-ground" width={plotWidth} height={height} />
        {laneRunners.map((r, i) => (
          <rect
            key={r.id}
            className={`lane-strip ${r.you ? "lane-yours" : ""}`}
            x={i * laneWidth}
            y="0"
            width={laneWidth}
            height={height}
          />
        ))}
        {Array.from({ length: 10 }, (_, i) => (
          <line
            key={i}
            className="lane-divider"
            x1={i * laneWidth}
            x2={i * laneWidth}
            y1="0"
            y2={height}
          />
        ))}
        {ticks.map((km) => (
          <g className="lane-distance-rule" key={km}>
            <line x1="0" x2={plotWidth} y1={y(km)} y2={y(km)} />
            <text x={plotWidth + 8} y={y(km) + 4}>
              {km.toFixed(km % 1 === 0 ? 0 : 1)}
            </text>
          </g>
        ))}
        {startVisible && (
          <g className="lane-start">
            <rect x="0" y={y(0) - 8} width={plotWidth} height="16" />
            {Array.from({ length: 18 }, (_, i) => (
              <rect
                key={i}
                x={(i * plotWidth) / 18}
                y={y(0) + (i % 2 === 0 ? -8 : 0)}
                width={plotWidth / 18}
                height="8"
              />
            ))}
            <text x={plotWidth / 2} y={y(0) + 37} textAnchor="middle">
              START / MONDAY 00:00 UTC
            </text>
          </g>
        )}
        {props.showGhost &&
          (() => {
            const km = distanceFor(ghost, props.time),
              yy = Math.max(73, Math.min(height - 36, y(km)));
            return (
              <g className="lane-ghost">
                <circle cx={laneWidth * 4.5} cy={yy} r="13" />
                <text x={laneWidth * 4.5} y={yy + 4} textAnchor="middle">
                  P
                </text>
              </g>
            );
          })()}
        {laneRunners.map((r, i) => {
          const km = distanceFor(r, props.time, props.extraKm),
            raw = y(km),
            yy = Math.max(73, Math.min(height - 36, raw)),
            outside = raw !== yy,
            x = (i + 0.5) * laneWidth;
          return (
            <g
              key={r.id}
              className={`lane-runner ${r.you ? "lane-you" : ""} ${r.id === props.selected ? "lane-selected" : ""}`}
              role="button"
              tabIndex={0}
              aria-label={`${r.name}, ${km.toFixed(1)} km, ${gapLabel(r, props.time, props.extraKm)}. Select runner.`}
              onClick={() => {
                if (!drag.current?.moved) props.onSelect(r.id);
                drag.current = null;
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  props.onSelect(r.id);
                }
              }}
            >
              <rect
                className="lane-hit"
                x={i * laneWidth}
                y={yy - 24}
                width={laneWidth}
                height="48"
              />
              {outside ? (
                <path
                  className="lane-offscreen"
                  d={
                    raw < 73
                      ? `M${x - 6},${yy + 4} ${x},${yy - 4} ${x + 6},${yy + 4}`
                      : `M${x - 6},${yy - 4} ${x},${yy + 4} ${x + 6},${yy - 4}`
                  }
                />
              ) : (
                <>
                  <circle
                    className="lane-dot-ring"
                    cx={x}
                    cy={yy}
                    r={r.you ? 15 : 11}
                  />
                  <circle
                    className="lane-dot"
                    cx={x}
                    cy={yy}
                    r={r.you ? 8 : 6}
                  />
                </>
              )}
            </g>
          );
        })}
        <rect className="lane-header-ground" width={plotWidth} height="55" />
        {laneRunners.map((r, i) => (
          <g
            className={r.you ? "lane-your-heading" : "lane-heading"}
            key={r.id}
          >
            <text x={(i + 0.5) * laneWidth} y="24" textAnchor="middle">
              {r.you ? "YOU" : r.initials}
            </text>
            <text
              className="lane-heading-total"
              x={(i + 0.5) * laneWidth}
              y="43"
              textAnchor="middle"
            >
              {distanceFor(r, props.time, props.extraKm).toFixed(1)}
            </text>
          </g>
        ))}
        <text className="lane-axis-unit" x={plotWidth + 8} y="25">
          KM
        </text>
      </svg>
      <div className="evo-track-footnote">
        <span>
          {startVisible
            ? "Every lane starts at zero."
            : `${total.toFixed(1)} km from the starting line.`}
        </span>
        <span>↑ Track continues · No finish cap</span>
      </div>
      <p className="evo-visual-note">
        {overview
          ? "The whole recorded field shares one distance scale. Rewind to see every dot move from the starting line."
          : pan === null
            ? "The camera follows you; distance markers move underneath. Use the arrows to explore, or drag with a mouse."
            : "Viewing another part of the track. Offscreen chevrons point to runners beyond this window."}
      </p>
    </div>
  );
}
