import { createElement, useId, type CSSProperties } from "react";
import { createEmberScene, EMBER_MODEL, type EmberNode } from "@fitness-battle/shared/mascot";
import { refinementColors, type RefinedSpec } from "./refinements";

const contour = `M ${EMBER_MODEL.start.join(" ")} ${EMBER_MODEL.body.map(s => `C ${s.join(" ")}`).join(" ")} Z`;

function faceInk(hex: string) {
  const rgb = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255);
  return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722 > .57 ? "#282f2c" : "#fafaf7";
}

function FilledEmber({ id, radius, color }: { id: string; radius: number; color: string }) {
  const p = EMBER_MODEL.palette;
  const ink = faceInk(color);
  const paint: Record<string, string> = { [p.gold]: color, [p.light]: color, [p.edge]: color, [p.ink]: ink, [p.glint]: ink === "#fafaf7" ? "#282f2c" : "#fffef3" };
  function render(n: EmberNode, key: number): React.ReactNode {
    const attrs = Object.fromEntries(Object.entries(n.attrs).map(([k, v]) => [k, ["fill", "stroke", "stopColor"].includes(k) && typeof v === "string" ? paint[v] ?? v : v]));
    return createElement(n.tag, { ...attrs, key }, n.children?.map(render));
  }
  return <g data-ember-face="true" transform={`scale(${radius / 132}) translate(-176 -200)`}>{createEmberScene({ id, shadow: false, expression: "smile" }).map(render)}</g>;
}

function Shape({ ember, radius, fill = "none", stroke, width = 2 }: { ember?: boolean; radius: number; fill?: string; stroke: string; width?: number }) {
  return ember ? <g transform={`scale(${radius / 132})`}><path transform="translate(-176 -200)" d={contour} fill={fill} stroke={stroke} strokeWidth={width * 132 / radius} strokeLinejoin="round" /></g> : <circle r={radius} fill={fill} stroke={stroke} strokeWidth={width} />;
}

/** Same head and wake geometry in the icon and the field. Only scale changes. */
export function RefinedRacer({ spec, x, y, radius, fast, flow = false, edge, initials, wakeLength, echoCount }: { spec: RefinedSpec; x: number; y: number; radius: number; fast: boolean; flow?: boolean; edge?: string | null; initials?: string; wakeLength?: number; echoCount?: number }) {
  const uid = useId();
  const colors = refinementColors(spec);
  const color = fast ? colors.main : colors.peer;
  const dense = !fast && spec.slow === "dense";
  const subtle = !fast && spec.slow === "subtle";
  const ember = spec.ember || spec.shape?.startsWith("ember");
  const hasEchoes = (spec.family === "afterimage" || spec.echoes) && (fast || spec.slow !== "none");
  const length = wakeLength ?? radius * (dense ? 1.35 : subtle ? 2.85 : 3.2);
  const count = echoCount ?? (dense ? 6 : 4);
  const filled = spec.shape ? spec.shape === "circle-solid" || spec.shape === "ember-face" : spec.family !== "afterimage" || spec.ember;
  const duration = fast || spec.slow === "equal" ? 1.15 : subtle ? 1.32 : dense ? 2.3 : 1.8;
  return <g transform={`translate(${x} ${y})`} data-racer={fast ? "fast" : "slow"}>
    <defs><linearGradient id={`${uid}-fade`} x1="0" y1="0" x2="0" y2="1"><stop stopColor="white" /><stop offset="1" stopColor="white" stopOpacity="0" /></linearGradient><mask id={`${uid}-mask`} maskUnits="userSpaceOnUse" x={-radius * 1.6} y={-radius * 1.5} width={radius * 3.2} height={length + radius * 3}><rect x={-radius * 1.6} y={-radius} width={radius * 3.2} height={length + radius * 2} fill={`url(#${uid}-fade)`} /></mask></defs>
    <g mask={`url(#${uid}-mask)`}>
      {hasEchoes && Array.from({ length: count }, (_, i) => <g key={i} className={flow ? "pass-flow-echo" : undefined} style={{ transform: `translateY(${length * (i + 1) / count}px)`, opacity: .72 * (1 - i / (count + 1)), "--echo-distance": `${length}px`, animationDuration: `${duration}s`, animationDelay: `${-duration * i / count}s` } as CSSProperties}><Shape ember={ember} radius={radius} stroke={color} width={Math.max(1.2, radius * .1)} /></g>)}
      {spec.family === "twin-trails" && <><path d={`M0 ${radius * .65}v${radius * 3.8}`} stroke={color} strokeWidth={radius * .27} strokeLinecap="round" opacity=".3" /><path className={flow ? "pass-flow-line" : undefined} d={`M0 ${radius * .65}v${radius * 3.8}`} stroke={color} strokeWidth={radius * .27} strokeDasharray="4 10" strokeLinecap="round" style={{ animationDuration: `${fast ? .65 : 1.5}s` }} /></>}
    </g>
    {spec.shape === "ember-face" ? <FilledEmber id={uid} radius={radius} color={color} /> : <Shape ember={ember} radius={radius} stroke={color} fill={filled ? color : colors.bg} width={Math.max(1.8, radius * .22)} />}
    {(edge || (initials && spec.shape !== "ember-face")) && <text x={edge && spec.shape === "ember-face" ? radius + 7 : 0} y="3" textAnchor={edge && spec.shape === "ember-face" ? "start" : "middle"} fontSize={radius * .52} fontWeight="700" fill={edge && spec.shape === "ember-face" ? colors.ink : filled ? faceInk(color) : color}>{edge || initials}</text>}
  </g>;
}

export function RefinementIcon({ spec, size = 160, flow = false, unmasked = false, wake, passProgress = 1 }: { spec: RefinedSpec; size?: number; flow?: boolean; unmasked?: boolean; wake?: "stretched" | "balanced" | "dense"; passProgress?: number }) {
  const uid = useId();
  const colors = refinementColors(spec);
  const fastY = wake ? 171 - 78 * Math.min(1, Math.max(0, passProgress)) : 93;
  const sharedEnd = 145 + 23 * 2.85;
  return <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 256 256" role="img" aria-label={`${spec.name} app icon`}>
    <defs><clipPath id={`${uid}-tile`}><rect width="256" height="256" rx="57" /></clipPath></defs>
    <g clipPath={unmasked ? undefined : `url(#${uid}-tile)`}><rect width="256" height="256" fill={colors.bg} />{spec.lanes && <path d="M49 49V210M128 49V210M207 49V210" stroke={colors.rule} strokeWidth="3" fill="none" />}
      <RefinedRacer spec={spec} x={88} y={145} radius={23} fast={false} flow={flow} />
      <RefinedRacer spec={spec} x={168} y={fastY} radius={23} fast flow={flow} wakeLength={wake ? sharedEnd - fastY : undefined} echoCount={wake ? { stretched: 4, balanced: 6, dense: 8 }[wake] : undefined} />
    </g>
  </svg>;
}
