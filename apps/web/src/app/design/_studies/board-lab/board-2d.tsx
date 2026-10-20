"use client";

import { useId, useLayoutEffect, useRef, useState } from "react";
import { arenaWindow, orderedArenaLanes, type ArenaSceneLane, type ArenaViewWindow } from "@fitness-battle/shared";
import { PolishedRacer } from "@/features/brand/polished-racer";
import { boardFraction, boardGap, boardTicks, formatBoardValue, visibleSessions, type BoardOrientation, type BoardSession, type BoardUnit } from "./model";

export interface Board2DProps {
  lanes: ArenaSceneLane[];
  sessions: BoardSession[];
  material: "tapestry" | "ribbon";
  orientation: BoardOrientation;
  view: ArenaViewWindow;
  unit: BoardUnit;
  selected: string;
  showGhost: boolean;
  expanded: boolean;
  onSelect: (id: string) => void;
  onSession: (session: BoardSession) => void;
  onPan: (center: number) => void;
}

/** Controlled SVG renderer: authentic totals + optional sourced session intervals in, gestures out. */
export function Board2D({ lanes, sessions, material, orientation, view, unit, selected, showGhost, expanded, onSelect, onSession, onPan }: Board2DProps) {
  const host = useRef<HTMLDivElement>(null);
  const id = useId().replaceAll(":", "");
  const [size, setSize] = useState({ width: 720, height: 510 });
  const gesture = useRef<{ x: number; y: number; center: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);
  const crossAnchor = useRef<number | null>(null);
  const vertical = orientation === "vertical";
  const ordered = orderedArenaLanes(lanes);
  const you = lanes.find(l => l.you);
  const ghost = lanes.find(l => l.ghost);
  const count = Math.max(1, ordered.length);
  const width = vertical ? Math.max(size.width, count * 104 + 68) : size.width;
  const height = vertical ? size.height : Math.max(size.height, count * 80 + 96);
  const left = vertical ? 20 : size.width < 450 ? 68 : 100;
  const right = vertical ? 54 : 52;
  const top = vertical ? 90 : 58;
  const bottom = vertical ? 72 : 42;
  const length = vertical ? height - top - bottom : width - left - right;
  const crossLength = vertical ? width - left - right : height - top - bottom;
  const laneWidth = crossLength / count;
  const bounds = arenaWindow(view.center, view.span);
  const ticks = boardTicks(view, !vertical && size.width < 450 ? 3 : 6);
  const cross = (index: number) => (vertical ? left : top) + laneWidth * (index + .5);
  const along = (value: number) => vertical ? top + (1 - boardFraction(value, view)) * length : left + boardFraction(value, view) * length;
  const point = (value: number, index: number) => vertical ? { x: cross(index), y: along(value) } : { x: along(value), y: cross(index) };

  useLayoutEffect(() => {
    const el = host.current;
    if (!el) return;
    const measure = () => setSize({ width: el.clientWidth, height: el.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  useLayoutEffect(() => {
    const el = host.current;
    if (!el) return;
    if (!vertical) { crossAnchor.current = null; return; }
    const index = crossAnchor.current ?? ordered.findIndex(l => l.you);
    el.scrollLeft = Math.max(0, cross(index) - (el.clientWidth - 42) / 2);
    // Preserve a fractional lane anchor across expansion, even when all lanes fit temporarily.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size.width, width, vertical]);

  function rect(a: number, b: number, index: number, inset = .18) {
    const start = Math.max(vertical ? top : left, Math.min(along(a), along(b)));
    const end = Math.min((vertical ? top : left) + length, Math.max(along(a), along(b)));
    const crossStart = cross(index) - laneWidth * (.5 - inset);
    return vertical
      ? { x: crossStart, y: start, width: laneWidth * (1 - inset * 2), height: Math.max(0, end - start) }
      : { x: start, y: crossStart, width: Math.max(0, end - start), height: laneWidth * (1 - inset * 2) };
  }
  return <div className="bl-board-viewport"><div ref={host} className="bl-board-scroll" data-orientation={orientation} data-material={material}
    onScroll={event => {
      const el = event.currentTarget;
      if (vertical && width > size.width && el.clientWidth === size.width) crossAnchor.current = (el.scrollLeft + (size.width - 42) / 2 - left) / laneWidth - .5;
    }}>
    <svg className="bl-board-svg" width={width} height={height} viewBox={`0 0 ${width} ${height}`}
      role="group" aria-label={`${material === "tapestry" ? "Session Tapestry" : "Distance Ribbon"}, ${orientation}. ${bounds.min.toFixed(1)} to ${bounds.max.toFixed(1)} ${unit}.`}
      tabIndex={0} style={{ touchAction: vertical && !expanded ? "pan-x pan-y" : vertical ? "pan-x" : "pan-y" }}
      onKeyDown={event => {
        const forward = vertical ? "ArrowUp" : "ArrowRight", backward = vertical ? "ArrowDown" : "ArrowLeft";
        if (event.key === forward || event.key === backward) { event.preventDefault(); onPan(view.center + (event.key === forward ? 1 : -1) * view.span / 4); }
      }}
      onPointerDown={event => {
        suppressClick.current = false;
        if (!event.isPrimary || event.button !== 0) return;
        if (event.pointerType === "touch" && vertical && !expanded) return;
        gesture.current = { x: event.clientX, y: event.clientY, center: view.center, moved: false };
      }}
      onPointerMove={event => {
        const start = gesture.current; if (!start) return;
        const delta = vertical ? event.clientY - start.y : start.x - event.clientX;
        if (Math.abs(delta) < 4 && !start.moved) return;
        start.moved = true;
        if (!event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.setPointerCapture(event.pointerId);
        onPan(start.center + delta / length * view.span);
      }}
      onPointerUp={() => { suppressClick.current = Boolean(gesture.current?.moved); gesture.current = null; }}
      onClickCapture={event => { if (suppressClick.current) { event.preventDefault(); event.stopPropagation(); suppressClick.current = false; } }}
      onPointerCancel={() => { gesture.current = null; suppressClick.current = false; }} onLostPointerCapture={() => { gesture.current = null; }}>
      <defs>
        <linearGradient id={`${id}-paper`} x2="1" y2="1"><stop stopColor="#f8faf6"/><stop offset="1" stopColor="#edf1e8"/></linearGradient>
        <linearGradient id={`${id}-gold`} x1={vertical ? 0 : 1} y1="0" x2={vertical ? 1 : 0} y2="1"><stop stopColor="#f9ebbb"/><stop offset=".45" stopColor="#f4d36f"/><stop offset=".8" stopColor="#f8e7ac"/><stop offset="1" stopColor="#dbb654"/></linearGradient>
        <linearGradient id={`${id}-silver`} x2={vertical ? 1 : 0} y2={vertical ? 0 : 1}><stop stopColor="#edf0f1"/><stop offset=".5" stopColor="#d7e0e1"/><stop offset="1" stopColor="#bbc9cc"/></linearGradient>
        <pattern id={`${id}-weave`} width="5" height="5" patternUnits="userSpaceOnUse" patternTransform={`translate(${vertical ? 0 : along(0)} ${vertical ? along(0) : 0})`}>
          <path d="M0 1H5M1 0V5" stroke="#ffffff" strokeWidth=".65" opacity=".4"/>
        </pattern>
        <filter id={`${id}-shadow`} x="-80%" y="-40%" width="260%" height="200%"><feDropShadow dx="0" dy="5" stdDeviation="4" floodColor="#354235" floodOpacity=".13"/></filter>
        <clipPath id={`${id}-plot`}><rect x={left} y={top - 1} width={width - left - right} height={height - top - bottom + 2}/></clipPath>
      </defs>
      <rect width={width} height={height} fill={`url(#${id}-paper)`}/>
      <g clipPath={`url(#${id}-plot)`}>
        {ordered.map((lane, index) => {
          const band = rect(bounds.min, bounds.max, index);
          const earned = rect(0, lane.value, index);
          const intervals = visibleSessions(sessions, lane);
          return <g key={lane.id}>
            <rect {...band} rx={material === "ribbon" ? 8 : 2} fill={lane.you ? "#ece9d8" : "#e6ebe4"} opacity={lane.you ? .7 : .55}/>
            <rect {...earned} fill={`url(#${id}-${lane.you ? "gold" : "silver"})`} opacity={lane.you ? .85 : .65}/>
            {material === "tapestry" && intervals.map((session, i) => {
              const shape = rect(session.start, session.end, index);
              const extent = vertical ? shape.height : shape.width;
              const midpoint = point((Math.max(session.start, bounds.min) + Math.min(session.end, bounds.max)) / 2, index);
              return <g key={session.id} data-selectable="session" className="bl-session-mark" role="button" tabIndex={0}
                aria-label={`${lane.name}, ${session.title}, ${formatBoardValue(session.end - session.start, unit)} ${unit}. Open counted session.`}
                onClick={() => { onSelect(lane.id); onSession(session); }} onKeyDown={event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); event.stopPropagation(); onSelect(lane.id); onSession(session); } }}>
                <rect {...shape} fill={lane.you ? ["#c49d3d", "#fff8dc", "#f2bd35"][i % 3] : ["#bbc7cd", "#f6f8f9", "#bacbcb"][i % 3]} opacity=".2"/>
                <rect {...shape} fill={`url(#${id}-weave)`}/>
                {session.end >= bounds.min && session.end <= bounds.max && (vertical
                  ? <><line x1={shape.x} x2={shape.x + shape.width} y1={along(session.end)} y2={along(session.end)} stroke="#fafaf7" strokeWidth="3"/><line x1={shape.x + 5} x2={shape.x + shape.width - 5} y1={along(session.end) + 4} y2={along(session.end) + 4} stroke="#8b7952" strokeOpacity=".3" strokeDasharray="2 4"/></>
                  : <><line x1={along(session.end)} x2={along(session.end)} y1={shape.y} y2={shape.y + shape.height} stroke="#fafaf7" strokeWidth="3"/><line x1={along(session.end) - 4} x2={along(session.end) - 4} y1={shape.y + 5} y2={shape.y + shape.height - 5} stroke="#8b7952" strokeOpacity=".3" strokeDasharray="2 4"/></>)}
                {extent > (vertical ? 100 : 130) && <text className="bl-segment-value" x={midpoint.x} y={midpoint.y + (vertical ? 18 : 4)} textAnchor="middle">+{formatBoardValue(session.end - session.start, unit)} <tspan opacity=".65">{unit}</tspan></text>}
              </g>;
            })}
          </g>;
        })}
        {ticks.values.map(value => <g key={value} className="bl-ground-mark" data-value={value}>
          {vertical ? <line x1={left - 4} x2={width - right + 4} y1={along(value)} y2={along(value)} stroke="#b5bfb0" strokeOpacity=".48"/> : <line x1={along(value)} x2={along(value)} y1={top - 4} y2={height - bottom} stroke="#b5bfb0" strokeOpacity=".48"/>}
          {material === "ribbon" && Array.from({ length: 4 }, (_, i) => value + ticks.step * (i + 1) / 5).filter(v => v <= bounds.max).map(v => <g key={v}>{ordered.map((_, i) => vertical
            ? <line key={i} x1={cross(i) - laneWidth * .32} x2={cross(i) - laneWidth * .32 + 8} y1={along(v)} y2={along(v)} stroke="#7d8977" strokeOpacity=".55"/>
            : <line key={i} x1={along(v)} x2={along(v)} y1={cross(i) - laneWidth * .32} y2={cross(i) - laneWidth * .32 + 8} stroke="#7d8977" strokeOpacity=".55"/>)}</g>)}
        </g>)}
      </g>
      {!vertical && ticks.values.map(value => <text key={value} className="bl-axis-label" x={along(value)} y={top - 19} textAnchor="middle">{Number(value.toFixed(2))}</text>)}
      {!vertical && <text className="bl-axis-unit" x={width - 20} y={top - 19} textAnchor="end">{unit}</text>}
      {bounds.min <= 0 && bounds.max >= 0 && <text className="bl-axis-label" x={vertical ? left : along(0)} y={vertical ? along(0) - 10 : height - 15}>START</text>}
      {ordered.map((lane, index) => {
        const fraction = boardFraction(lane.value, view);
        const edge = fraction > 1 ? "ahead" : fraction < 0 ? "behind" : null;
        const pad = vertical ? 34 / length : 22 / length;
        const value = bounds.min + Math.max(pad, Math.min(1 - pad, fraction)) * bounds.span;
        const p = point(value, index);
        return <g key={lane.id}>
          <text className={`bl-lane-name ${lane.you ? "is-you" : ""}`} x={vertical ? cross(index) : left - 15} y={vertical ? 33 : cross(index) - 3} textAnchor={vertical ? "middle" : "end"}>{lane.you ? "YOU" : lane.name.split(" ")[0]}</text>
          <text className="bl-lane-total" x={vertical ? cross(index) : left - 15} y={vertical ? 53 : cross(index) + 16} textAnchor={vertical ? "middle" : "end"}>{formatBoardValue(lane.value, unit)} <tspan>{unit}</tspan></text>
          <g data-selectable="athlete" data-athlete={lane.id} className="bl-athlete-mark" role="button" tabIndex={0} aria-pressed={selected === lane.id}
            aria-label={`${lane.name}, ${formatBoardValue(lane.value, unit)} ${unit}${edge ? `, offscreen ${edge}` : ""}. ${boardGap(lane.value, you?.value ?? 0, unit)}`}
            onClick={() => onSelect(lane.id)} onKeyDown={event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); event.stopPropagation(); onSelect(lane.id); } }}>
            <rect x={p.x - 25} y={p.y - 33} width="50" height="66" rx="24" fill="transparent"/>
            {selected === lane.id && <ellipse cx={p.x} cy={p.y + 28} rx={vertical ? 26 : 21} ry="6" fill={lane.you ? "#d7b650" : "#9caeac"} opacity=".2"/>}
            <g filter={`url(#${id}-shadow)`} transform={vertical ? undefined : `rotate(90 ${p.x} ${p.y})`}><PolishedRacer x={p.x} y={p.y} you={Boolean(lane.you)} active={selected === lane.id} showWake={!edge} wakeBottom={vertical ? height - bottom - p.y : p.x - left}/></g>
            {edge && <g transform={`translate(${p.x} ${p.y + (vertical ? edge === "ahead" ? -40 : 43 : 41)})`}><rect x="-27" y="-12" width="54" height="22" rx="11" fill="#ffffff" stroke="#dce2d8"/><text textAnchor="middle" y="3" className="bl-edge-label">{vertical ? edge === "ahead" ? "↑" : "↓" : edge === "ahead" ? "→" : "←"} {formatBoardValue(lane.value, unit)}</text></g>}
          </g>
        </g>;
      })}
      {showGhost && ghost && you && boardFraction(ghost.value, view) >= 0 && boardFraction(ghost.value, view) <= 1 && (() => {
        const p = point(ghost.value, ordered.findIndex(l => l.you));
        return <g className="bl-ghost" aria-label={`Past you, ${formatBoardValue(ghost.value, unit)} ${unit}, unranked`}><rect x={p.x - 12} y={p.y - 18} width="24" height="36" rx="12" fill="#fafaf7" fillOpacity=".65" stroke="#8b9787" strokeDasharray="3 4"/><text x={p.x + (vertical ? 18 : 0)} y={p.y + (vertical ? 4 : 29)} textAnchor={vertical ? "start" : "middle"}>Past you</text></g>;
      })()}
    </svg>
  </div>
    {vertical && <svg className="bl-fixed-axis" width="42" height={height} aria-label={`Distance scale in ${unit}`}><rect width="42" height={height} fill="#f1f5eb" fillOpacity=".95"/><text className="bl-axis-unit" x="14" y={top - 23}>{unit}</text>{ticks.values.map(value => <g key={value}><line x1="0" x2="5" y1={along(value)} y2={along(value)} stroke="#b5bfb0"/><text className="bl-axis-label" x="14" y={along(value) + 4}>{Number(value.toFixed(2))}</text></g>)}</svg>}
    <span className="bl-board-caption">{material === "tapestry" ? "Counted sessions, woven into your week" : "One shared scale. Every little distance counts."}</span>
  </div>;
}
