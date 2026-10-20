"use client";
import { useRef, useLayoutEffect, useState, useId } from "react";
import { motion, useReducedMotion } from "motion/react";
import {
  arenaPosition,
  formatActivityAge,
  arenaWindow,
  clampArenaLaneCenter,
  orderedArenaLanes,
  polishedLaneScale,
  selfLaneLabel,
  type ArenaOvertakeFrame,
  type ArenaOvertakePlan,
  type ArenaSceneLane,
  type ArenaViewWindow,
} from "@fitness-battle/shared";
import { laneGeometry, centeredLaneScroll } from "@/features/field/components/lane-geometry";
import { Ember } from "@/components/mascot/ember";
import { PolishedRacer, usePolishedWakeTime } from "@/features/brand/polished-racer";
export function ArenaLanes({
  lanes,
  presentation = "lanes",
  scores = {},
  immersive = false,
  view,
  unit,
  selected,
  onSelect,
  onPan,
  onBackgroundTap,
  overtakeFrame = null,
  overtakePlan = null,
}: {
  lanes: ArenaSceneLane[];
  presentation?: "lanes" | "standings";
  scores?: Record<string, number>;
  immersive?: boolean;
  view: ArenaViewWindow;
  unit: string;
  selected: string;
  onSelect: (id: string) => void;
  onPan: (center: number) => void;
  onBackgroundTap?: () => void;
  overtakeFrame?: ArenaOvertakeFrame | null;
  overtakePlan?: ArenaOvertakePlan | null;
}) {
  const host = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const standings = presentation === "standings";
  const prefix = useId();
  const wakeTime = usePolishedWakeTime(host);
  const [measured, setMeasured] = useState(false);
  const [size, setSize] = useState({ width: 360, height: 540 });
  const previousGeometry = useRef<{ width: number; laneWidth: number; count: number } | null>(null);
  const laneScroll = useRef<number | null>(null);
  const drag = useRef<{
    pointerId: number;
    x: number;
    y: number;
    scrollLeft: number;
    center: number;
    moved: boolean;
    mode: "undecided" | "vertical" | "horizontal";
    captured: boolean;
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
  const geometry = laneGeometry(size.width, size.height, ordered.length);
  const width = standings ? size.width : geometry.width;
  const height = standings ? Math.max(160, ordered.length * 76 + 24) : geometry.height;
  const { laneWidth, plotHeight } = geometry;
  const y = (v: number) => 72 + arenaPosition(v, effectiveView).fraction * plotHeight;
  const maxTailY = Math.min(height - 58, bounds.min <= 0 && bounds.max >= 0 ? y(0) + 4 : height - 58);

  const yourValue = liveLanes.find((lane) => lane.you)?.value ?? 0;
  const relativeDistance = (value: number) => `${value - yourValue > 0 ? "+" : ""}${(value - yourValue).toFixed(1)} ${unit}`;

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

  useLayoutEffect(() => {
    const el = host.current;
    if (!el) return;
    const measure = () => {
      if (el.clientWidth > 0 && el.clientHeight > 0) { setSize({ width: el.clientWidth, height: el.clientHeight }); setMeasured(true); }
    };
    // Measure before the first painted frame. Waiting for the first observer
    // notification lets the SVG render once at its fallback 360px width, then
    // visibly stretch and recenter as soon as the real container size arrives.
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  useLayoutEffect(() => {
    const el = host.current;
    if (!el || el.clientWidth === 0 || standings) return;
    const previous = previousGeometry.current;
    const laneIndex = previous
      ? ((laneScroll.current ?? el.scrollLeft) + previous.width / 2 - 10) / previous.laneWidth - 0.5
      : Math.max(0, ordered.findIndex((lane) => lane.you));
    el.scrollLeft = centeredLaneScroll(laneIndex, laneWidth, size.width, width);
    laneScroll.current = el.scrollLeft;
    previousGeometry.current = { width: size.width, laneWidth, count: ordered.length };
  }, [width, laneWidth, size.width, standings]);
  return (
    <div className="focus-lane-scroll" ref={host} data-immersive={immersive}
      onScroll={(event) => { if (!standings) laneScroll.current = event.currentTarget.scrollLeft; }}
      style={{ visibility: measured ? "visible" : "hidden", height: standings ? height : undefined, transition: reduced ? "none" : "height .48s cubic-bezier(.22,1,.36,1)" }}>
      <svg
        className="focus-lane-track"
        viewBox={`0 0 ${width} ${height}`}
        width={width}
        height={height}
        style={{ width, height, touchAction: immersive ? "none" : "pan-y pinch-zoom" }}
        role="group"
        aria-label={standings ? "Athlete standings, ranked by weekly effort" : `Vertical athlete lanes, ${bounds.min.toFixed(1)} to ${bounds.max.toFixed(1)} ${unit}. Drag to explore.`}
        tabIndex={0}
        onKeyDown={(e) => {
          if (!standings && e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault(); onBackgroundTap?.();
          }
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
          if (!e.isPrimary || e.button !== 0) return;
          drag.current = {
            pointerId: e.pointerId,
            x: e.clientX,
            y: e.clientY,
            scrollLeft: host.current?.scrollLeft ?? 0,
            center: effectiveView.center,
            moved: false,
            mode: "undecided",
            captured: false,
            id:
              (e.target as Element)
                .closest("[data-athlete]")
                ?.getAttribute("data-athlete") ?? null,
          };
        }}
        onPointerMove={(e) => {
          if (standings) return;
          const press = drag.current;
          if (!press || press.pointerId !== e.pointerId) return;
          const scale = e.currentTarget.getBoundingClientRect().height / height || 1;
          const dx = (e.clientX - press.x) / scale;
          const dy = (e.clientY - press.y) / scale;
          if (press.mode === "undecided") {
            if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
            if (Math.abs(dx) > Math.abs(dy)) {
              press.mode = "horizontal";
              press.captured = true;
              e.currentTarget.setPointerCapture(e.pointerId);
            } else {
              if (!immersive && e.pointerType === "touch") { drag.current = null; return; }
              press.mode = "vertical";
              if (!press.captured) {
                press.captured = true;
                e.currentTarget.setPointerCapture(e.pointerId);
              }
            }
          }
          if (press.mode === "horizontal") {
            press.moved = true;
            const el = host.current;
            if (el) el.scrollLeft = press.scrollLeft - dx;
            return;
          }
          if (press.mode === "vertical") {
            if (!press.captured) {
              press.captured = true;
              e.currentTarget.setPointerCapture(e.pointerId);
            }
            if (Math.abs(dy) > 5) {
              press.moved = true;
              onPan(
                clampArenaLaneCenter(
                  press.center + (dy / plotHeight) * effectiveView.span,
                  effectiveView.span,
                ),
              );
            }
          }
        }}
        onPointerUp={(e) => {
          const press = drag.current;
          drag.current = null;
          if (!press || press.pointerId !== e.pointerId) return;
          if (press.captured) {
            try {
              e.currentTarget.releasePointerCapture(e.pointerId);
            } catch {
              /* already released */
            }
          }
          if (!press.moved && press.id) {
            onSelect(press.id);
            return;
          }
          if (!press.moved && !press.id && !standings) onBackgroundTap?.();
        }}
        onLostPointerCapture={() => { drag.current = null; }}
        onPointerCancel={(e) => {
          const press = drag.current;
          drag.current = null;
          if (press?.captured) {
            try {
              e.currentTarget.releasePointerCapture(e.pointerId);
            } catch {
              /* already released */
            }
          }
        }}
      >
        <defs>
          <linearGradient id={`${prefix}-road`} x2="0" y2="1">
            <stop stopColor="#f7faf3" />
            <stop offset="0.45" stopColor="#eef3e8" />
            <stop offset="1" stopColor="#e4ecdc" />
          </linearGradient>
          <linearGradient id={`${prefix}-you-lane`} x2="0" y2="1">
            <stop stopColor="#f1c75b66" />
            <stop offset="1" stopColor="#f1c75b20" />
          </linearGradient>
          <radialGradient id={`${prefix}-you-glow`} cx="50%" cy="50%" r="50%">
            <stop stopColor="#f1c75b" stopOpacity="0.55" />
            <stop offset="1" stopColor="#f1c75b" stopOpacity="0" />
          </radialGradient>
          <linearGradient id={`${prefix}-afterburn-wake`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#f1c75b" stopOpacity="0.65" />
            <stop offset="0.45" stopColor="#f1c75b" stopOpacity="0.28" />
            <stop offset="1" stopColor="#f1c75b" stopOpacity="0" />
          </linearGradient>
          <filter id={`${prefix}-soft`} x="-40%" y="-40%" width="180%" height="180%">
            <feDropShadow
              dx="0"
              dy="3"
              stdDeviation="3"
              floodColor="#282f2c"
              floodOpacity="0.18"
            />
          </filter>
        </defs>
        <motion.g aria-hidden={standings} initial={false} animate={{ opacity: standings ? 0 : 1 }} style={{ pointerEvents: "none" }}>
        <rect width={width} height={height} rx="24" fill={`url(#${prefix}-road)`} />
        <rect
          x="10"
          y="56"
          width={width - 62}
          height={height - 110}
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
                height={height - 110}
                fill={`url(#${prefix}-you-lane)`}
                rx="14"
              />
            )}
            <line
              x1={i * laneWidth + 10}
              x2={i * laneWidth + 10}
              y1="64"
              y2={height - 64}
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
        </motion.g>
        {ordered.map((l, i) => {
          const position = arenaPosition(l.value, effectiveView);
          const effect = !l.you ? overtakeFrame?.rivalEffects[l.id] : undefined;
          const speed = l.you && animating ? (overtakeFrame?.speed ?? 0) : 0;
          const charging =
            l.you && animating ? (overtakeFrame?.charging ?? 0) : 0;
          const row = sortedByValue.findIndex((lane) => lane.id === l.id);
          const rank = 1 + sortedByValue.filter((lane) => lane.value > l.value + 0.000001).length;
          const targetY = standings ? 48 + row * 76 : y(l.value) + (l.you ? charging * 4 : 0);
          const targetX = standings ? 38 : (i + 0.5) * laneWidth + 10 + (effect?.joltX ?? 0);
          const xx = 0, yy = 0;
          const active = selected === l.id || l.you;
          const headHalf = 29 * polishedLaneScale(Boolean(l.you));
          return (
            <motion.g
              key={l.id}
              initial={false}
              animate={{ x: targetX, y: targetY }}
              transition={{ duration: reduced || drag.current || animating || previousGeometry.current?.width !== size.width ? 0 : 0.48, ease: [0.22, 1, 0.36, 1] }}
              data-athlete={l.id}
              role="button"
              aria-pressed={selected === l.id}
              tabIndex={0}
              aria-label={`${l.name}, ${standings ? `place ${rank}, ` : ""}${formatLastUpdated(l)}, ${relativeDistance(l.value)} relative to you${!standings && position.edge ? `, ${position.edge} of visible range` : ""}`}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  e.stopPropagation();
                  onSelect(l.id);
                }
              }}
            >
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
              {firstPlaceId === l.id && !standings && !position.edge && (
                <foreignObject
                  x={xx - 16}
                  y={yy - headHalf - 64}
                  width="32"
                  height="32"
                  style={{ overflow: "visible", pointerEvents: "none" }}
                  className="lane-first-ember"
                >
                  <Ember expression="joy" shadow={false} />
                </foreignObject>
              )}
              {/* Clip only the wake, in racer-local coordinates; the head must stay
                  visible at field edges and throughout the standings transition. */}
              {standings || !position.edge ? (
                <PolishedRacer x={xx} y={yy} you={Boolean(l.you)} gold={rank === 1} active={active}
                  showWake={!standings} wakeBottom={maxTailY-targetY} time={wakeTime}/>
              ) : <circle r={18} fill="white" stroke="#616c63" strokeDasharray="3 3"/>}
              <rect className="focus-racer-focus-ring" x={-23} y={-headHalf-3} width={46} height={headHalf*2+6} rx={23} fill="none" stroke="#f1c75b" strokeWidth={2}/>
              <rect x={xx - 24} y={yy - headHalf - 4} width="48" height={headHalf * 2 + 8} rx="24" fill="transparent"/>
              <text
                x={xx}
                y={yy + 4}
                textAnchor="middle"
                className="lane-initial"
                fill="#282f2c"
              >
                {!standings && position.edge
                  ? position.edge === "ahead"
                    ? "↑"
                    : "↓"
                  : l.initials}
              </text>
              <motion.g aria-hidden={standings} initial={false} animate={{ opacity: standings ? 0 : 1 }} style={{ pointerEvents: "none" }}>
              <rect
                x={xx - 26}
                y={yy - headHalf - 26}
                width="52"
                height="20"
                rx="10"
                fill={l.you ? "#282f2c" : "#ffffffee"}
                stroke={l.you && speed > 0.05 ? "#f1c75b" : "#d3ddcb"}
              />
              <text
                x={xx}
                y={yy - headHalf - 12}
                textAnchor="middle"
                className="lane-total"
                fill={l.you ? "#f1c75b" : "#282f2c"}
                style={{ fontSize: 10, fill: l.you ? "#f1c75b" : "#282f2c" }}
              >
                {relativeDistance(l.value)}
              </text>
              </motion.g>
              <g aria-hidden={!standings} display={standings ? "inline" : "none"}>
              <motion.g initial={false} animate={{ opacity: standings ? 1 : 0 }}>
                <rect x={-30} y={-33} width={Math.max(200, width - 16)} height={70} rx={14} fill="transparent" />
                <line x1={-22} x2={width - 52} y1={38} y2={38} stroke="#e0e5dc" />
                <text x={40} y={4} fill="#616c63" fontSize={12}>{rank}</text>
                <text x={64} y={-5} fill="#282f2c" fontSize={13} fontWeight={600}>{l.you ? selfLaneLabel(l.name) : l.name}</text>
                <text x={64} y={15} fill="#a67c00" fontSize={10}>Effort score {scores[l.id] ?? "—"}</text>
                <text x={width - 58} y={5} textAnchor="end" fill="#282f2c" fontSize={13} fontWeight={700}>{relativeDistance(l.value)}</text>
              </motion.g>
              </g>
            </motion.g>
          );
        })}
        {ghost && !standings &&
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
        <text opacity={standings ? 0 : 1} x={width - 42} y="36" className="lane-distance">
          {unit}
        </text>
        <text opacity={standings ? 0 : 1} x="18" y={height - 18} className="lane-distance">
          Drag ↕ distance · ↔ lanes · tap track to expand
        </text>
      </svg>
    </div>
  );
}
