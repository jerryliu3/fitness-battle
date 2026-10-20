import { backgrounds, type BackgroundId, type TrackEdgeId } from "./field-directions";
import { fieldSamples } from "./model";
import type { ArenaViewWindow } from "@fitness-battle/shared";

export interface FieldGeometry {
  width: number; height: number; left: number; fieldWidth: number; top: number; bottom: number;
  length: number; laneWidth: number; worldScale: number; markerScale: number;
  along: (value: number) => number;
  cross: (index: number) => number;
  drift: (value: number) => number;
  point: (value: number, index: number) => { x: number; y: number };
  path: (from: number, to: number, index: number, offset?: number) => string;
}

/** Distance-fixed scenery only. No viewport-relative grid and no fractional horizontal rules. */
export function TrackBackground({ background, geometry: g, count, view, prefix, edges = "club" }: {
  background: BackgroundId; geometry: FieldGeometry; count: number; view: ArenaViewWindow; prefix: string; edges?: TrackEdgeId;
}) {
  const palette = backgrounds[background], z = g.worldScale;
  const samples = fieldSamples(view, .5, 60), whole = fieldSamples(view, 1, 45);
  const indices = Array.from({ length: count }, (_, i) => i);
  const rand = (d: number) => { const x = Math.sin(d * 91.7 + 7.3) * 4353.1; return x - Math.floor(x); };
  const middle = g.left + g.fieldWidth / 2;
  const isTrack = background === "straight" || background === "oval";
  const isScenic = background === "parkland" || background === "trail";
  return <g className="bl-world-ground" pointerEvents="none" data-background={background}>
    <defs>
      <linearGradient id={`${prefix}-surface`} x2="1" y2="1"><stop stopColor={palette.surface}/><stop offset="1" stopColor={palette.lane}/></linearGradient>
      <pattern id={`${prefix}-rubber`} width={11 * z} height={13 * z} patternUnits="userSpaceOnUse" y={g.along(0)}><circle cx={3 * z} cy={4 * z} r={.6 * z} fill="#713e36" opacity=".22"/><circle cx={8 * z} cy={10 * z} r={.5 * z} fill="#f5ad8f" opacity=".22"/></pattern>
      <radialGradient id={`${prefix}-lamp`}><stop stopColor="#e5d698" stopOpacity=".24"/><stop offset="1" stopColor="#e5d698" stopOpacity="0"/></radialGradient>
    </defs>
    <rect x={g.left - 30 * z} y={g.top} width={g.fieldWidth + 60 * z} height={g.length} rx={12 * z} fill={isScenic ? "#dfe7d2" : background === "road" ? "#dce3d4" : isTrack ? edges === "club" ? "#b7c79b" : "#f6f7f2" : palette.surface}/>
    {isScenic ? <path d={g.path(view.center - view.span / 2 - 1, view.center + view.span / 2 + 1, (count - 1) / 2)} fill="none" stroke={palette.lane} strokeWidth={g.fieldWidth - 14 * z}/>
      : <rect x={g.left} y={g.top} width={g.fieldWidth} height={g.length} fill={`url(#${prefix}-surface)`}/>}
    {indices.map(i => {
      const x = g.cross(i), half = g.laneWidth / 2;
      return <g key={i}>
        {background === "athletics" && <>
          <rect x={x - half + 4 * z} y={g.top} width={g.laneWidth - 8 * z} height={g.length} fill={i % 2 ? "#95a5a5" : "#819798"} opacity=".6"/>
          <line x1={x - half + 3 * z} x2={x - half + 3 * z} y1={g.top} y2={g.top + g.length} stroke="#f7f8ec" strokeWidth={1.5 * z}/>
          {whole.map(d => <text key={d} x={x - half + 12 * z} y={g.along(d) - 7 * z} fill="#f0f3e9" opacity=".7" fontSize={11 * z}>{d}</text>)}
        </>}
        {isTrack && <>
          <rect x={x - half} y={g.top} width={g.laneWidth} height={g.length} fill={i % 2 ? "#af544b" : "#a84c44"}/>
          <rect x={x - half} y={g.top} width={g.laneWidth} height={g.length} fill={`url(#${prefix}-rubber)`}/>
          <line x1={x - half} x2={x - half} y1={g.top} y2={g.top + g.length} stroke="#fff7e9" strokeWidth={2 * z}/>
          {whole.map(d => <g key={d} data-track-split={d}>
            <line x1={x - half} x2={x + half} y1={g.along(d)} y2={g.along(d)} stroke="#fff7e9" strokeWidth={(d === 0 ? 4 : 1) * z} opacity={d === 0 ? 1 : .4}/>
            <text x={x - half + 10 * z} y={g.along(d) - 8 * z} fill="#fff7e9" fontSize={10 * z} opacity=".75">{d === 0 ? "START" : `${d} km`}</text>
            {d === 0 && <text x={x} y={g.along(d) - 23 * z} textAnchor="middle" fontSize={30 * z} fontWeight="650" fill="#fff7e9">{i + 1}</text>}
          </g>)}
        </>}
        {background === "road" && <>
          <rect x={x - half + 7 * z} y={g.top} width={g.laneWidth - 14 * z} height={g.length} rx={5 * z} fill="#4f5f58"/>
          {[-1, 1].map(side => <line key={side} x1={x + side * (half - 13 * z)} x2={x + side * (half - 13 * z)} y1={g.top} y2={g.top + g.length} stroke="#e3e6cf" strokeWidth={1.7 * z} strokeDasharray={`${19 * z} ${20 * z}`} strokeDashoffset={-g.along(0)}/>) }
        </>}
        {background === "pool" && <>
          <line x1={x - half + 3 * z} x2={x - half + 3 * z} y1={g.top} y2={g.top + g.length} stroke="#fffdf1" strokeWidth={4 * z}/>
          {samples.map(d => <circle key={d} cx={x - half + 3 * z} cy={g.along(d)} r={3.5 * z} fill={i % 2 ? "#e4bc52" : "#82b3b8"}/>)}
          <line x1={x} x2={x} y1={g.top} y2={g.top + g.length} stroke="#6da2ac" strokeWidth={2 * z} opacity=".2"/>
          {whole.map(d => <path key={d} d={`M${x - 10 * z} ${g.along(d)}h${20 * z}m${-10 * z} 0v${10 * z}`} stroke="#4f8790" strokeWidth={2 * z} fill="none" opacity=".4"/>)}
        </>}
        {background === "boardwalk" && Array.from({ length: 5 }, (_, n) => <g key={n}>
          <line x1={x - half + (n + .5) * g.laneWidth / 5} x2={x - half + (n + .5) * g.laneWidth / 5} y1={g.top} y2={g.top + g.length} stroke={n % 2 ? "#d1cdbc" : "#f1eee3"} strokeWidth={2 * z}/>
          {whole.filter(d => d % 2 === n % 2).map(d => <path key={d} d={`M${x - half + (n + .6) * g.laneWidth / 5} ${g.along(d)}q${3 * z} ${12 * z} 0 ${30 * z}`} stroke="#bcb7a3" strokeWidth={.7 * z} opacity=".45" fill="none"/>)}
        </g>)}
        {background === "night" && <>
          <rect x={x - half + 5 * z} y={g.top} width={g.laneWidth - 10 * z} height={g.length} fill={i % 2 ? "#2e4037" : "#30443a"}/>
          <line x1={x - half} x2={x - half} y1={g.top} y2={g.top + g.length} stroke="#9db092" strokeWidth={.8 * z} opacity=".5"/>
          {whole.map(d => <circle key={d} cx={x - half + 2 * z} cy={g.along(d)} r={1.7 * z} fill="#dce6bb" opacity=".7"/>)}
        </>}
      </g>;
    })}
    {isTrack && <line x1={g.left + g.fieldWidth} x2={g.left + g.fieldWidth} y1={g.top} y2={g.top + g.length} stroke="#fff7e9" strokeWidth={2 * z}/>}
    {isTrack && edges === "club" && whole.filter(d => d % 2 === 0).map(d => <g key={`bench-${d}`} transform={`translate(${g.left + g.fieldWidth + 16 * z} ${g.along(d)}) scale(${z})`}>
      <ellipse cx="2" cy="4" rx="9" ry="18" fill="#718663" opacity=".18"/><rect x="-5" y="-15" width="10" height="30" rx="2" fill="#8c805e"/><path d="M-2-12V12M2-12V12" stroke="#d4c5a2" strokeWidth="2"/>
    </g>)}
    {isScenic && samples.map(d => {
      const y = g.along(d), r = (8 + rand(d) * 5) * z;
      return <g key={d}>{[-1, 1].map(side => {
        const x = middle + side * (g.fieldWidth / 2 + 12 * z) + g.drift(d);
        return <g key={side}><ellipse cx={x + 3 * z} cy={y + 5 * z} rx={r} ry={r * .65} fill="#718564" opacity=".13"/><circle cx={x} cy={y} r={r} fill={rand(d + side) > .5 ? "#a8ba8d" : "#b9c69c"}/><circle cx={x - 3 * z} cy={y - 3 * z} r={r * .68} fill="#cad4ae"/></g>;
      })}</g>;
    })}
    {background === "parkland" && whole.filter(d => d % 3 === 2).map(d => <g key={d} transform={`translate(${g.left - 17 * z} ${g.along(d)}) scale(${z})`}><rect x="-5" y="-13" width="10" height="26" rx="3" fill="#aa9c78"/><path d="M-3-10V10M1-10V10" stroke="#d1c5a6" strokeWidth="2"/></g>)}
    {background === "parkland" && whole.filter(d => d % 2 === 0).map(d => <g key={`garden-${d}`} transform={`translate(${middle + (d % 4 === 0 ? 1 : -1) * g.laneWidth / 2} ${g.along(d)}) scale(${z})`}>
      <rect x="-9" y="-13" width="18" height="26" rx="9" fill="#d5ddc2"/>
      <circle cx="-2" cy="-5" r="4" fill="#a7b995"/><circle cx="3" cy="2" r="4.5" fill="#b5c69f"/>
      <text x="0" y="25" textAnchor="middle" fontSize="10" fill="#7c896c">{d}</text>
    </g>)}
    {background === "trail" && samples.map(d => <g key={d}><circle cx={g.left + 12 * z + g.drift(d)} cy={g.along(d)} r={2 * z} fill="#bdc8a7"/><circle cx={g.left + g.fieldWidth - 14 * z + g.drift(d)} cy={g.along(d) + 7 * z} r={3 * z} fill="#c2ccab"/></g>)}
    {background === "night" && whole.filter(d => d % 2 === 0).map(d => <g key={d}>{[-1, 1].map(side => <g key={side}><ellipse cx={middle + side * (g.fieldWidth / 2 + 10 * z)} cy={g.along(d)} rx={80 * z} ry={65 * z} fill={`url(#${prefix}-lamp)`}/><circle cx={middle + side * (g.fieldWidth / 2 + 8 * z)} cy={g.along(d)} r={3 * z} fill="#f8edbe"/></g>)}</g>)}
  </g>;
}
