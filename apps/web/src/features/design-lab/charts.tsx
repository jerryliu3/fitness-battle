import { useEffect, useRef, useState } from "react";
import {
  athletes,
  previousWeek,
  type Athlete,
  type Checkpoint,
  type Comparison,
} from "./data";

export function Bo({ mood = "happy" }: { mood?: "happy" | "calm" }) {
  return (
    <svg
      className="bo-character"
      viewBox="0 0 240 240"
      role="img"
      aria-label="Bo, Bounce's original movement character"
    >
      <path
        className="bo-shadow"
        d="M42 209c0-9 35-16 78-16s78 7 78 16-35 16-78 16-78-7-78-16Z"
      />
      <path
        className="bo-body"
        d="M52 73C64 32 117 15 146 40c40-7 69 24 62 62 28 35 9 83-30 91-13 25-48 27-71 10-48 9-91-28-80-67C13 111 27 85 52 73Z"
      />
      <path className="bo-hand" d="M44 141 16 126M195 133l28-22" />
      <ellipse className="bo-eye" cx="98" cy="104" rx="8" ry="14" />
      <ellipse className="bo-eye" cx="151" cy="96" rx="8" ry="14" />
      <path
        className="bo-smile"
        d={mood === "happy" ? "M104 139q25 28 46-8" : "M113 141q16 10 29-3"}
      />
      <path className="bo-cheek" d="M74 125h12m81-10h12" />
    </svg>
  );
}

export function RaceTrack({
  comparison,
  checkpoint,
  onSelect,
}: {
  comparison: Comparison;
  checkpoint: Checkpoint;
  onSelect: (athlete: Athlete) => void;
}) {
  const lanes = comparison === "self" ? [athletes[3]!] : athletes.slice(2, 5);
  return (
    <div
      className="race-track"
      aria-label="Score tracks from zero to 140 effort points. These are accumulated points, not distance or live location."
    >
      <div className="track-ruler">
        <span>0</span>
        <span>70</span>
        <span>140 pts</span>
      </div>
      {comparison === "self" && (
        <div className="track-lane ghost">
          <div className="lane-label">
            <span>Last week</span>
            <strong>
              {previousWeek[checkpoint]} <small>pts</small>
            </strong>
          </div>
          <div className="lane-road">
            <div
              className="lane-progress"
              style={{ width: `${(previousWeek[checkpoint] / 140) * 100}%` }}
            />
            <span
              className="runner-marker ghost-marker"
              style={{ left: `${(previousWeek[checkpoint] / 140) * 100}%` }}
            >
              PW
            </span>
          </div>
        </div>
      )}
      {lanes.map((p) => (
        <button
          key={p.id}
          className={`track-lane ${p.you ? "your-lane" : ""}`}
          onClick={() => onSelect(p)}
          aria-label={`${p.name}, ${p.checkpoints[checkpoint]} effort points, open details`}
        >
          <span className="lane-label">
            <span>{p.you ? "Your week" : p.name}</span>
            <strong>
              {p.checkpoints[checkpoint]} <small>pts</small>
            </strong>
          </span>
          <span className="lane-road">
            <span
              className="lane-progress"
              style={{ width: `${(p.checkpoints[checkpoint] / 140) * 100}%` }}
            />
            <span
              className="runner-marker"
              style={{ left: `${(p.checkpoints[checkpoint] / 140) * 100}%` }}
            >
              {p.initials}
            </span>
          </span>
        </button>
      ))}
      <div className="finish-label">
        <span>Accumulated weekly effort</span>
        <span>Same day cutoff</span>
      </div>
    </div>
  );
}

