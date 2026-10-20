"use client";

import { useId, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { arenaWindow, orderedArenaLanes, polishedLaneScale, type ArenaSceneLane, type ArenaViewWindow } from "@fitness-battle/shared";
import { PolishedRacer, usePolishedWakeTime } from "@/features/brand/polished-racer";
import { backgrounds, progressTreatments, type BackgroundId, type ProgressId, type ZoomId, type TrackEdgeId } from "./field-directions";
import { boardFraction, boardGap, boardTicks, fieldZoom, formatBoardValue, progressClearance, type BoardSession } from "./model";
import { TrackBackground, type FieldGeometry } from "./track-background";
import { ProgressTraces } from "./progress-traces";

export interface Board2DProps {
  lanes: ArenaSceneLane[]; sessions: BoardSession[]; view: ArenaViewWindow;
  background: BackgroundId; edges?: TrackEdgeId; loopUnit?: "km" | "mi"; progress: ProgressId; zoom: ZoomId;
  selected: string; showGhost: boolean; expanded: boolean;
  onSelect: (id: string) => void; onSession: (session: BoardSession) => void; onPan: (center: number) => void;
}

function displayValue(value: number, view: ArenaViewWindow, pixels: number, length: number) {
  const bounds = arenaWindow(view.center, view.span);
  const fraction = boardFraction(value, view), pad = Math.min(.25, pixels / length);
  return { value: bounds.min + Math.max(pad, Math.min(1 - pad, fraction)) * bounds.span, edge: fraction > 1 ? "ahead" : fraction < 0 ? "behind" : null };
}

/** Only this layer runs the production wake clock; the surface and progress remain still at rest. */
function Racers({ host, lanes, view, geometry: g, selected, onSelect }: {
  host: RefObject<HTMLDivElement | null>; lanes: ArenaSceneLane[]; view: ArenaViewWindow;
  geometry: FieldGeometry; selected: string; onSelect: (id: string) => void;
}) {
  const time = usePolishedWakeTime(host), you = lanes.find(l => l.you);
  return <g className="bl-racers">{lanes.map((lane, index) => {
    const position = displayValue(lane.value, view, Math.max(22, 34 * g.markerScale), g.length);
    const p = g.point(position.value, index), scale = g.markerScale;
    const hitW = Math.max(44, 50 * scale), hitH = Math.max(44, 66 * scale);
    return <g key={lane.id} data-selectable="athlete" data-athlete={lane.id} data-marker-scale={scale.toFixed(4)} className="bl-athlete-mark" role="button" tabIndex={0} aria-pressed={selected === lane.id}
      aria-label={`${lane.name}, ${lane.value.toFixed(1)} km${position.edge ? `, offscreen ${position.edge}` : ""}. ${boardGap(lane.value, you?.value ?? 0, "km")}`}
      onClick={() => onSelect(lane.id)} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); onSelect(lane.id); } }}>
      <rect x={p.x - hitW / 2} y={p.y - hitH / 2} width={hitW} height={hitH} rx="20" fill="transparent"/>
      {selected === lane.id && <ellipse cx={p.x} cy={p.y + 28 * scale} rx={26 * scale} ry={6 * scale} fill="#4a563b" opacity=".13" pointerEvents="none"/>}
      <g transform={`translate(${p.x} ${p.y}) scale(${scale})`}><PolishedRacer x={0} y={0} you={Boolean(lane.you)} active={selected === lane.id} time={time} showWake={!position.edge} wakeBottom={(g.top + g.length - p.y) / scale}/></g>
      {position.edge && <g pointerEvents="none" transform={`translate(${p.x} ${p.y + (position.edge === "ahead" ? -1 : 1) * Math.max(27, 42 * scale)})`}><rect x="-25" y="-11" width="50" height="21" rx="10" fill="#ffffff" stroke="#dce2d8"/><text textAnchor="middle" y="3" className="bl-edge-label">{position.edge === "ahead" ? "↑" : "↓"} {lane.value.toFixed(1)}</text></g>}
    </g>;
  })}</g>;
}

