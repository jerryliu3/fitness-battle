import type { ArenaSceneLane, ArenaViewWindow } from "@fitness-battle/shared";
import { arenaWindow } from "@fitness-battle/shared";
import type { ProgressId, WakeId } from "./field-directions";
import { formatBoardValue, progressClearance, visibleSessions, type BoardSession } from "./model";
import type { FieldGeometry } from "./track-background";
import { ProgressMark } from "./progress-mark";

export function ProgressTraces({ treatment, lanes, sessions, geometry: g, view, mask, lightInk, wake, onSession, onSelect }: {
  treatment: ProgressId; lanes: ArenaSceneLane[]; sessions: BoardSession[]; geometry: FieldGeometry;
  view: ArenaViewWindow; mask: string; lightInk: boolean; wake: WakeId;
  onSession: (s: BoardSession) => void; onSelect: (id: string) => void;
}) {
  const bounds = arenaWindow(view.center, view.span);
  return <>
    <g className="bl-progress-paint" mask={`url(#${mask})`} pointerEvents="none" data-progress={treatment}>
      {lanes.map((lane, index) => {
        const color = lane.you ? lightInk ? "#f4ce63" : "#b58a25" : lightInk ? "#d2e0de" : "#607970";
        const from = Math.max(0, bounds.min), to = Math.min(lane.value, bounds.max);
        const base = Math.max(.5, g.worldScale), clearance = progressClearance(g.markerScale) / g.length * view.span;
        return <g key={lane.id} data-progress-athlete={lane.id}>
          <ProgressMark treatment={treatment} from={from} to={to} total={lane.value} clearance={clearance} scale={base} spacing={.2} color={color} pale={lightInk} wake={wake}
            point={(d, offset = 0) => { const p = g.point(d, index); return { x: p.x + offset, y: p.y }; }} path={(a, b, offset = 0) => g.path(a, b, index, offset)}
            sessions={visibleSessions(sessions, lane)}/>
        </g>;
      })}
    </g>
    {/* Source-session inspection remains independent of the selected paint treatment. */}
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