export function CohortPlot({
  selected,
  nearby,
  onSelect,
}: {
  selected: string;
  nearby: boolean;
  onSelect: (athlete: Athlete) => void;
}) {
  const plot = useRef<SVGSVGElement>(null);
  const [width, setWidth] = useState(540);
  useEffect(() => {
    const element = plot.current;
    if (!element) return;
    const observer = new ResizeObserver((entries) => {
      const size = entries[0]?.contentRect.width;
      if (size) setWidth(Math.max(240, size));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const rows = nearby ? athletes.slice(2, 5) : athletes;
  const x = (p: number) => 58 + (p / 140) * (width - 96);
  const y = (n: number) => 310 - (n / 5) * 252;
  return (
    <svg
      ref={plot}
      className="cohort-plot"
      viewBox={`0 0 ${width} 368`}
      onClick={(event) => {
        const element = plot.current;
        const transform = element?.getScreenCTM();
        if (!element || !transform) return;
        const cursor = element.createSVGPoint();
        cursor.x = event.clientX;
        cursor.y = event.clientY;
        const position = cursor.matrixTransform(transform.inverse());
        const distance = (p: Athlete) =>
          (x(p.points) - position.x) ** 2 + (y(p.activities) - position.y) ** 2;
        const closest = [...rows].sort((a, b) => distance(a) - distance(b))[0];
        if (closest && distance(closest) < 900) onSelect(closest);
      }}
      role="group"
      aria-label="Comparison plot. X: weekly effort points. Y: counted activities. You: 96 points, three activities. Vertical position is not rank."
    >
      <title>Weekly effort and counted activities</title>
      {[0, 35, 70, 105, 140].map((n) => (
        <g key={n}>
          <line className="plot-grid" x1={x(n)} x2={x(n)} y1="36" y2="310" />
          <text x={x(n)} y="333" textAnchor="middle">
            {n}
          </text>
        </g>
      ))}
      {[0, 1, 2, 3, 4, 5].map((n) => (
        <g key={n}>
          <line
            className="plot-grid"
            x1="58"
            x2={width - 38}
            y1={y(n)}
            y2={y(n)}
          />
          <text x="43" y={y(n) + 4} textAnchor="end">
            {n}
          </text>
        </g>
      ))}
      <text className="plot-axis" x="58" y="20">
        Counted activities
      </text>
      <text className="plot-axis" x={width - 38} y="357" textAnchor="end">
        Weekly effort points →
      </text>
      <line className="plot-guide" x1={x(96)} x2={x(96)} y1="36" y2="310" />
      {rows.map((p) => (
        <g
          key={p.id}
          className={`plot-point ${p.you ? "is-you" : ""} ${selected === p.id ? "is-active" : ""}`}
          role="button"
          tabIndex={0}
          aria-label={`${p.name}, ${p.points} effort points and ${p.activities} activities. Select comparison.`}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onSelect(p);
            }
          }}
        >
          <circle
            className="point-target"
            cx={x(p.points)}
            cy={y(p.activities)}
            r="16"
          />
          <circle
            className="point-halo"
            cx={x(p.points)}
            cy={y(p.activities)}
            r={p.you ? "12" : "7"}
          />
          <circle
            className="point-core"
            cx={x(p.points)}
            cy={y(p.activities)}
            r={p.you ? "5" : "3"}
          />
          {selected === p.id && (
            <text
              className="point-label"
              x={x(p.points)}
              y={y(p.activities) - 22}
              textAnchor="middle"
            >
              {p.you ? "YOU" : p.name.split(" ")[0]}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}

export function WeekTrail({ onOpen }: { onOpen: (id: string) => void }) {
  return (
    <div
      className="week-trail"
      aria-label="Three completed imports, not scheduled workout tasks."
    >
      <svg className="trail-line" viewBox="0 0 340 388" aria-hidden="true">
        <path d="M107 54C290 45 313 103 242 151S39 190 87 255s169 58 173 112" />
      </svg>
      <button className="trail-node trail-first" onClick={() => onOpen("easy")}>
        <span className="node-token">30</span>
        <span className="node-caption">
          Monday<small>Easy miles · counted</small>
        </span>
      </button>
      <button
        className="trail-node trail-second"
        onClick={() => onOpen("park")}
      >
        <span className="node-token">65</span>
        <span className="node-caption">
          Tuesday<small>Park loop · counted</small>
        </span>
      </button>
      <button
        className="trail-node trail-third"
        onClick={() => onOpen("morning")}
      >
        <span className="node-token">96</span>
        <span className="node-caption">
          Thursday<small>Morning run · counted</small>
        </span>
      </button>
      <span className="trail-end">Your week keeps its shape.</span>
    </div>
  );
}
