"use client";

import { useEffect, useRef, useState } from "react";
import {
  distanceAt,
  distancePosition,
  formatDistance,
  formatGap,
  ghost,
  referenceKm,
  runners,
  type DistanceUnit,
  type Runner,
} from "./model";

function useWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(800);
  useEffect(() => {
    if (!ref.current) return;
    const observer = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w) setWidth(Math.max(240, w));
    });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  return { ref, width };
}
interface FlatProps {
  time: number;
  extraKm: number;
  unit: DistanceUnit;
  selected: string;
  showGhost: boolean;
  onSelect: (id: string) => void;
}

export function DistancePath(props: FlatProps) {
  const { ref, width } = useWidth();
  const [zoom, setZoom] = useState(false),
    [offset, setOffset] = useState(0),
    [vertical, setVertical] = useState(false);
  const you = distanceAt(runners[3]!, props.time, props.extraKm);
  const min = zoom ? Math.min(20, Math.max(0, you + offset - 5)) : 0,
    max = zoom ? min + 10 : referenceKm;
  const x = (km: number) => 48 + distancePosition(km, min, max, width - 96);
  const y = (km: number) => 370 - distancePosition(km, min, max, 320);
  const all = [...runners, ...(props.showGhost ? [ghost] : [])];
  const visible = all.filter((r) => {
    const d = distanceAt(r, props.time, props.extraKm);
    return d >= min && d <= max;
  });
  const labelIds = new Set([
    "you",
    props.selected,
    "maya",
    "leo",
    ...(props.showGhost ? ["ghost"] : []),
  ]);
  const labeled = visible.filter((r) => labelIds.has(r.id));
  return (
    <div className="flat-view" ref={ref}>
      <div className="path-tools">
        <button
          aria-pressed={zoom}
          onClick={() => {
            setZoom((v) => !v);
            setOffset(0);
          }}
        >
          {zoom ? "Full distance" : "Zoom around me"}
        </button>
        <button aria-pressed={vertical} onClick={() => setVertical((v) => !v)}>
          {vertical ? "Horizontal path" : "Bird’s-eye path"}
        </button>
        {zoom && (
          <div className="pan-controls">
            <button
              aria-label="Pan distance window backward"
              onClick={() => setOffset((v) => v - 2)}
            >
              ←
            </button>
            <button
              aria-label="Pan distance window forward"
              onClick={() => setOffset((v) => v + 2)}
            >
              →
            </button>
          </div>
        )}
      </div>
      <svg
        className={`distance-path ${vertical ? "vertical-path" : ""}`}
        viewBox={`0 0 ${width} 432`}
        role="group"
        aria-label="Proportional weekly-distance path. Gaps use kilometers, not equal rank spacing."
      >
        <title>Actual weekly mileage determines every position</title>
        {vertical ? (
          <>
            <line
              className="path-road"
              x1={width * 0.43}
              x2={width * 0.43}
              y1="50"
              y2="370"
            />
            {[0, 1, 2, 3, 4, 5, 6].map((i) => {
              const km = min + ((max - min) * i) / 6;
              return (
                <g key={i}>
                  <line
                    className="path-tick"
                    x1={width * 0.43 - 7}
                    x2={width * 0.43 + 7}
                    y1={y(km)}
                    y2={y(km)}
                  />
                  <text x="13" y={y(km) + 4}>
                    {formatDistance(km, props.unit)} {props.unit}
                  </text>
                </g>
              );
            })}
          </>
        ) : (
          <>
            <line
              className="path-road"
              x1="48"
              x2={width - 48}
              y1="250"
              y2="250"
            />
            {[0, 1, 2, 3, 4, 5, 6].map((i) => {
              const km = min + ((max - min) * i) / 6;
              return (
                <g key={i}>
                  <line
                    className="path-tick"
                    x1={x(km)}
                    x2={x(km)}
                    y1="242"
                    y2="260"
                  />
                  <text x={x(km)} y="407" textAnchor="middle">
                    {formatDistance(km, props.unit, 0)}
                  </text>
                </g>
              );
            })}
            <text x={width - 48} y="426" textAnchor="end">
              Weekly distance ({props.unit}) →
            </text>
          </>
        )}
        {visible.map((person) => {
          const total = distanceAt(person, props.time, props.extraKm);
          return (
            <g
              key={person.id}
              className={`distance-mark ${person.you ? "mark-you" : ""} ${props.selected === person.id ? "mark-selected" : ""} ${person.ghost ? "mark-ghost" : ""}`}
              role="button"
              tabIndex={0}
              aria-label={`${person.name}, ${formatDistance(total, props.unit)} ${props.unit}, ${formatGap(person, props.time, props.extraKm, props.unit)}. Select.`}
              onClick={() => props.onSelect(person.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  props.onSelect(person.id);
                }
              }}
            >
              <circle
                className="mark-hit"
                cx={vertical ? width * 0.43 : x(total)}
                cy={vertical ? y(total) : 250}
                r="15"
              />
              <circle
                className="mark-dot"
                cx={vertical ? width * 0.43 : x(total)}
                cy={vertical ? y(total) : 250}
                r={person.you ? 8 : 5}
              />
            </g>
          );
        })}
        {labeled.map((person, i) => {
          const total = distanceAt(person, props.time, props.extraKm),
            anchor = vertical ? y(total) : x(total),
            labelX = vertical
              ? width * 0.43 + 25
              : Math.max(70, Math.min(width - 70, x(total))),
            labelY = vertical ? 54 + i * 73 : [65, 132, 205, 327, 365][i]!;
          return (
            <g
              key={person.id}
              className={`path-label ${person.you ? "mark-you" : ""} ${person.ghost ? "mark-ghost" : ""}`}
              role="button"
              tabIndex={0}
              aria-label={`${person.name} distance detail`}
              onClick={() => props.onSelect(person.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  props.onSelect(person.id);
                }
              }}
            >
              <line
                className="path-connector"
                x1={vertical ? width * 0.43 : anchor}
                x2={labelX}
                y1={vertical ? anchor : 250}
                y2={labelY + 8}
              />
              <text
                className="path-person-name"
                x={labelX}
                y={labelY}
                textAnchor={vertical ? "start" : "middle"}
              >
                {person.you ? "YOU" : person.name.split(" ")[0]}
              </text>
              <text
                x={labelX}
                y={labelY + 19}
                textAnchor={vertical ? "start" : "middle"}
              >
                {formatDistance(total, props.unit)} {props.unit}
              </text>
              <text
                className="path-gap"
                x={labelX}
                y={labelY + 37}
                textAnchor={vertical ? "start" : "middle"}
              >
                {person.you
                  ? "Your week"
                  : formatGap(person, props.time, props.extraKm, props.unit)}
              </text>
            </g>
          );
        })}
      </svg>
      <p className="view-explanation">
        {zoom
          ? `${visible.length} of ${all.length} markers in this ${formatDistance(max - min, props.unit)} ${props.unit} window.`
          : "Markers share one calibrated distance axis. Label lanes only prevent overlap."}
      </p>
    </div>
  );
}

