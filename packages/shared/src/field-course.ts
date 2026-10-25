import { arenaPosition, arenaWindow, clampArenaLaneCenterToField, type ArenaSceneLane, type ArenaViewWindow } from "./arena-view";
import { fieldGrounds, type FieldAppearance } from "./field-appearance";
import { polishedCapsulePath } from "./polished-identity";

/** Small SVG scene contract, painted by DOM SVG and react-native-svg adapters. */
export interface FieldNode {
  tag: "g" | "defs" | "clipPath" | "mask" | "path" | "rect" | "circle" | "ellipse" | "line" | "text" | "linearGradient" | "stop" | "pattern";
  attrs: Record<string, string | number>;
  children?: FieldNode[];
  text?: string;
}
const n = (tag: FieldNode["tag"], attrs: FieldNode["attrs"], children?: FieldNode[], text?: string): FieldNode => ({ tag, attrs, children, text });
const line = (x1: number, y1: number, x2: number, y2: number, stroke: string, strokeWidth = 1, extra: FieldNode["attrs"] = {}) => n("line", { x1, y1, x2, y2, stroke, strokeWidth, ...extra });
const rect = (x: number, y: number, width: number, height: number, fill: string, extra: FieldNode["attrs"] = {}) => n("rect", { x, y, width, height, fill, ...extra });
const circle = (cx: number, cy: number, r: number, fill: string, extra: FieldNode["attrs"] = {}) => n("circle", { cx, cy, r, fill, ...extra });
const text = (x: number, y: number, value: string, fill: string, size = 10, extra: FieldNode["attrs"] = {}) => n("text", { x, y, fill, fontSize: size, ...extra }, undefined, value);
const path = (d: string, fill: string, extra: FieldNode["attrs"] = {}) => n("path", { d, fill, ...extra });

/** A local chase window; the existing overview retains the whole accumulated course. */
export function fieldDefaultSpan(unit: string) { return unit === "pts" ? 20 : unit === "mi" ? 1200 / 1609.344 : 1.2; }
export function clampCourseCenter(value: number, span: number, high: number, unit: string, ground: FieldAppearance["ground"]) {
  return ground === "oval" ? Math.max(0, Math.min(high, value)) : clampArenaLaneCenterToField(value, span, high, unit === "pts" ? 20 : 8);
}
export function fieldLoopLength(unit: string) { return unit === "pts" ? 20 : 1; }
export function fieldLap(value: number, unit: string) {
  const total = Math.max(0, value) / fieldLoopLength(unit);
  const laps = Math.floor(total + 1e-9);
  return { laps, fraction: Math.max(0, total - laps) };
}
function ovalPoint(f: number, r: number) {
  const straight = 270, perimeter = 2 * straight + 2 * Math.PI * r;
  let d = ((f % 1) + 1) % 1 * perimeter;
  if (d < straight) return { x: r, y: straight / 2 - d, angle: 0 };
  d -= straight;
  if (d < Math.PI * r) { const a = -d / r; return { x: r * Math.cos(a), y: -straight / 2 + r * Math.sin(a), angle: a * 180 / Math.PI }; }
  d -= Math.PI * r;
  if (d < straight) return { x: -r, y: -straight / 2 + d, angle: 180 };
  const a = Math.PI - (d - straight) / r;
  return { x: r * Math.cos(a), y: straight / 2 + r * Math.sin(a), angle: a * 180 / Math.PI };
}

