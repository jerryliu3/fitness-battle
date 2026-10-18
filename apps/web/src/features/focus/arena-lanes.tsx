"use client";
import { useRef, useEffect } from "react";
import {
  arenaPosition,
  formatActivityAge,
  arenaWindow,
  clampArenaLaneCenter,
  orderedArenaLanes,
  selfLaneLabel,
  type ArenaOvertakeFrame,
  type ArenaOvertakePlan,
  type ArenaSceneLane,
  type ArenaViewWindow,
} from "@fitness-battle/shared";
import { Ember } from "@/components/mascot/ember";
export function ArenaLanes({
  lanes,
  view,
  unit,
  selected,
  onSelect,
  onPan,
  overtakeFrame = null,
  overtakePlan = null,
}: {
  lanes: ArenaSceneLane[];
  view: ArenaViewWindow;
  unit: string;
  selected: string;
  onSelect: (id: string) => void;
  onPan: (center: number) => void;
  overtakeFrame?: ArenaOvertakeFrame | null;
  overtakePlan?: ArenaOvertakePlan | null;
}) {
  const host = useRef<HTMLDivElement>(null);
  const drag = useRef<{
    y: number;
    center: number;
    moved: boolean;
    id: string | null;
  } | null>(null);
  const animating = Boolean(overtakeFrame && overtakeFrame.phase !== "done");
  const liveLanes =
    animating && overtakeFrame
      ? lanes.map((l) => ({
          ...l,
          value: overtakeFrame.laneValues[l.id] ?? l.value,
        }))
      : lanes;
  const ordered = orderedArenaLanes(liveLanes);
  const ghost = liveLanes.find((l) => l.ghost);
  const effectiveCenter = clampArenaLaneCenter(view.center, view.span);
  const effectiveView: ArenaViewWindow =
    effectiveCenter === view.center
      ? view
      : { center: effectiveCenter, span: view.span };
  const bounds = arenaWindow(effectiveView.center, effectiveView.span);
  const width = Math.max(360, ordered.length * 72 + 52),
    height = 540,
    laneWidth = (width - 52) / Math.max(1, ordered.length);
  const y = (v: number) => 72 + arenaPosition(v, effectiveView).fraction * 400;
  const maxTailY = Math.min(
    482,
    bounds.min <= 0 && bounds.max >= 0 ? y(0) + 4 : 482,
  );

  const sortedByValue = [...ordered].sort((a, b) => b.value - a.value);
  const topRunner = sortedByValue[0];
  const firstPlaceId =
    topRunner &&
    topRunner.value > 0 &&
    (sortedByValue.length === 1 || topRunner.value > sortedByValue[1].value)
      ? topRunner.id
      : null;

  function formatLastUpdated(lane: ArenaSceneLane): string {
    return lane.you && lane.value === 0
      ? "joined"
      : formatActivityAge(lane.lastUpdated);
  }

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
              clampArenaLaneCenter(
                effectiveView.center +
                  ((e.key === "ArrowUp" ? 1 : -1) * effectiveView.span) / 4,
                effectiveView.span,
              ),
            );
          }
        }}
        onPointerDown={(e) => {
          if (e.pointerType === "touch" || e.pointerType === "pen") {
            e.preventDefault();
          }
          drag.current = {
            y: e.clientY,
            center: effectiveView.center,
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
            onPan(
              clampArenaLaneCenter(
                drag.current.center + (delta / 400) * effectiveView.span,
                effectiveView.span,
              ),
            );
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
            <stop stopColor="#f7faf3" />
            <stop offset="0.45" stopColor="#eef3e8" />
            <stop offset="1" stopColor="#e4ecdc" />
          </linearGradient>
          <linearGradient id="focus-you-lane" x2="0" y2="1">
            <stop stopColor="#f1c75b66" />
            <stop offset="1" stopColor="#f1c75b20" />
          </linearGradient>
          <radialGradient id="focus-you-glow" cx="50%" cy="50%" r="50%">
            <stop stopColor="#f1c75b" stopOpacity="0.55" />
            <stop offset="1" stopColor="#f1c75b" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="focus-afterburn-wake" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#f1c75b" stopOpacity="0.65" />
            <stop offset="0.45" stopColor="#f1c75b" stopOpacity="0.28" />
            <stop offset="1" stopColor="#f1c75b" stopOpacity="0" />
          </linearGradient>
          <filter id="focus-soft" x="-40%" y="-40%" width="180%" height="180%">
            <feDropShadow
              dx="0"
              dy="3"
              stdDeviation="3"
              floodColor="#282f2c"
              floodOpacity="0.18"
            />
          </filter>
        </defs>
        <rect width={width} height={height} rx="24" fill="url(#focus-road)" />
        <rect
          x="10"
          y="56"
          width={width - 62}
          height="430"
          rx="18"
          fill="#ffffff55"
          stroke="#d7e0cf"
        />
        {ordered.map((l, i) => (
          <g key={l.id}>
            {l.you && (
              <rect
                x={i * laneWidth + 10}
                y="56"
                width={laneWidth}
                height="430"
                fill="url(#focus-you-lane)"
                rx="14"
              />
            )}
            <line
              x1={i * laneWidth + 10}
              x2={i * laneWidth + 10}
              y1="64"
              y2="476"
              stroke={l.you ? "#b7c9a4" : "#d3ddcb"}
              strokeWidth={l.you ? 1.5 : 1}
              strokeDasharray={l.you ? "0" : "5 9"}
            />
            <text
              x={(i + 0.5) * laneWidth + 10}
              y="36"
              textAnchor="middle"
              className={l.you ? "lane-title is-you" : "lane-title"}
            >
              {l.you ? selfLaneLabel(l.name, "caps") : l.initials}
            </text>
          </g>
        ))}
        {Array.from({ length: 7 }, (_, i) => bounds.min + (bounds.span * i) / 6)
          .filter((v) => v >= 0)
          .map((v) => (
            <g key={v}>
              <line
                x1="18"
                x2={width - 52}
                y1={y(v)}
                y2={y(v)}
                stroke="#c5d2bb"
                strokeDasharray="2 7"
              />
              <text x={width - 42} y={y(v) + 4} className="lane-distance">
                {v.toFixed(view.span < 6 ? 1 : 0)}
              </text>
            </g>
          ))}
        {bounds.min <= 0 && bounds.max >= 0 && (
          <>
            <line
              x1="18"
              x2={width - 52}
              y1={y(0)}
              y2={y(0)}
              stroke="#282f2c"
              strokeWidth="2"
            />
            <text x="18" y={y(0) - 10} className="lane-distance">
              START
            </text>
          </>
        )}
        {ordered.map((l, i) => {
          const position = arenaPosition(l.value, effectiveView);
          const effect = !l.you ? overtakeFrame?.rivalEffects[l.id] : undefined;
          const speed = l.you && animating ? (overtakeFrame?.speed ?? 0) : 0;
          const charging =
            l.you && animating ? (overtakeFrame?.charging ?? 0) : 0;
          const yy = y(l.value) + (l.you ? charging * 4 : 0);
          const xx = (i + 0.5) * laneWidth + 10 + (effect?.joltX ?? 0);
          const active = selected === l.id || l.you;
          const wakeLen = Math.min(
            28 + speed * 88,
            Math.max(0, maxTailY - (yy + 14)),
          );
          const rivalMovedInSlide =
            !l.you &&
            overtakeFrame?.phase === "rival-slide" &&
            overtakePlan?.rivals[l.id]?.moved;
          return (
            <g
              key={l.id}
              data-athlete={l.id}
              role="button"
              tabIndex={0}
              aria-label={`${l.name}, ${formatLastUpdated(l)}, ${l.value.toFixed(1)} ${unit}${position.edge ? `, ${position.edge} of visible range` : ""}`}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  e.stopPropagation();
                  onSelect(l.id);
                }
              }}
            >
              {l.you && speed > 0.01 && wakeLen > 6 && (
                <g pointerEvents="none" data-overtake-afterburn="true">
                  <path
                    d={`M ${xx - 16} ${yy + 14} C ${xx - 22} ${yy + 14 + wakeLen * 0.45}, ${xx - 8} ${yy + 14 + wakeLen * 0.85}, ${xx} ${yy + 14 + wakeLen} C ${xx + 8} ${yy + 14 + wakeLen * 0.85}, ${xx + 22} ${yy + 14 + wakeLen * 0.45}, ${xx + 16} ${yy + 14} Z`}
                    fill="url(#focus-afterburn-wake)"
                    opacity={speed}
                  />
                  {[-14, -7, 0, 7, 14].map((dx, idx) => {
                    const isCenter = idx === 2;
                    const streakLen = Math.min(
                      speed * (54 + (idx % 2 === 0 ? 34 : 18)),
                      Math.max(0, maxTailY - (yy + 24)),
                    );
                    if (streakLen <= 2) return null;
                    return (
                      <line
                        key={idx}
                        x1={xx + dx}
                        x2={xx + dx}
                        y1={yy + 24}
                        y2={yy + 24 + streakLen}
                        stroke="#f1c75b"
                        strokeWidth={isCenter ? 6 : 2}
                        strokeLinecap="round"
                        opacity={speed * (isCenter ? 0.48 : 0.78)}
                      />
                    );
                  })}
                </g>
              )}
              {l.you && charging > 0.02 && (
                <g
                  opacity={charging}
                  stroke="#f1c75b"
                  strokeWidth="2"
                  strokeLinecap="round"
                  pointerEvents="none"
                >
                  <path
                    d={`M ${xx - 30} ${yy - 4} l -8 6 l 5 2 l -5 7 M ${xx + 30} ${yy - 6} l 8 6 l -5 2 l 5 7`}
                    fill="none"
                  />
                </g>
              )}
              {rivalMovedInSlide && (
                <line
                  x1={xx}
                  x2={xx}
                  y1={yy + 18}
                  y2={yy + 46}
                  stroke="#9bbf63"
                  strokeWidth="3"
                  strokeLinecap="round"
                  opacity="0.45"
                  pointerEvents="none"
                />
              )}
              {effect?.isPassed && effect.ripple < 1 && (
                <circle
                  cx={xx}
                  cy={yy}
                  r={19 + effect.ripple * 24}
                  fill="none"
                  stroke="#f1c75b"
                  strokeWidth={3 - effect.ripple * 2}
                  opacity={1 - effect.ripple}
                  pointerEvents="none"
                  data-overtake-ripple="true"
                />
              )}
              {firstPlaceId === l.id && (
                <foreignObject
                  x={xx - 16}
                  y={yy - 44}
                  width="32"
                  height="32"
                  style={{ overflow: "visible", pointerEvents: "none" }}
                  className="lane-first-ember"
                >
                  <Ember expression="joy" shadow={false} />
                </foreignObject>
              )}
              {l.you && (
                <circle cx={xx} cy={yy} r="34" fill="url(#focus-you-glow)" />
              )}
              <circle
                cx={xx}
                cy={yy + 4}
                r={l.you ? 24 : 19}
                fill="#282f2c18"
              />
              <circle
                cx={xx}
                cy={yy}
                r={l.you ? 23 : 18}
                fill={l.you ? "#282f2c" : active ? "#f1c75b" : "#ffffff"}
                stroke={l.you ? "#f1c75b" : active ? "#deb142" : "#c9d5bf"}
                strokeWidth={l.you ? 4 : 2}
                filter={active ? "url(#focus-soft)" : undefined}
              />
              <text
                x={xx}
                y={yy + 4}
                textAnchor="middle"
                className="lane-initial"
                fill={l.you ? "#fafaf7" : "#282f2c"}
              >
                {position.edge
                  ? position.edge === "ahead"
                    ? "↑"
                    : "↓"
                  : l.initials}
              </text>
              <rect
                x={xx - 26}
                y={yy + 28}
                width="52"
                height="20"
                rx="10"
                fill={l.you ? "#282f2c" : "#ffffffee"}
                stroke={l.you && speed > 0.05 ? "#f1c75b" : "#d3ddcb"}
              />
              <text
                x={xx}
                y={yy + 42}
                textAnchor="middle"
                className="lane-total"
                fill={l.you ? "#f1c75b" : "#282f2c"}
                style={{ fontSize: 10 }}
              >
                {l.you && animating
                  ? `${l.value.toFixed(1)} ${unit}`
                  : formatLastUpdated(l)}
              </text>
            </g>
          );
        })}
        {ghost &&
          (() => {
            const i = ordered.findIndex((l) => l.you);
            const gx = (i + 0.5) * laneWidth + 28;
            const gy = y(ghost.value);
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
                  cx={gx}
                  cy={gy}
                  r="13"
                  fill="#ffffffcc"
                  stroke="#616c63"
                  strokeDasharray="3 3"
                />
                <text
                  x={gx}
                  y={gy + 4}
                  textAnchor="middle"
                  className="lane-distance"
                >
                  ◌
                </text>
              </g>
            );
          })()}
        <text x={width - 42} y="36" className="lane-distance">
          {unit}
        </text>
        <text x="18" y="522" className="lane-distance">
          Drag ↕ to explore · zoom keeps you centered
        </text>
      </svg>
    </div>
  );
}
