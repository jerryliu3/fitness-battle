import type { ProgressId, WakeId } from "./field-directions";
import { useId } from "react";
import type { BoardSession } from "./model";
import { progressSamples, traceOpacity, traceSegments } from "./progress-path";
import { trailPalette, type TrailMaterialId } from "./trail-materials";

/** Shape, material and wake composition are independent; geometry stays on the centerline. */
export function ProgressMark({ treatment, material, you, from, to, total, clearance, scale: s, point, path, spacing, sessions, wake }: {
  treatment: ProgressId; material: TrailMaterialId; you: boolean; from: number; to: number; total: number; clearance: number;
  scale: number; spacing: number; wake: WakeId;
  point: (d: number, offset?: number) => { x: number; y: number };
  path: (a: number, b: number) => string; sessions: BoardSession[];
}) {
  const id = useId().replaceAll(":", ""), m = trailPalette(material, you);
  const tip = point(total), tail = point(total - clearance);
  const radius = Math.max(10 * s, Math.hypot(tip.x - tail.x, tip.y - tail.y));
  const pieces = traceSegments(from, to, spacing / 2);
  const values = pieces.length ? [...pieces.map(piece => piece.from), pieces.at(-1)!.to] : [];
  const coordinates = values.length ? values.map(d => point(d)) : [tip];
  const pad = 24 * s + 2;
  const x = Math.min(...coordinates.map(p => p.x)) - pad, y = Math.min(...coordinates.map(p => p.y)) - pad;
  const width = Math.max(...coordinates.map(p => p.x)) - x + pad, height = Math.max(...coordinates.map(p => p.y)) - y + pad;
  const stroke = (d: string, color: string, w: number, opacity = 1, transform?: string, filter?: string) => <path d={d} fill="none" stroke={color} strokeWidth={w * s} strokeLinecap="round" strokeLinejoin="round" opacity={opacity} transform={transform} filter={filter}/>;
  function paintedLine(d: string, w: number) {
    return <>
      {(material === "rubber" || material === "glass") && stroke(d, m.shadow, w + 2.4, material === "rubber" ? .4 : .23, `translate(0 ${material === "rubber" ? 2 * s : 1.2 * s})`)}
      {material === "neon" && stroke(d, m.glow, w + 7, .38, undefined, `url(#${id}-glow)`)}
      {material === "inlay" && stroke(d, m.rim, w + 3.4)}
      {stroke(d, material === "enamel" || material === "neon" ? m.rim : m.edge, w + 2)}
      {stroke(d, m.core, material === "inlay" ? Math.max(1, w - 1.6) : w)}
      {material === "rubber" && stroke(d, m.highlight, w * .48, .3, `translate(${-s * .6} 0)`)}
      {material === "neon" && stroke(d, m.highlight, 1, .8)}
      {material === "glass" && <>{stroke(d, m.highlight, 3, .18)}{stroke(d, m.highlight, 1.1, .85, `translate(${-s * .55} ${-s * .6})`)}</>}
    </>;
  }
  const ribbonSide = (d: number, side: number) => {
    const half = 4 * s * Math.min(1, Math.max(0, total - d) / Math.max(.000001, clearance * .75));
    const p = point(d, side * half); return `${p.x.toFixed(3)} ${p.y.toFixed(3)}`;
  };
  const ribbon = values.length ? `M${values.map(d => ribbonSide(d, -1)).join("L")}L${[...values].reverse().map(d => ribbonSide(d, 1)).join("L")}Z` : "";

  return <g data-trace-kind={treatment} data-trail-material={material} data-trace-alignment="center" data-wake-treatment={wake}>
    <defs>
      <radialGradient id={`${id}-wake`} gradientUnits="userSpaceOnUse" cx={tip.x} cy={tip.y} r={radius}>
        {[0, .25, .5, .75, 1].map(t => { const alpha = traceOpacity(total - clearance * t, total, clearance, wake); return <stop key={t} offset={t} stopColor="white" stopOpacity={wake === "blend" ? Math.min(1, alpha * 1.72) : alpha}/>; })}
      </radialGradient>
      <mask id={`${id}-material-fade`} maskUnits="userSpaceOnUse" x={x} y={y} width={width} height={height} style={{ maskType: "luminance" }}><rect x={x} y={y} width={width} height={height} fill={`url(#${id}-wake)`}/></mask>
      <radialGradient id={`${id}-bead`} cx=".28" cy=".22" r=".85"><stop stopColor={m.highlight}/><stop offset=".4" stopColor={m.core}/><stop offset="1" stopColor={m.edge}/></radialGradient>
      {material === "neon" && <filter id={`${id}-glow`} filterUnits="userSpaceOnUse" x={x} y={y} width={width} height={height}><feGaussianBlur stdDeviation={1.8 * s}/></filter>}
    </defs>
    <g data-progress-end={total} transform={`translate(${tip.x} ${tip.y})`}/>
    <g data-material-paint="" mask={`url(#${id}-material-fade)`}>
      {treatment === "dots" && <>
        {to > from && stroke(path(from, to), m.core, .8, .2)}
        {progressSamples(from, to, spacing).map(d => {
          const p = point(d), r = 3.1 * s;
          return <g key={d}>
            {(material === "rubber" || material === "glass") && <circle cx={p.x} cy={p.y + (material === "rubber" ? 2 : 1.2) * s} r={r + .6 * s} fill={m.shadow} opacity={material === "rubber" ? .65 : .25}/>}
            {material === "neon" && <circle cx={p.x} cy={p.y} r={r + 2 * s} fill={m.glow} opacity=".55" filter={`url(#${id}-glow)`}/>}
            {material === "inlay" && <><circle cx={p.x} cy={p.y} r={r + 1.4 * s} fill={m.rim}/><circle cx={p.x} cy={p.y} r={r + .9 * s} fill={m.edge}/></>}
            <circle data-route-dot={d} cx={p.x} cy={p.y} r={material === "inlay" ? r - .8 * s : r} fill={material === "glass" ? `url(#${id}-bead)` : m.core} stroke={material === "enamel" || material === "neon" ? m.rim : m.edge} strokeWidth={material === "inlay" ? 0 : 1.1 * s}/>
            {material === "rubber" && <path d={`M${p.x - 1.5 * s} ${p.y - s}q${1.5 * s} ${-1.4 * s} ${3 * s} 0`} fill="none" stroke={m.highlight} strokeWidth={s} strokeLinecap="round"/>}
            {material === "neon" && <circle cx={p.x} cy={p.y} r={.9 * s} fill={m.highlight}/>}
            {material === "glass" && <ellipse cx={p.x - .8 * s} cy={p.y - 1.2 * s} rx={1.1 * s} ry={.55 * s} fill={m.highlight} opacity=".9"/>}
          </g>;
        })}
      </>}
      {treatment === "deposit" && ribbon && <>
        {(material === "rubber" || material === "glass") && <path d={ribbon} fill={m.shadow} stroke={m.shadow} strokeWidth={1.4 * s} opacity={material === "rubber" ? .45 : .23} transform={`translate(0 ${material === "rubber" ? 2 * s : 1.2 * s})`}/>}
        {material === "neon" && <path d={ribbon} fill={m.glow} stroke={m.glow} strokeWidth={5 * s} opacity=".38" filter={`url(#${id}-glow)`}/>}
        {material === "inlay" && <path d={ribbon} fill={m.edge} stroke={m.rim} strokeWidth={3.4 * s} strokeLinejoin="round"/>}
        <path d={ribbon} fill={m.core} stroke={material === "enamel" || material === "neon" ? m.rim : m.edge} strokeWidth={(material === "inlay" ? 1.8 : 1.1) * s} strokeLinejoin="round"/>
        {material === "rubber" && <path d={ribbon} fill="none" stroke={m.highlight} strokeWidth={.6 * s} opacity=".6"/>}
        {material === "neon" && stroke(path(from, to), m.highlight, 1, .75)}
        {material === "glass" && stroke(path(from, to), m.highlight, 1.2, .9, `translate(${-s * .6} ${-s * .6})`)}
      </>}
      {treatment === "tiles" && sessions.map(session => {
        const a = Math.max(session.start, from), b = Math.min(session.end, to);
        if (b <= a) return null;
        const gap = Math.min(clearance * .065, (session.end - session.start) * .12);
        const begin = session.start > from ? a + gap : a, end = session.end < to ? b - gap : b;
        if (end <= begin) return null;
        return <g key={session.id} data-source-tile={session.id}>{paintedLine(path(begin, end), 6.5)}</g>;
      })}
    </g>
  </g>;
}