/** One controlled vertical-kilometer field; surface, earned progress and camera are independent. */
export function Board2D({ lanes, sessions, view, background, edges, progress, zoom, selected, showGhost, expanded, onSelect, onSession, onPan }: Board2DProps) {
  const host = useRef<HTMLDivElement>(null), id = useId().replaceAll(":", "");
  const [size, setSize] = useState({ width: 720, height: 510 });
  const gesture = useRef<{ x: number; y: number; center: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false), crossAnchor = useRef<number | null>(null);
  const ordered = orderedArenaLanes(lanes), count = Math.max(1, ordered.length);
  const palette = backgrounds[background], ghost = lanes.find(l => l.ghost), self = ordered.findIndex(l => l.you);
  const { worldScale, markerScale } = fieldZoom(view.span, zoom);
  const baseLane = Math.max(112, Math.min(154, (size.width - 68) / count));
  const laneWidth = baseLane * worldScale, fieldWidth = count * laneWidth;
  const width = Math.max(size.width, fieldWidth + 68), height = size.height;
  const top = 88, bottom = 54, length = Math.max(100, height - top - bottom);
  const left = Math.max(20, (width - 42 - fieldWidth) / 2);
  const bounds = arenaWindow(view.center, view.span), ticks = boardTicks(view, 6, 1);
  const along = (d: number) => top + (1 - boardFraction(d, view)) * length;
  const cross = (i: number) => left + laneWidth * (i + .5);
  const drift = (d: number) => background === "trail" ? Math.sin(d * .65) * 13 * worldScale : 0;
  const point = (d: number, i: number) => ({ x: cross(i) + drift(d), y: along(d) });
  const path = (a: number, b: number, i: number, offset = 0) => {
    const steps = background === "trail" ? Math.min(180, Math.max(2, Math.ceil(Math.abs(b - a) * 8))) : 1;
    return Array.from({ length: steps + 1 }, (_, n) => { const p = point(a + (b - a) * n / steps, i); return `${n ? "L" : "M"}${(p.x + offset).toFixed(2)} ${p.y.toFixed(2)}`; }).join(" ");
  };
  const g: FieldGeometry = { width, height, left, fieldWidth, top, bottom, length, laneWidth, worldScale, markerScale, along, cross, drift, point, path };

  useLayoutEffect(() => {
    const el = host.current; if (!el) return;
    const measure = () => setSize({ width: el.clientWidth, height: el.clientHeight }); measure();
    const observer = new ResizeObserver(measure); observer.observe(el); return () => observer.disconnect();
  }, []);
  useLayoutEffect(() => {
    const el = host.current; if (!el) return;
    el.scrollLeft = Math.max(0, cross(crossAnchor.current ?? self) - (el.clientWidth - 42) / 2);
    // Keep a fractional cross-field anchor when all lanes temporarily fit during expansion/zoom.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size.width, width, laneWidth]);

  return <div className="bl-board-viewport" data-background={background} data-progress={progress} data-zoom={zoom}>
    <div ref={host} className="bl-board-scroll" onScroll={e => { const el = e.currentTarget; if (width > size.width && el.clientWidth === size.width) crossAnchor.current = (el.scrollLeft + (size.width - 42) / 2 - left) / laneWidth - .5; }}>
      <svg className="bl-board-svg" width={width} height={height} viewBox={`0 0 ${width} ${height}`} data-world-scale={worldScale.toFixed(4)} data-lane-width={laneWidth.toFixed(4)}
        role="group" aria-label={`${palette.name}, ${progressTreatments[progress].name}. Vertical field, ${bounds.min.toFixed(1)} to ${bounds.max.toFixed(1)} km.`}
        tabIndex={0} style={{ touchAction: expanded ? "pan-x" : "pan-x pan-y" }}
        onKeyDown={e => { if (e.key === "ArrowUp" || e.key === "ArrowDown") { e.preventDefault(); onPan(view.center + (e.key === "ArrowUp" ? 1 : -1) * view.span / 4); } }}
        onPointerDown={e => { suppressClick.current = false; if (!e.isPrimary || e.button !== 0 || (e.pointerType === "touch" && !expanded)) return; gesture.current = { x: e.clientX, y: e.clientY, center: view.center, moved: false }; }}
        onPointerMove={e => { const start = gesture.current; if (!start) return; const dy = e.clientY - start.y; if (Math.abs(dy) < 4 && !start.moved) return; start.moved = true; if (!e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.setPointerCapture(e.pointerId); onPan(start.center + dy / length * view.span); }}
        onPointerUp={() => { suppressClick.current = Boolean(gesture.current?.moved); gesture.current = null; }}
        onClickCapture={e => { if (suppressClick.current) { e.preventDefault(); e.stopPropagation(); suppressClick.current = false; } }}
        onPointerCancel={() => { gesture.current = null; suppressClick.current = false; }} onLostPointerCapture={() => { gesture.current = null; }}>
        <defs>
          <clipPath id={`${id}-plot`}><rect x="0" y={top} width={width - 42} height={length}/></clipPath>
          <mask id={`${id}-progress-clear`} maskUnits="userSpaceOnUse" x="0" y={top} width={width} height={length} style={{ maskType: "luminance" }}>
            <rect x="0" y={top} width={width} height={length} fill="white"/>
            {ordered.map((lane, i) => {
              const p = point(displayValue(lane.value, view, Math.max(22, 34 * markerScale), length).value, i);
              const head = 23 * polishedLaneScale(Boolean(lane.you)) * markerScale + 2;
              return <rect key={lane.id} data-wake-exclusion={lane.id} x={p.x - head} y={p.y - 31 * markerScale - 3} width={head * 2} height={progressClearance(markerScale) + 31 * markerScale + 3} rx={head} fill="black"/>;
            })}
          </mask>
        </defs>
        <rect width={width} height={height} fill="#f6f7f2"/>
        <g clipPath={`url(#${id}-plot)`}>
          <TrackBackground background={background} geometry={g} count={count} view={view} prefix={id} edges={edges}/>
          <ProgressTraces treatment={progress} lanes={ordered} sessions={sessions} geometry={g} view={view} mask={`${id}-progress-clear`} dark={background === "night"} selected={selected} onSelect={onSelect} onSession={onSession}/>
          {background !== "straight" && background !== "oval" && bounds.min <= 0 && bounds.max >= 0 && <g className="bl-start-origin" pointerEvents="none"><line x1={left} x2={left + fieldWidth} y1={along(0)} y2={along(0)} stroke={palette.rule} strokeWidth={2 * worldScale}/><text x={left + 6} y={along(0) - 8} fontSize="10" fill={palette.ink}>START</text></g>}
        </g>
        {laneWidth >= 63 && ordered.map((lane, i) => <g key={lane.id} pointerEvents="none"><text className={`bl-lane-name ${lane.you ? "is-you" : ""}`} x={cross(i)} y="33" textAnchor="middle">{lane.you ? "YOU" : lane.name.split(" ")[0]}</text><text className="bl-lane-total" x={cross(i)} y="53" textAnchor="middle">{lane.value.toFixed(1)} <tspan>km</tspan></text></g>)}
        {laneWidth < 63 && <text x={width / 2 - 21} y="38" textAnchor="middle" className="bl-axis-label">Your field · {view.span.toFixed(1)} km in view</text>}
        <Racers host={host} lanes={ordered} view={view} geometry={g} selected={selected} onSelect={onSelect}/>
        {showGhost && ghost && boardFraction(ghost.value, view) >= 0 && boardFraction(ghost.value, view) <= 1 && (() => {
          const p = point(ghost.value, self), scale = markerScale;
          return <g className="bl-ghost" aria-label={`Past you, ${formatBoardValue(ghost.value, "km")} km, unranked`}><rect x={p.x - 12 * scale} y={p.y - 18 * scale} width={24 * scale} height={36 * scale} rx={12 * scale} fill={background === "night" ? "#34493b" : "#fafaf7"} fillOpacity=".65" stroke={palette.muted} strokeDasharray="3 4"/>{laneWidth > 64 && <text x={p.x + 18 * scale} y={p.y + 4} style={{ fill: palette.muted }}>Past you</text>}</g>;
        })()}
      </svg>
    </div>
    <svg className="bl-fixed-axis" width="42" height={height} aria-label="Distance scale in kilometers"><rect width="42" height={height} fill="#f6f7f2"/><text className="bl-axis-unit" x="13" y={top - 23}>km</text>{ticks.values.map(d => <g key={d} data-kilometer={d}><circle cx="3" cy={along(d)} r="1.5" fill="#9daa91"/><text className="bl-axis-label" x="13" y={along(d) + 4}>{d}</text></g>)}</svg>
    <span className="bl-board-caption">{progressTreatments[progress].short} · whole-kilometer scale</span>
  </div>;
}
