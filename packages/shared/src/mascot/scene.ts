import { EMBER_MODEL, emberContour, emberExpression, normalizeEmberPose, type EmberExpression, type EmberPose } from "./model";

/** A small platform-neutral vector display list. No React, native or DOM dependencies. */
export interface EmberNode {
  tag: "g" | "path" | "ellipse" | "circle" | "defs" | "clipPath" | "linearGradient" | "stop";
  attrs: Record<string, string | number>;
  children?: EmberNode[];
}
const node = (tag: EmberNode["tag"], attrs: EmberNode["attrs"], children?: EmberNode[]): EmberNode => ({ tag, attrs, children });
const f = (value: number) => Number(value.toFixed(3));

export interface EmberSceneOptions {
  id: string;
  pose?: Partial<EmberPose>;
  expression?: EmberExpression;
  shadow?: boolean;
}

export function createEmberScene({ id, pose, expression, shadow = true }: EmberSceneOptions): EmberNode[] {
  const prefix = `ember-${id.replace(/[^a-zA-Z0-9_-]/g, "") || "model"}`;
  const p = normalizeEmberPose({ ...pose, ...(expression ? emberExpression(expression) : {}) });
  const c = EMBER_MODEL.palette;
  const body = emberContour(p);
  const yawScale = Math.cos(p.yaw * 1.12);
  const depth = -10 - Math.abs(p.yaw) * 15;
  const faceShift = p.yaw * 38;
  const eye = (x: number, open: number): EmberNode => node("g", { transform: `translate(${x} 206)` }, [
    node("g", { opacity: f(open) }, [
      node("ellipse", { cx: 0, cy: 0, rx: 11.4, ry: f(16.5 * Math.max(0.05, open)), fill: c.ink }),
      node("ellipse", { cx: 3.3, cy: -6.8 * open, rx: 3.4, ry: 4.5 * open, fill: c.glint }),
    ]),
    node("path", { d: "M -10 -3 Q 0 -9 10 0 Q 1 -1 -9 6", fill: "none", stroke: c.ink, strokeWidth: 4.5, strokeLinecap: "round", strokeLinejoin: "round", opacity: f(1 - open) }),
  ]);
  const mouthWidth = 11 + p.smile * 6;
  const mouthHeight = 6 + p.mouthOpen * 22;
  const mouth = `M ${180 - mouthWidth} 226 Q 180 ${231 - p.smile * 5} ${180 + mouthWidth} 226 C ${181 + mouthWidth} ${226 + mouthHeight} ${179 - mouthWidth} ${226 + mouthHeight} ${180 - mouthWidth} 226 Z`;
  const face = node("g", { transform: `translate(${f(faceShift + p.lookX * 6)} ${f(p.lookY * 5)})`, opacity: f(1 - Math.abs(p.yaw) * 0.22) }, [
    eye(148, p.eyeLeft), eye(211, p.eyeRight),
    node("path", { d: `M 170 228 Q 180 ${228 + p.smile * 13} 191 228`, fill: "none", stroke: c.ink, strokeWidth: 4.3, strokeLinecap: "round", opacity: f(1 - p.mouthOpen) }),
    node("g", { opacity: f(p.mouthOpen) }, [
      node("path", { d: mouth, fill: c.mouth }),
      node("g", { clipPath: `url(#${prefix}-mouth)` }, [node("ellipse", { cx: 180, cy: 226 + mouthHeight * 0.8, rx: 15, ry: mouthHeight * 0.32, fill: c.tongue })]),
    ]),
  ]);
  const sparkle = (x: number, y: number, size: number) => node("path", {
    d: `M ${x} ${y - size} Q ${x + size * 0.2} ${y - size * 0.2} ${x + size} ${y} Q ${x + size * 0.2} ${y + size * 0.2} ${x} ${y + size} Q ${x - size * 0.2} ${y + size * 0.2} ${x - size} ${y} Q ${x - size * 0.2} ${y - size * 0.2} ${x} ${y - size} Z`, fill: c.gold,
  });
  return [
    node("defs", {}, [
      node("linearGradient", { id: `${prefix}-gold`, x1: "20%", y1: "0%", x2: "85%", y2: "100%" }, [
        node("stop", { offset: "0%", stopColor: c.light }), node("stop", { offset: "70%", stopColor: c.gold }),
      ]),
      node("clipPath", { id: `${prefix}-body` }, [node("path", { d: body })]),
      node("clipPath", { id: `${prefix}-mouth` }, [node("path", { d: mouth })]),
    ]),
    ...(shadow ? [node("ellipse", { cx: 180 + p.x * 0.2, cy: 359, rx: f(105 + p.y * 0.5), ry: f(10 + p.y * 0.025), fill: c.shadow, opacity: f(0.15 + p.y * 0.001) })] : []),
    node("g", { opacity: f(p.trail * 0.65), stroke: c.edge, strokeWidth: 3.5, strokeLinecap: "round" }, [
      node("path", { d: "M 52 230 L 18 247 M 67 252 L 33 272 M 84 274 L 53 293" }),
    ]),
    node("g", { opacity: f(p.sparkle) }, [sparkle(287, 88, 12), sparkle(318, 114, 7), sparkle(303, 57, 6), sparkle(65, 105, 8)]),
    node("g", { transform: `translate(${f(p.x)} ${f(p.y)}) translate(180 235) rotate(${f(p.rotation)}) scale(${f(p.scaleX * yawScale)} ${f(p.scaleY)}) translate(-180 -235)` }, [
      node("path", { d: body, fill: c.edge, transform: `translate(${f(depth)} 5)` }),
      node("path", { d: body, fill: `url(#${prefix}-gold)` }),
      node("path", { d: emberContour(p, true), fill: c.edge }),
      node("g", { clipPath: `url(#${prefix}-body)` }, [face]),
    ]),
  ];
}

const xmlNames: Record<string, string> = { strokeWidth: "stroke-width", strokeLinecap: "stroke-linecap", strokeLinejoin: "stroke-linejoin", stopColor: "stop-color", clipPath: "clip-path" };
const escapeXml = (value: string | number) => String(value).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** A transparent, self-contained pose asset; animation lives in the model, not the exported SVG. */
export function exportEmberSvg(options: Omit<EmberSceneOptions, "id"> = {}): string {
  function serialize(n: EmberNode): string {
    return `<${n.tag} ${Object.entries(n.attrs).map(([key, value]) => `${xmlNames[key] ?? key}="${escapeXml(value)}"`).join(" ")}>${(n.children ?? []).map(serialize).join("")}</${n.tag}>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${EMBER_MODEL.viewBox}" role="img" aria-label="Star Ember"><title>Star Ember</title>${createEmberScene({ ...options, id: "export" }).map(serialize).join("")}</svg>`;
}
