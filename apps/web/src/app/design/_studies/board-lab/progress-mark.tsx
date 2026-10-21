import type { ProgressId, WakeId } from "./field-directions";
import { useId } from "react";
import type { BoardSession } from "./model";
import { progressSamples, traceOpacity, traceSegments } from "./progress-path";

/** All three traces follow the racer’s centerline and are painted before the capsule/wake. */
export function ProgressMark({ treatment, from, to, total, clearance, scale, point, path, spacing, color, pale, sessions, wake }: {
  treatment: ProgressId; from: number; to: number; total: number; clearance: number;
  scale: number; spacing: number; color: string; pale: boolean; wake: WakeId;
  point: (d: number, offset?: number) => { x: number; y: number };
  path: (a: number, b: number) => string; sessions: BoardSession[];
}) {
  const id = useId().replaceAll(":", ""), gradient = `${id}-wake-blend`;
  const ink = pale ? "#fff8e9" : color, tip = point(total), tail = point(total - clearance);
  const radius = Math.max(10 * scale, Math.hypot(tip.x - tail.x, tip.y - tail.y));
  const paint = `url(#${gradient})`;
  const pieces = traceSegments(from, to, spacing / 2);
  return <g data-trace-kind={treatment} data-trace-alignment="center" data-wake-treatment={wake}>
    <defs><radialGradient id={gradient} gradientUnits="userSpaceOnUse" cx={tip.x} cy={tip.y} r={radius}>
      {[0, .25, .5, .75, 1].map(t => <stop key={t} offset={t} stopColor={treatment === "deposit" ? color : ink} stopOpacity={traceOpacity(total - clearance * t, total, clearance, wake)}/>)}
    </radialGradient></defs>
    {/* A geometry anchor, with no visible waypoint or endpoint ornament. */}
    <g data-progress-end={total} transform={`translate(${tip.x} ${tip.y})`}/>
    {treatment === "dots" && <>
      {to > from && <path d={path(from, to)} fill="none" stroke={paint} strokeWidth={.8 * scale} opacity=".22"/>}
      {progressSamples(from, to, spacing).map(d => {
        const p = point(d);
        return <circle key={d} data-route-dot={d} cx={p.x} cy={p.y} r={2.5 * scale} fill={paint}/>;
      })}
    </>}
    {treatment === "deposit" && pieces.length > 0 && (() => {
      const side = (d: number, direction: number) => {
        const half = 4 * scale * Math.min(1, Math.max(0, total - d) / Math.max(.000001, clearance * .75));
        const p = point(d, direction * half); return `${p.x.toFixed(3)} ${p.y.toFixed(3)}`;
      };
      const values = [...pieces.map(s => s.from), pieces.at(-1)!.to];
      return <path d={`M${values.map(d => side(d, -1)).join("L")}L${values.reverse().map(d => side(d, 1)).join("L")}Z`} fill={paint}/>;
    })()}
    {treatment === "tiles" && sessions.map(s => {
      const a = Math.max(s.start, from), b = Math.min(s.end, to);
      if (b <= a) return null;
      // Source boundaries get seams; cropping the camera never creates a new session.
      const gap = Math.min(clearance * .04, (s.end - s.start) * .08);
      const begin = s.start > from ? a + gap : a, end = s.end < to ? b - gap : b;
      if (end <= begin) return null;
      return <g key={s.id} data-source-tile={s.id}>
        <path d={path(begin, end)} fill="none" stroke={paint} strokeWidth={9 * scale} strokeLinecap="round" opacity=".18"/>
        <path d={path(begin, end)} fill="none" stroke={paint} strokeWidth={5 * scale} strokeLinecap="round" opacity=".8"/>
      </g>;
    })}
  </g>;
}
