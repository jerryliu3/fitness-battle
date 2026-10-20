import type { ArenaSceneLane, ArenaViewWindow } from "@fitness-battle/shared";
import { arenaWindow } from "@fitness-battle/shared";
import type { ProgressId } from "./field-directions";
import { fieldSamples, formatBoardValue, progressClearance, visibleSessions, type BoardSession } from "./model";
import type { FieldGeometry } from "./track-background";

export function ProgressTraces({ treatment, lanes, sessions, geometry: g, view, mask, dark, selected, onSession, onSelect }: {
  treatment: ProgressId; lanes: ArenaSceneLane[]; sessions: BoardSession[]; geometry: FieldGeometry;
  view: ArenaViewWindow; mask: string; dark: boolean; selected: string;
  onSession: (s: BoardSession) => void; onSelect: (id: string) => void;
}) {
  const bounds = arenaWindow(view.center, view.span);
  return <>
    <g className="bl-progress-paint" mask={`url(#${mask})`} pointerEvents="none" data-progress={treatment}>
      {lanes.map((lane, index) => {
        const color = lane.you ? dark ? "#f4ce63" : "#c49a31" : dark ? "#bed3d8" : "#8da5aa";
        const from = Math.max(0, bounds.min), to = Math.min(lane.value, bounds.max);
        if (to <= from) return null;
        const halfHead = 20 * (lane.you ? .89 : .73) * g.markerScale;
        const offset = Math.max(g.laneWidth * .34, halfHead + 5 * g.worldScale);
        const known = visibleSessions(sessions, lane);
        const sourceKnots = known.filter(s => s.end >= bounds.min && s.end <= bounds.max);
        const base = Math.max(.6, g.worldScale);
        return <g key={lane.id} data-progress-athlete={lane.id}>
          {treatment === "rails" && [-1, 1].map(side => <g key={side}>
            <path d={g.path(from, to, index, side * offset)} stroke={color} strokeWidth={6 * base} strokeOpacity=".12" fill="none" strokeLinecap="round"/>
            <path d={g.path(from, to, index, side * offset)} stroke={color} strokeWidth={2.4 * base} strokeOpacity={lane.you ? .9 : .65} fill="none" strokeLinecap="round"/>
          </g>)}
          {treatment === "thread" && <>
            <path d={g.path(from, to, index, -offset)} fill="none" stroke={color} strokeWidth={1.6 * base} strokeLinecap="round" opacity=".75"/>
            {sourceKnots.map(s => { const p = g.point(s.end, index); return <g key={s.id} transform={`translate(${p.x - offset} ${p.y})`}><circle r={4.8 * base} fill={color}/><circle r={2 * base} fill={dark ? "#2e4037" : "#fafaf7"}/></g>; })}
          </>}
          {treatment === "footsteps" && fieldSamples(view, 1).filter(d => d > 0 && d <= lane.value).map(d => {
            const p = g.point(d, index), x = p.x + offset;
            return <g key={d} transform={`translate(${x} ${p.y}) scale(${Math.max(.4, g.worldScale)})`} opacity={lane.you ? .8 : .55}>
              <ellipse cx="-4" cy="-4" rx="2.3" ry="5" transform="rotate(-12)" fill={color}/><ellipse cx="4" cy="5" rx="2.3" ry="5" transform="rotate(12)" fill={color}/>
            </g>;
          })}
          {treatment === "deposit" && (() => {
            const depositedTo = lane.value - progressClearance(g.markerScale) / g.length * view.span;
            if (depositedTo <= from) return null;
            const end = Math.min(depositedTo, to);
            const sides = [-1, 1].map(side => Array.from({ length: 19 }, (_, n) => {
              const d = from + (end - from) * n / 18, p = g.point(d, index);
              const half = 4 * base * Math.min(1, (end - d) / Math.max(.001, view.span * .14));
              return `${(p.x + side * half).toFixed(2)} ${p.y.toFixed(2)}`;
            }));
            return <path d={`M${sides[0]!.join("L")}L${sides[1]!.reverse().join("L")}Z`} fill={color} opacity=".46"/>;
          })()}
          {treatment === "receipts" && known.map(s => {
            const d = (Math.max(s.start, bounds.min) + Math.min(s.end, bounds.max)) / 2;
            if (s.end < bounds.min || s.start > bounds.max) return null;
            if (d < bounds.min || d > bounds.max) return null;
            const p = g.point(d, index), scale = Math.max(.4, Math.min(1, g.worldScale));
            return <g key={s.id} transform={`translate(${p.x - offset} ${p.y}) scale(${scale})`}>
              <rect x="-17" y="-12" width="34" height="24" rx="8" fill={lane.you ? dark ? "#695b2c" : "#f7ebbd" : dark ? "#435d5d" : "#e4eded"} stroke={color} strokeOpacity=".45"/>
              <text x="0" y="3" textAnchor="middle" fontSize="10" fill={dark ? "#f8f7e8" : "#695c34"}>+{formatBoardValue(s.end - s.start, "km")}</text>
            </g>;
          })}
          {lane.id === selected && treatment === "footsteps" && <title>{Math.floor(lane.value)} whole kilometers crossed</title>}
        </g>;
      })}
    </g>
    {/* Data hit regions stay independent of paint: transparent ground never becomes a fake bar. */}
    {lanes.flatMap((lane, i) => visibleSessions(sessions, lane).map(s => {
      const start = Math.max(bounds.min, s.start), end = Math.min(bounds.max, s.end);
      if (end <= start) return null;
      const p = g.point((start + end) / 2, i);
      return <g key={s.id} data-selectable="session" className="bl-session-mark" role="button" tabIndex={0}
        aria-label={`${lane.name}, ${s.title}, ${formatBoardValue(s.end - s.start, "km")} km. Open counted session.`}
        onClick={() => { onSelect(lane.id); onSession(s); }} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); onSelect(lane.id); onSession(s); } }}>
        <rect x={p.x - g.laneWidth * .43} y={g.along(end)} width={g.laneWidth * .86} height={Math.max(1, g.along(start) - g.along(end))} fill="transparent"/>
      </g>;
    }))}
  </>;
}