export function ReplayLanes(props: FlatProps) {
  const { ref, width } = useWidth();
  const field = [
    runners[1]!,
    runners[2]!,
    runners[3]!,
    runners[4]!,
    ...(props.showGhost ? [ghost] : []),
  ];
  const x = (km: number) =>
    48 + distancePosition(km, 0, referenceKm, width - 100);
  return (
    <div ref={ref} className="replay-view">
      <svg
        className="replay-lanes"
        viewBox={`0 0 ${width} ${field.length * 98 + 65}`}
        role="group"
        aria-label="Bird's-eye replay of cumulative weekly distance. Movement between Monday, Tuesday, and Thursday is interpolation, not live position."
      >
        <title>How imported activity changes the field</title>
        {field.map((person, i) => {
          const total = distanceAt(person, props.time, props.extraKm),
            row = 54 + i * 98;
          return (
            <g
              key={person.id}
              className={`replay-runner ${person.you ? "mark-you" : ""} ${person.ghost ? "mark-ghost" : ""} ${props.selected === person.id ? "mark-selected" : ""}`}
              role="button"
              tabIndex={0}
              aria-label={`${person.name}, ${formatDistance(total, props.unit)} ${props.unit}. Select replay runner.`}
              onClick={() => props.onSelect(person.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  props.onSelect(person.id);
                }
              }}
            >
              <text className="replay-name" x="24" y={row - 19}>
                {person.you
                  ? "YOUR WEEK"
                  : person.ghost
                    ? "PAST YOU"
                    : person.name}
              </text>
              <text x={width - 24} y={row - 19} textAnchor="end">
                {formatDistance(total, props.unit)} {props.unit}
              </text>
              <line
                className="replay-road"
                x1="48"
                x2={width - 52}
                y1={row + 17}
                y2={row + 17}
              />
              <line
                className="replay-progress"
                x1="48"
                x2={x(total)}
                y1={row + 17}
                y2={row + 17}
              />
              <circle
                className="replay-marker"
                cx={x(total)}
                cy={row + 17}
                r="17"
              />
              <text
                className="replay-initials"
                x={x(total)}
                y={row + 21}
                textAnchor="middle"
              >
                {person.initials}
              </text>
            </g>
          );
        })}
        {[0, 5, 10, 15, 20, 25, 30].map((km) => (
          <text
            key={km}
            x={x(km)}
            y={field.length * 98 + 47}
            textAnchor="middle"
          >
            {formatDistance(km, props.unit, 0)}
          </text>
        ))}
        <text x={width - 30} y={field.length * 98 + 65} textAnchor="end">
          Weekly distance ({props.unit}) →
        </text>
      </svg>
      <p className="view-explanation">
        Bird’s-eye lanes use actual distance. Lane separation identifies people;
        it does not encode rank.
      </p>
    </div>
  );
}