export function fieldCourse(viewportWidth: number, height: number, count: number, view: ArenaViewWindow, unit: string, appearance: FieldAppearance) {
  const zoom = (appearance.ground === "oval" ? (unit === "pts" ? 20 : unit === "mi" ? 4 : 6) : fieldDefaultSpan(unit)) / arenaWindow(view.center, view.span).span;
  const oval = appearance.ground === "oval";
  const fieldWidth = Math.max(viewportWidth - 60, count * (viewportWidth - 60) / 5) * zoom;
  const width = oval ? viewportWidth : Math.max(viewportWidth, fieldWidth + 60);
  const left = (width - 42 - fieldWidth) / 2, top = 72, bottom = height - 64, length = bottom - top;
  const laneWidth = fieldWidth / Math.max(1, count), bounds = arenaWindow(view.center, view.span);
  const along = (v: number) => top + (bounds.max - v) / bounds.span * length;
  const drift = (v: number) => appearance.ground === "trail" ? Math.sin(v * .58) * 13 * zoom : 0;
  const outerRadius = 140 + Math.max(1, count) * 18;
  const ovalScale = Math.min((width - 60) / (outerRadius * 2), (length - 24) / (270 + outerRadius * 2)) * zoom;
  const focus = ovalPoint(view.center / fieldLoopLength(unit), 140 + Math.floor(count / 2) * 18 + 9);
  const follow = Math.max(0, Math.min(1, zoom - 1));
  const midX = width / 2 - focus.x * ovalScale * follow, midY = top + length / 2 - focus.y * ovalScale * follow;
  function point(v: number, i: number, offset = 0, clamp = false) {
    if (oval) {
      const p = ovalPoint(v / fieldLoopLength(unit), 140 + i * 18 + 9), a = p.angle * Math.PI / 180;
      return { x: midX + p.x * ovalScale + offset * Math.cos(a), y: midY + p.y * ovalScale + offset * Math.sin(a), angle: p.angle };
    }
    const value = clamp ? bounds.max - arenaPosition(v, view).fraction * bounds.span : v;
    return { x: left + (i + .5) * laneWidth + drift(value) + offset, y: along(value), angle: 0 };
  }
  function curve(a: number, b: number, i: number, offset = 0) {
    const steps = Math.max(1, Math.min(180, Math.ceil(Math.abs(b - a) / (oval ? fieldLoopLength(unit) / 100 : view.span / 60))));
    return Array.from({ length: steps + 1 }, (_, j) => { const p = point(a + (b - a) * j / steps, i, offset); return `${j ? "L" : "M"}${p.x.toFixed(3)} ${p.y.toFixed(3)}`; }).join(" ");
  }
  return { width, height, left, fieldWidth, top, bottom, length, laneWidth, bounds, zoom, oval, ovalScale, outerRadius, midX, midY, along, drift, point, curve,
    markerScale: unit === "pts" ? (oval ? Math.min(1.5, ovalScale * 1.3) : zoom)
      : (oval ? (540 + 2 * Math.PI * (140 + Math.floor(count / 2) * 18 + 9)) * ovalScale : length / bounds.span) * .3 / 58 };
}
export type FieldCourse = ReturnType<typeof fieldCourse>;
/** Integer labels, bounded scenery; no work proportional to lifetime distance. */
/** At most five readable ruler marks; spacing grows with the visible range. */
export function fieldScaleMarks(min:number,max:number) {
  const raw=Math.max(1,(max-Math.max(0,min))/4),power=10**Math.floor(Math.log10(raw));
  const step=[1,2,2.5,5,10].map(v=>v*power).find(v=>v>=raw)??10*power;
  return fieldMarks(min,max,step,4);
}
export function fieldMarks(min: number, max: number, step = 1, cap = 60) {
  const stride = Math.max(step, Math.ceil((max - min) / cap / step) * step);
  const first = Math.max(0, Math.ceil(min / stride) * stride);
  return Array.from({ length: Math.max(0, Math.min(cap + 1, Math.floor((max - first) / stride) + 1)) }, (_, i) => first + i * stride);
}
export function fieldOverview(lanes: readonly { value: number; ghost?: boolean }[], view: ArenaViewWindow) {
  const high = Math.max(1, ...lanes.filter(l => !l.ghost).map(l => l.value));
  const bounds = arenaWindow(view.center, view.span);
  const from = Math.max(0, Math.min(1, bounds.min / high)), to = Math.max(from, Math.min(1, bounds.max / high));
  return { high, from, width: to - from };
}
export function overviewTarget(fraction: number, high: number) { return Math.max(0, Math.min(1, Number.isFinite(fraction) ? fraction : 0)) * high; }

