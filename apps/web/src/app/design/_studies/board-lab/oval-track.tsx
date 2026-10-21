"use client";

import { useId, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { orderedArenaLanes, polishedCapsulePath, polishedLaneScale, type ArenaSceneLane } from "@fitness-battle/shared";
import { PolishedRacer, usePolishedWakeTime } from "@/features/brand/polished-racer";
import type { Board2DProps } from "./board-2d";
import { lapPosition, ovalArc, ovalPath, ovalPoint, ovalOffsetPoint } from "./oval-geometry";
import { visibleSessions } from "./model";
import { ProgressMark } from "./progress-mark";

/** Closed-circuit alternative. Accumulated totals remain authoritative; position is modulo 1 km. */
export function OvalTrack({ lanes, sessions, view, selected, showGhost, progress, zoom: lens, wake = "blend", material = "enamel", expanded, loopUnit = "km", edges = "club", onSelect, onSession }: Board2DProps) {
  const host = useRef<HTMLDivElement>(null), id = useId().replaceAll(":", "");
  const [size, setSize] = useState({ width: 720, height: 510 });
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; origin: typeof offset; moved: boolean } | null>(null);
  const suppress = useRef(false);
  const ordered = orderedArenaLanes(lanes), count = ordered.length;
  const laneWidth = 32, inner = 120, outer = inner + count * laneWidth;
  const straight = 270, worldW = (outer + 65) * 2, worldH = outer * 2 + straight + 100;
  const fit = Math.min((size.width - 24) / worldW, (size.height - 24) / worldH);
  const zoom = 6 / Math.max(2, view.span), scale = fit * zoom;
  const self = ordered.find(l => l.you)!, person = ordered.find(l => l.id === selected) ?? self;
  const lapLength = loopUnit === "mi" ? 1.609344 : 1;
  const position = (value: number) => lapPosition(value, lapLength);
  const summary = position(person.value);
  const selectedIndex = ordered.indexOf(person), focus = ovalPoint(position(view.center).fraction, inner + (selectedIndex + .5) * laneWidth, straight);
  const focusAmount = Math.max(0, 1 - 1 / zoom);
  const tx = size.width / 2 - focus.x * scale * focusAmount + offset.x;
  const ty = size.height / 2 - focus.y * scale * focusAmount + offset.y;
  const markerScale = .62 * (lens === "atlas" ? Math.max(1, (1 / zoom) ** .28) : 1);
  const radius = (i: number) => inner + (i + .5) * laneWidth;
  useLayoutEffect(() => {
    const el = host.current; if (!el) return;
    const measure = () => setSize({ width: el.clientWidth, height: el.clientHeight }); measure();
    const observer = new ResizeObserver(measure); observer.observe(el); return () => observer.disconnect();
  }, []);
  useLayoutEffect(() => setOffset({ x: 0, y: 0 }), [view.center, view.span]);

  return <div ref={host} className="bl-board-viewport bl-oval-viewport" data-background="oval" data-progress={progress} data-zoom={lens}>
    <svg className="bl-oval-svg" width={size.width} height={size.height} role="group" tabIndex={0} aria-label={`Club Oval. Each loop represents one ${loopUnit === "mi" ? "mile" : "kilometer"}. Position repeats; totals and lap counts show accumulated distance.`}
      style={{ touchAction: expanded ? "none" : "pan-y" }}
      onKeyDown={e => { const moves: Record<string, number[]> = { ArrowLeft: [35, 0], ArrowRight: [-35, 0], ArrowUp: [0, 35], ArrowDown: [0, -35] }; const delta = moves[e.key]; if (delta) { e.preventDefault(); setOffset(o => ({ x: o.x + delta[0]!, y: o.y + delta[1]! })); } }}
      onPointerDown={e => { suppress.current = false; if ((e.pointerType === "touch" && !expanded) || !e.isPrimary || e.button !== 0) return; drag.current = { x: e.clientX, y: e.clientY, origin: offset, moved: false }; }}
      onPointerMove={e => { const d = drag.current; if (!d) return; if (!d.moved && Math.hypot(e.clientX - d.x, e.clientY - d.y) < 5) return; d.moved = true; e.currentTarget.setPointerCapture(e.pointerId); setOffset({ x: d.origin.x + e.clientX - d.x, y: d.origin.y + e.clientY - d.y }); }}
      onPointerUp={() => { suppress.current = Boolean(drag.current?.moved); drag.current = null; }}
      onPointerCancel={() => { drag.current = null; suppress.current = false; }}
      onLostPointerCapture={() => { drag.current = null; }}
      onClickCapture={e => { if (suppress.current) { e.preventDefault(); e.stopPropagation(); suppress.current = false; } }}>
      <rect width={size.width} height={size.height} fill="#f6f7f2"/>
      <g transform={`translate(${tx} ${ty}) scale(${scale})`} data-oval-world="" data-world-scale={scale}>
        <defs>
          <pattern id={`${id}-rubber`} width="9" height="11" patternUnits="userSpaceOnUse"><rect width="9" height="11" fill="#ac5147"/><circle cx="2" cy="3" r=".7" fill="#713e36" opacity=".22"/><circle cx="6" cy="8" r=".6" fill="#e58e76" opacity=".3"/></pattern>
          <mask id={`${id}-clear`} data-progress-mask="heads-only" maskUnits="userSpaceOnUse" x={-outer - 50} y={-outer - straight / 2 - 50} width={outer * 2 + 100} height={outer * 2 + straight + 100} style={{ maskType: "luminance" }}>
            <rect x={-outer - 50} y={-outer - straight / 2 - 50} width={outer * 2 + 100} height={outer * 2 + straight + 100} fill="white"/>
            {ordered.map((l, i) => { const p = ovalPoint(position(l.value).fraction, radius(i), straight); return <path key={l.id} data-head-exclusion={l.id} d={polishedCapsulePath(-1.5)} transform={`translate(${p.x} ${p.y}) rotate(${p.angle}) scale(${markerScale * polishedLaneScale(Boolean(l.you))})`} fill="black"/>; })}
          </mask>
        </defs>
        <path d={ovalPath(outer + 35, straight)} fill={edges === "club" ? "#cad5b0" : "#eeeee5"}/>
        <path d={ovalPath(outer, straight)} fill={`url(#${id}-rubber)`}/>
        <path d={ovalPath(inner, straight)} fill={edges === "club" ? "#afc38e" : "#f6f7f2"} stroke="#f8f3df" strokeWidth="3"/>
        {edges === "club" && <g pointerEvents="none">
          <rect x={-inner + 20} y="-150" width={(inner - 20) * 2} height="300" rx="2" fill="none" stroke="#dce6c7" strokeWidth="1.5"/>
          <path d={`M${-inner + 20} 0H${inner - 20}`} stroke="#dce6c7" strokeWidth="1.5"/><circle r="35" fill="none" stroke="#dce6c7" strokeWidth="1.5"/>
          {[-100, 0, 100].map(y => <g key={y} transform={`translate(${outer + 22} ${y})`}><rect x="-6" y="-22" width="12" height="44" rx="3" fill="#968467"/><path d="M-2-18V18M2-18V18" stroke="#d6c7a6" strokeWidth="2"/></g>)}
        </g>}
        {Array.from({ length: count + 1 }, (_, i) => <path key={i} d={ovalPath(inner + i * laneWidth, straight)} fill="none" stroke="#fff7e9" strokeWidth="2"/>)}
        <g data-oval-start=""><path d={`M${inner} ${straight / 2}H${outer}`} stroke="#fff7e9" strokeWidth="5"/>
          {ordered.map((l, i) => <text data-start-number={i + 1} key={l.id} x={radius(i)} y={straight / 2 + 27} textAnchor="middle" fill="#fff7e9" fontSize="23" fontWeight="650">{i + 1}</text>)}
          <text x={outer + 12} y={straight / 2 + 7} fill="#536048" fontSize="12" transform={`rotate(90 ${outer + 12} ${straight / 2 + 7})`}>START / 1 {loopUnit.toUpperCase()} LOOP</text>
        </g>
        <g className="bl-oval-progress" mask={`url(#${id}-clear)`} pointerEvents="none">
          {ordered.map((l, i) => {
            const r = radius(i), lap = position(l.value);
            const perimeter = 2 * straight + 2 * Math.PI * r;
            const known = visibleSessions(sessions, l).filter(s => s.end > lap.laps * lapLength && s.start < l.value);
            return <g key={l.id} data-oval-progress-athlete={l.id}>
              <ProgressMark treatment={progress} material={material} you={Boolean(l.you)} from={lap.laps * lapLength} to={l.value} total={l.value} clearance={104 * markerScale / perimeter * lapLength}
                scale={markerScale} spacing={lapLength / 50} wake={wake}
                point={(d, offset = 0) => ovalOffsetPoint(d / lapLength, r, offset, straight)}
                path={(a, b, offset = 0) => ovalArc(a / lapLength, b / lapLength, r, straight, offset)}
                sessions={known}/>
            </g>;
          })}
        </g>
        <g pointerEvents="none" fill="#3f5137" textAnchor="middle"><text y="-32" fontSize="11" letterSpacing="2">ONE LOOP / 1 {loopUnit.toUpperCase()}</text><text y="-5" fontSize="23" fontWeight="650">{person.you ? "You" : person.name}</text><text y="23" fontSize="19">{summary.laps} laps + {loopUnit === "mi" ? `${summary.fraction.toFixed(2)} mi` : `${Math.round(summary.fraction * 1000)} m`}</text><text y="47" fontSize="12">{person.value.toFixed(1)} km total</text></g>
        {showGhost && lanes.filter(l => l.ghost).map(l => { const p = ovalPoint(position(l.value).fraction, radius(ordered.findIndex(a => a.you)), straight); return <g key={l.id} transform={`translate(${p.x} ${p.y}) rotate(${p.angle})`}><rect x="-9" y="-14" width="18" height="28" rx="9" fill="#f6f7f2" fillOpacity=".65" stroke="#596b4d" strokeDasharray="3 3"/><title>Past you · {l.value.toFixed(1)} km · unranked</title></g>; })}
        <OvalRacers lapLength={lapLength} host={host} lanes={ordered} radius={radius} straight={straight} scale={scale} markerScale={markerScale} selected={selected} onSelect={onSelect}/>
      </g>
    </svg>
    <div className="bl-oval-note"><span>1 loop = 1 {loopUnit} · position repeats, totals don’t</span><button type="button" onClick={() => { const s = visibleSessions(sessions, person).at(-1); if (s) onSession(s); }}>Latest session ↗</button></div>
  </div>;
}

