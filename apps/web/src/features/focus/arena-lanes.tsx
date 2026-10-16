"use client";
import { useRef, useEffect } from "react";
import {
  arenaPosition,
  arenaWindow,
  orderedArenaLanes,
  type ArenaSceneLane,
  type ArenaViewWindow,
} from "@fitness-battle/shared";
export function ArenaLanes({
  lanes,
  view,
  unit,
  selected,
  onSelect,
  onPan,
}: {
  lanes: ArenaSceneLane[];
  view: ArenaViewWindow;
  unit: string;
  selected: string;
  onSelect: (id: string) => void;
  onPan: (center: number) => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const drag = useRef<{
    y: number;
    center: number;
    moved: boolean;
    id: string | null;
  } | null>(null);
  const ordered = orderedArenaLanes(lanes);
  const ghost = lanes.find((l) => l.ghost);
  const bounds = arenaWindow(view.center, view.span);
  const width = Math.max(360, ordered.length * 64 + 44),
    height = 530,
    laneWidth = (width - 44) / Math.max(1, ordered.length);
  const y = (v: number) => 64 + arenaPosition(v, view).fraction * 390;
  useEffect(() => {
    const el = host.current;
    if (el) el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2;
  }, [lanes.length]);
  return (
    <div className="focus-lane-scroll" ref={host}>
      <svg
        className="focus-lane-track"
        viewBox={`0 0 ${width} ${height}`}
        style={{ minWidth: width }}
        role="group"
        aria-label={`Vertical athlete lanes, ${bounds.min.toFixed(1)} to ${bounds.max.toFixed(1)} ${unit}. Drag to explore.`}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "ArrowUp" || e.key === "ArrowDown") {
            e.preventDefault();
            onPan(
              view.center + ((e.key === "ArrowUp" ? 1 : -1) * view.span) / 4,
            );
          }
        }}
        onPointerDown={(e) => {
          drag.current = {
            y: e.clientY,
            center: view.center,
            moved: false,
            id:
              (e.target as Element)
                .closest("[data-athlete]")
                ?.getAttribute("data-athlete") ?? null,
          };
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (!drag.current) return;
          const delta = e.clientY - drag.current.y;
          if (Math.abs(delta) > 5) {
            drag.current.moved = true;
            onPan(drag.current.center + (delta / 390) * view.span);
          }
        }}
        onPointerUp={(e) => {
          const press = drag.current;
          drag.current = null;
          if (press && !press.moved && press.id) onSelect(press.id);
        }}
        onPointerCancel={() => {
          drag.current = null;
        }}
      >
        <defs>
          <linearGradient id="focus-road" x2="0" y2="1">
            <stop stopColor="#f2f5ee" />
            <stop offset="1" stopColor="#e8eee2" />
          </linearGradient>
        </defs>
        <rect width={width} height={height} rx="20" fill="url(#focus-road)" />
        {ordered.map((l, i) => (
          <g key={l.id}>
            <rect
              x={i * laneWidth}
              y="48"
              width={laneWidth}
              height="440"
              fill={l.you ? "#d4ee8950" : "transparent"}
            />
            <line
              x1={i * laneWidth}
              x2={i * laneWidth}
              y1="48"
              y2="488"
              stroke="#d3ddcb"
              strokeDasharray="5 8"
            />
            <text
              x={(i + 0.5) * laneWidth}
              y="29"
              textAnchor="middle"
              className={l.you ? "lane-title is-you" : "lane-title"}
            >
              {l.you ? "YOU" : l.initials}
            </text>
          </g>
        ))}
        {Array.from({ length: 7 }, (_, i) => bounds.min + (bounds.span * i) / 6)
          .filter((v) => v >= 0)
          .map((v) => (
            <g key={v}>
              <line
                x1="0"
                x2={width - 44}
                y1={y(v)}
                y2={y(v)}
                stroke="#cbd6c3"
                strokeDasharray="2 6"
              />
              <text x={width - 37} y={y(v) + 4} className="lane-distance">
                {v.toFixed(view.span < 6 ? 1 : 0)}
              </text>
            </g>
          ))}
        {bounds.min <= 0 && bounds.max >= 0 && (
          <text x="8" y={y(0) - 10} className="lane-distance">
            START
          </text>
        )}
        {ordered.map((l, i) => {
          const position = arenaPosition(l.value, view),
            yy = y(l.value),
            xx = (i + 0.5) * laneWidth;
          return (
            <g
              key={l.id}
              data-athlete={l.id}
              role="button"
              tabIndex={0}
              aria-label={`${l.name}, ${l.value.toFixed(1)} ${unit}${position.edge ? `, ${position.edge} of visible range` : ""}`}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  e.stopPropagation();
                  onSelect(l.id);
                }
              }}
            >
              <circle cx={xx} cy={yy + 3} r="21" fill="#26382d15" />
              <circle
                cx={xx}
                cy={yy}
                r={l.you ? 22 : 18}
                fill={
                  l.you ? "#26382d" : selected === l.id ? "#d4ee89" : "#ffffff"
                }
                stroke={l.you ? "#d4ee89" : "#d3ddcb"}
                strokeWidth={l.you ? 4 : 1.5}
              />
              <text
                x={xx}
                y={yy + 4}
                textAnchor="middle"
                className="lane-initial"
                fill={l.you ? "#f7fbef" : "#26382d"}
              >
                {position.edge
                  ? position.edge === "ahead"
                    ? "↑"
                    : "↓"
                  : l.initials}
              </text>
              <text
                x={xx}
                y={yy + 36}
                textAnchor="middle"
                className="lane-total"
              >
                {l.value.toFixed(1)}
              </text>
            </g>
          );
        })}
        {ghost &&
          (() => {
            const i = ordered.findIndex((l) => l.you);
            return (
              <g
                role="button"
                tabIndex={0}
                data-athlete={ghost.id}
                aria-label={`Past you, ${ghost.value.toFixed(1)} ${unit}, not ranked`}
                onKeyDown={(e) => {
                  if (e.key === "Enter") onSelect(ghost.id);
                }}
              >
                <circle
                  cx={(i + 0.5) * laneWidth + 17}
                  cy={y(ghost.value)}
                  r="12"
                  fill="#ffffffb0"
                  stroke="#768172"
                  strokeDasharray="3 3"
                />
                <text
                  x={(i + 0.5) * laneWidth + 17}
                  y={y(ghost.value) + 4}
                  textAnchor="middle"
                  className="lane-distance"
                >
                  ◌
                </text>
              </g>
            );
          })()}
        <text x={width - 37} y="29" className="lane-distance">
          {unit}
        </text>
        <text x="16" y="513" className="lane-distance">
          Drag ↕ to explore · lanes stay with each athlete
        </text>
      </svg>
    </div>
  );
}
