"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  distanceAt,
  formatGapLabel,
  formatKm,
  type FieldRunner,
} from "../model";

function position(km: number, min: number, max: number, span: number): number {
  if (max <= min) return 0;
  return ((km - min) / (max - min)) * span;
}

export function DistancePath({
  runners,
  you,
  referenceKm,
  checkpoint,
  selectedId,
  unitLabel,
  onSelect,
}: {
  runners: FieldRunner[];
  you: FieldRunner;
  referenceKm: number;
  checkpoint: number;
  selectedId: string;
  unitLabel: string;
  onSelect: (id: string) => void;
}) {
  const host = useRef<SVGSVGElement>(null);
  const [width, setWidth] = useState(360);
  const [zoom, setZoom] = useState(true);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const element = host.current;
    if (!element) return;
    const observer = new ResizeObserver((entries) => {
      const next = entries[0]?.contentRect.width;
      if (next) setWidth(Math.max(280, next));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const youKm = distanceAt(you, checkpoint);
  const windowKm = Math.min(10, referenceKm);
  const min = zoom
    ? Math.min(
        Math.max(0, referenceKm - windowKm),
        Math.max(0, youKm + offset - windowKm / 2),
      )
    : 0;
  const max = zoom ? min + windowKm : referenceKm;

  const marks = useMemo(
    () =>
      runners.map((runner) => ({
        runner,
        km: distanceAt(runner, checkpoint),
      })),
    [runners, checkpoint],
  );

  const roadX = width * 0.42;
  const y = (km: number) => 380 - position(km, min, max, 330);

  return (
    <div className="fd-path">
      <div className="fd-path-tools">
        <button
          type="button"
          aria-pressed={zoom}
          onClick={() => {
            setZoom((value) => !value);
            setOffset(0);
          }}
        >
          {zoom ? "Full distance" : "Zoom around me"}
        </button>
        {zoom ? (
          <label className="fd-path-pan">
            Pan
            <input
              type="range"
              min={-8}
              max={8}
              step={0.2}
              value={offset}
              aria-label="Pan distance window"
              onChange={(event) => setOffset(Number(event.target.value))}
            />
          </label>
        ) : null}
      </div>
      <svg
        ref={host}
        className="fd-path-svg vertical-path"
        viewBox={`0 0 ${width} 420`}
        role="img"
        aria-label="Bird's-eye vertical distance path. Positions use weekly distance, not equally spaced ranks."
      >
        <rect
          x={roadX - 18}
          y={40}
          width={36}
          height={350}
          rx={18}
          className="fd-path-road"
        />
        <line
          x1={roadX}
          y1={50}
          x2={roadX}
          y2={380}
          className="fd-path-axis"
        />
        {[min, (min + max) / 2, max].map((tick, index) => (
          <g key={`tick-${index}-${tick}`}>
            <line
              x1={roadX - 22}
              x2={roadX + 22}
              y1={y(tick)}
              y2={y(tick)}
              className="fd-path-tick"
            />
            <text x={roadX - 30} y={y(tick) + 4} className="fd-path-tick-label">
              {formatKm(tick)}
            </text>
          </g>
        ))}
        {marks.map(({ runner, km }) => {
          const cy = y(km);
          const selected = runner.id === selectedId;
          const labelSide = runner.you || selected ? 1 : runner.place % 2 === 0 ? 1 : -1;
          const labelX = roadX + labelSide * 48;
          return (
            <g key={runner.id}>
              <circle
                cx={roadX}
                cy={cy}
                r={selected || runner.you ? 9 : 7}
                className={[
                  "fd-path-dot",
                  runner.you ? "you" : "",
                  selected ? "selected" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => onSelect(runner.id)}
                style={{ cursor: "pointer" }}
              />
              {(runner.you || selected || Math.abs(km - youKm) < 3) && (
                <>
                  <line
                    x1={roadX + (labelSide > 0 ? 10 : -10)}
                    y1={cy}
                    x2={labelX - (labelSide > 0 ? 4 : -4)}
                    y2={cy}
                    className="fd-path-connector"
                  />
                  <text
                    x={labelX}
                    y={cy - 4}
                    textAnchor={labelSide > 0 ? "start" : "end"}
                    className={`fd-path-label${runner.you ? " you" : ""}`}
                  >
                    {runner.you ? "You" : runner.name}
                  </text>
                  <text
                    x={labelX}
                    y={cy + 12}
                    textAnchor={labelSide > 0 ? "start" : "end"}
                    className="fd-path-sub"
                  >
                    {formatKm(km)} {unitLabel}
                    {!runner.you
                      ? ` · ${formatGapLabel(runner, you, checkpoint, unitLabel)}`
                      : ""}
                  </text>
                </>
              )}
            </g>
          );
        })}
      </svg>
      <p className="fd-note">
        Bird’s-eye path · weekly {unitLabel} spacing · not live location
      </p>
    </div>
  );
}
