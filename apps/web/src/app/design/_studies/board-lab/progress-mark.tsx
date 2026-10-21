import type { ProgressId } from "./field-directions";
import type { BoardSession } from "./model";
import { progressSamples, wakeBypass } from "./progress-path";

/** Shared paint for the unfolded field and closed oval. All endpoints encode the true total. */
export function ProgressMark({ treatment, from, to, total, clearance, shoulder, scale, point, path, spacing, color, pale, sessions, prefix, futureTo }: {
  treatment: ProgressId; from: number; to: number; total: number; clearance: number;
  shoulder: number; scale: number; spacing: number; color: string; pale: boolean;
  point: (d: number, offset?: number) => { x: number; y: number };
  path: (a: number, b: number, offset?: number) => string;
  sessions: BoardSession[]; prefix: string; futureTo: number;
}) {
  const tip = point(total, shoulder), ink = pale ? "#fff8e9" : color;
  const visible = to > from;
  const pattern = `${prefix}-unexplored`;
  return <g data-trace-kind={treatment}>
    {treatment === "dots" && visible && <>
      {progressSamples(from, to, spacing).map(d => {
        const p = point(d, wakeBypass(d, total, clearance, shoulder));
        return <g key={d} data-route-dot={d}><circle cx={p.x} cy={p.y} r={2.9 * scale} fill="none" stroke={pale ? "#34483f" : "#fafaf7"} strokeWidth={1.8 * scale} opacity=".28"/><circle cx={p.x} cy={p.y} r={2.5 * scale} fill={ink}/></g>;
      })}
    </>}
    {treatment === "cord" && visible && <>
      <path d={path(from, to, shoulder)} fill="none" stroke={pale ? "#263b31" : "#fafaf7"} strokeWidth={4.5 * scale} opacity=".18"/>
      <path d={path(from, to, shoulder)} fill="none" stroke={ink} strokeWidth={1.8 * scale} strokeLinecap="round"/>
      <path d={`M${tip.x} ${tip.y}L${point(total, shoulder * .55).x} ${point(total, shoulder * .55).y}`} fill="none" stroke={ink} strokeWidth={1.3 * scale}/>
    </>}
    {treatment === "tiles" && sessions.map(s => {
      const a = Math.max(s.start, from), b = Math.min(s.end, to);
      if (b <= a) return null;
      // Leave a seam only at an actual source boundary, never at a camera crop.
      const gap = Math.min(clearance * .035, (s.end - s.start) * .08);
      const begin = s.start > from ? a + gap : a, end = s.end < to ? b - gap : b;
      if (end <= begin) return null;
      return <g key={s.id} data-source-tile={s.id}>
        <path d={path(begin, end, shoulder)} fill="none" stroke={ink} strokeWidth={12 * scale} strokeLinecap="round" opacity=".25"/>
        <path d={path(begin, end, shoulder)} fill="none" stroke={ink} strokeWidth={8 * scale} strokeLinecap="round" opacity=".75"/>
      </g>;
    })}
    {treatment === "reveal" && <>
      <defs><pattern id={pattern} width={9 * scale} height={9 * scale} patternUnits="userSpaceOnUse"><path d={`M0 ${9 * scale}L${9 * scale} 0`} stroke={color} strokeWidth={.8 * scale} opacity=".22"/></pattern></defs>
      <path d={path(from, futureTo, shoulder)} fill="none" stroke={`url(#${pattern})`} strokeWidth={18 * scale}/>
      {visible && <>
        <path d={path(from, to, shoulder)} fill="none" stroke={pale ? "#f3e8bc" : "#d4dfbc"} strokeWidth={18 * scale} strokeLinecap="round" opacity=".75"/>
        <path d={path(from, to, shoulder)} fill="none" stroke={pale ? "#fff8e9" : "#f6f7e8"} strokeWidth={12 * scale} strokeLinecap="round" opacity=".75"/>
      </>}
    </>}
    {treatment !== "deposit" && (treatment !== "tiles" || sessions.length > 0) && <g data-progress-end={total} transform={`translate(${tip.x} ${tip.y})`}>
      <circle r={treatment === "cord" ? 5 * scale : 3.5 * scale} fill={pale ? "#4b6050" : "#fafaf7"} stroke={ink} strokeWidth={1.8 * scale}/>
    </g>}
  </g>;
}