/** Fixed world ground and Liquid Glass / faint-underlay Banked trail. No animation clock. */
export function fieldCourseScene(g: FieldCourse, appearance: FieldAppearance, lanes: readonly ArenaSceneLane[], unit: string, prefix: string): FieldNode[] {
  const { ground, edges } = appearance, palette = fieldGrounds[ground], z = g.zoom;
  const whole = fieldMarks(g.bounds.min, g.bounds.max), samples = fieldMarks(g.bounds.min, g.bounds.max, .5);
  const out: FieldNode[] = [], surface: FieldNode[] = [], traces: FieldNode[] = [];
  const clip = `${prefix}-ground-clip`, mask = `${prefix}-head-clear`;
  const masks: FieldNode[] = [rect(0, 0, g.width, g.height, "white")];
  for (let i = 0; i < lanes.length; i++) {
    const l = lanes[i], p = g.point(l.value, i, 0, true), s = g.markerScale;
    masks.push(path(polishedCapsulePath(-1.5), "black", { transform: `translate(${p.x} ${p.y}) rotate(${p.angle}) scale(${s})` }));
  }
  out.push(n("defs", {}, [n("clipPath", { id: clip }, [rect(0, 0, g.width, g.height, "white")]), n("mask", { id: mask, x: 0, y: 0, width: g.width, height: g.height, maskUnits: "userSpaceOnUse" }, masks)]));
  if (ground === "straight" || ground === "oval") {
    const grain = g.oval ? 1 : z;
    out.push(n("defs", {}, [n("pattern", { id: `${prefix}-rubber-grain`, width: 11 * grain, height: 13 * grain, y: g.oval ? 0 : g.along(0), patternUnits: "userSpaceOnUse" }, [circle(3 * grain, 4 * grain, .6 * grain, "#713e36", { opacity: .22 }), circle(8 * grain, 10 * grain, .5 * grain, "#f5ad8f", { opacity: .22 })])]));
  }
  surface.push(rect(0, 0, g.width, g.height, edges === "club" ? "#dfe7d2" : "#f6f7f2"));
  if (g.oval) {
    const ring = (r: number) => `M${r} 135V-135A${r} ${r} 0 0 0 ${-r} -135V135A${r} ${r} 0 0 0 ${r} 135Z`;
    const items: FieldNode[] = [path(ring(g.outerRadius + 18), edges === "club" ? "#b7c79b" : "#f6f7f2"), path(ring(g.outerRadius), palette.surface), path(ring(g.outerRadius), `url(#${prefix}-rubber-grain)`), path(ring(140), edges === "club" ? "#b0c48f" : "#f6f7f2")];
    for (let i = 0; i <= lanes.length; i++) items.push(path(ring(140 + i * 18), "none", { stroke: "#fff7e9", strokeWidth: 1.5 }));
    items.push(line(140, 135, g.outerRadius, 135, "#fff7e9", 3));
    for (let i = 0; i < lanes.length; i++) items.push(text(149 + i * 18, 151, String(i + 1), "#fff7e9", 13, { textAnchor: "middle", fontWeight: 700 }));
    if (edges === "club") {
      items.push(rect(-72, -122, 144, 244, "none", { stroke: "#cdd8b5", strokeWidth: 3 }));
      for (const y of [-100, 0, 100]) items.push(rect(g.outerRadius + 27, y - 17, 10, 34, "#8c805e", { rx: 2 }), line(g.outerRadius + 32, y - 13, g.outerRadius + 32, y + 13, "#d4c5a2", 2));
    }
    surface.push(n("g", { transform: `translate(${g.midX} ${g.midY}) scale(${g.ovalScale})` }, items));
    surface.push(text(g.midX, g.midY - 4, `1 loop = ${fieldLoopLength(unit)} ${unit}`, "#435139", 10, { textAnchor: "middle" }));
    surface.push(text(g.midX, g.midY + 12, "Normalized circuit", "#616c63", 9, { textAnchor: "middle" }));
  } else {
    const scenic = ground === "trail" || ground === "parkland";
    if (scenic) surface.push(path(g.curve(g.bounds.min - g.bounds.span * .5, g.bounds.max + g.bounds.span * .5, (lanes.length - 1) / 2), "none", { stroke: palette.lane, strokeWidth: Math.max(1, g.fieldWidth - 14 * z) }));
    else surface.push(rect(g.left, 0, g.fieldWidth, g.height, palette.lane));
    for (let i = 0; i < lanes.length; i++) {
      const x = g.left + (i + .5) * g.laneWidth, half = g.laneWidth / 2;
      if (ground === "athletics" || ground === "straight" || ground === "night") {
        surface.push(rect(x - half, 0, g.laneWidth, g.height, ground === "straight" ? i % 2 ? "#af544b" : "#a84c44" : ground === "night" ? i % 2 ? "#2e4037" : "#30443a" : i % 2 ? "#95a5a5" : "#819798"));
        surface.push(line(x - half, 0, x - half, g.height, ground === "night" ? "#9db092" : "#fff7e9", 1.5 * z));
      }
      if (ground === "straight") for (const d of whole) {
        surface.push(line(x - half, g.along(d), x + half, g.along(d), "#fff7e9", (d === 0 ? 4 : 1) * z, { opacity: d === 0 ? 1 : .4 }));
        if (d === 0) surface.push(text(x, g.along(0) + 20 * z, String(i + 1), "#fff7e9", 18 * z, { textAnchor: "middle", fontWeight: 700 }));
      }
      if (ground === "straight") surface.push(rect(x - half, 0, g.laneWidth, g.height, `url(#${prefix}-rubber-grain)`));
      if (ground === "road") {
        surface.push(rect(x - half + 7 * z, 0, Math.max(1, g.laneWidth - 14 * z), g.height, "#4f5f58"));
        for (const side of [-1, 1]) surface.push(line(x + side * (half - 13 * z), 0, x + side * (half - 13 * z), g.height, "#e3e6cf", 1.7 * z, { strokeDasharray: `${19 * z} ${20 * z}`, strokeDashoffset: -g.along(0) }));
      }
      if (ground === "pool") {
        surface.push(line(x - half, 0, x - half, g.height, "#fffdf1", 4 * z));
        for (const d of samples) surface.push(circle(x - half, g.along(d), 3.5 * z, i % 2 ? "#e4bc52" : "#82b3b8"));
        for (const d of whole) surface.push(path(`M${x - 10 * z} ${g.along(d)}h${20 * z}m${-10 * z} 0v${10 * z}`, "none", { stroke: "#4f8790", strokeWidth: 2 * z, opacity: .4 }));
      }
      if (ground === "boardwalk") for (let k = 0; k < 5; k++) surface.push(line(x - half + (k + .5) * g.laneWidth / 5, 0, x - half + (k + .5) * g.laneWidth / 5, g.height, k % 2 ? "#d1cdbc" : "#f1eee3", 2 * z));
      if (ground === "boardwalk") for (const d of whole) surface.push(path(`M${x - half / 3} ${g.along(d)}q${3 * z} ${12 * z} 0 ${30 * z}`, "none", { stroke: "#bcb7a3", strokeWidth: .7 * z, opacity: .45 }));
      if (ground === "night") for (const d of whole) surface.push(circle(x - half + 2 * z, g.along(d), 1.7 * z, "#dce6bb", { opacity: .7 }));
    }
    if (ground === "straight" || ground === "athletics") surface.push(line(g.left + g.fieldWidth, 0, g.left + g.fieldWidth, g.height, "#fff7e9", 1.5 * z));
    // Whole-unit reference paint only; all numeric scale labels live on the side.
    if (ground !== "straight" && g.bounds.min <= 0) surface.push(line(g.left, g.along(0), g.left + g.fieldWidth, g.along(0), "#61715c", 2 * z));
    if (edges === "club" || scenic) for (const d of samples) for (const side of [-1, 1]) {
      const x = g.left + g.fieldWidth / 2 + side * (g.fieldWidth / 2 + 12 * z) + g.drift(d), y = g.along(d), r = (8 + (Math.sin(d * 91.7) + 1) * 2) * z;
      surface.push(n("ellipse", { cx: x + 3 * z, cy: y + 5 * z, rx: r, ry: r * .65, fill: "#718564", opacity: .16 }), circle(x, y, r, "#b9c69c"), circle(x - 3 * z, y - 3 * z, r * .68, "#cad4ae"));
    }
    if (edges === "club") for (const d of whole.filter(d => d % 2 === 0)) {
      const x = g.left + g.fieldWidth + 25 * z + g.drift(d), y = g.along(d);
      surface.push(rect(x - 4 * z, y - 14 * z, 8 * z, 28 * z, "#8c805e", { rx: 2 * z }), line(x, y - 11 * z, x, y + 11 * z, "#d4c5a2", 2 * z));
    }
    if (ground === "parkland") for (const d of whole.filter(d => d % 2 === 0)) {
      const x = g.left + g.fieldWidth / 2 + (d % 4 ? -1 : 1) * g.laneWidth / 2, y = g.along(d);
      surface.push(rect(x - 9 * z, y - 13 * z, 18 * z, 26 * z, "#d5ddc2", { rx: 9 * z }), circle(x, y - 4 * z, 4 * z, "#a7b995"), circle(x + 3 * z, y + 2 * z, 4.5 * z, "#b5c69f"));
    }
    if (ground === "trail") for (const d of samples) for (let i = 0; i < lanes.length - 1; i++) {
      const p = g.point(d, i + .5);
      surface.push(circle(p.x - 5 * z, p.y, 2 * z, "#c0caa9"), path(`M${p.x + 2 * z} ${p.y + 6 * z}l${-2 * z} ${-5 * z}m${2 * z} ${5 * z}l${3 * z} ${-4 * z}`, "none", { stroke: "#b5c49b", strokeWidth: z }));
    }
    if (ground === "night") for (const d of whole.filter(d => d % 2 === 0)) for (const side of [-1, 1]) {
      const x = g.left + g.fieldWidth / 2 + side * (g.fieldWidth / 2 + 8 * z);
      surface.push(n("ellipse", { cx: x, cy: g.along(d), rx: 55 * z, ry: 60 * z, fill: "#e5d698", opacity: .07 }), circle(x, g.along(d), 3 * z, "#f8edbe"));
    }
  }
  for (let i = 0; i < lanes.length; i++) {
    const l = lanes[i];
    const from = g.oval ? fieldLap(l.value, unit).laps * fieldLoopLength(unit) : Math.max(0, g.bounds.min);
    const to = g.oval ? l.value : Math.min(l.value, g.bounds.max);
    if (to <= from) continue;
    const clearance = g.oval ? fieldLoopLength(unit) * .08 : 104 * g.markerScale / g.length * g.bounds.span;
    const half = g.oval ? 7 * g.markerScale : Math.min(g.laneWidth * .34, 30 * z);
    const color = l.you ? "#f7c948" : "#3f817c";
    // Short gradient segments follow winding/oval courses without a straight-axis wash.
    // Alpha is continuous at segment boundaries; the existing mask keeps heads clear.
    const segments: FieldNode[] = [];
    const count = g.oval ? 24 : 1;
    for (let j = 0; j < count; j++) {
      const a = from + (to - from) * j / count, b = from + (to - from) * (j + 1) / count;
      const side = (d: number, sign: number) => {
        const taper = Math.min(1, Math.max(0, l.value - d) / Math.max(1e-6, clearance * .75));
        const p = g.point(d, i, sign * half * taper);
        return `${p.x.toFixed(3)} ${p.y.toFixed(3)}`;
      };
      const values = Array.from({ length: g.oval ? 5 : 81 }, (_, k) => a + (b - a) * k / ((g.oval ? 5 : 81) - 1));
      const ribbon = `M${values.map(d => side(d, -1)).join("L")}L${[...values].reverse().map(d => side(d, 1)).join("L")}Z`;
      const start = g.point(a, i), end = g.point(b, i), id = `${prefix}-progress-${i}-${j}`;
      const fadeDistance=unit==="pts"?20:1.5;
      const alpha = (value:number)=>.9*Math.max(0,Math.min(1,(l.value-value)/fadeDistance));
      const stops=[n("stop",{offset:0,stopColor:color,stopOpacity:alpha(a)}),...(l.value-fadeDistance>a&&l.value-fadeDistance<b?[n("stop",{offset:(l.value-fadeDistance-a)/(b-a),stopColor:color,stopOpacity:.9})]:[]),n("stop",{offset:1,stopColor:color,stopOpacity:alpha(b)})];
      segments.push(n("defs", {}, [n("linearGradient", { id, gradientUnits: "userSpaceOnUse", x1: g.oval ? start.x : 0, y1: start.y, x2: g.oval ? end.x : 0, y2: end.y }, stops)]), path(ribbon, `url(#${id})`));
    }
    traces.push(n("g", { pointerEvents: "none" }, segments));
  }
  const content = [n("g", {}, surface), n("g", { mask: `url(#${mask})` }, traces)];
  out.push(n("g", { clipPath: `url(#${clip})` }, content));
  return out;
}

/** Separate overlay keeps the one scale visible when swiping a crowded field. */
export function fieldScaleScene(g: FieldCourse, unit: string): FieldNode[] {
  if (g.oval) return [];
  return [rect(0, 0, 42, g.height, "#f6f7f2"), text(9, 36, unit, "#616c63", 11), ...fieldScaleMarks(g.bounds.min, g.bounds.max).map(d => text(9, g.along(d) + 3, String(d), "#616c63", 11))];
}