/** Keep the static ground and progress out of the canonical 30 fps wake clock. */
function OvalRacers({ host, lanes, lapLength, radius, straight, scale, markerScale, selected, onSelect }: {
  host: RefObject<HTMLDivElement | null>; lanes: ArenaSceneLane[]; radius: (i: number) => number;
  lapLength: number; straight: number; scale: number; markerScale: number; selected: string; onSelect: (id: string) => void;
}) {
  const time = usePolishedWakeTime(host);
  return <g className="bl-oval-racers">        {lanes.map((l, i) => {
          const lap = lapPosition(l.value, lapLength), p = ovalPoint(lap.fraction, radius(i), straight), hit = Math.max(44 / scale, 38);
          return <g key={l.id} data-athlete={l.id} data-laps={lap.laps} data-lap-fraction={lap.fraction} role="button" tabIndex={0} aria-pressed={selected === l.id}
            aria-label={`${l.name}, ${l.value.toFixed(1)} km total, ${lap.laps} laps and ${Math.round(lap.fraction * lapLength * 1000)} meters. Select athlete.`}
            onClick={() => onSelect(l.id)} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); onSelect(l.id); } }}>
            <rect x={p.x - hit / 2} y={p.y - hit / 2} width={hit} height={hit} rx="20" fill="transparent"/>
            <g transform={`translate(${p.x} ${p.y}) rotate(${p.angle}) scale(${markerScale})`}><PolishedRacer x={0} y={0} you={Boolean(l.you)} active={l.id === selected} time={time}/></g>
          </g>;
        })}</g>;
}
