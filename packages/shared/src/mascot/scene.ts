import { EMBER_MODEL, emberContour, emberExpression, normalizeEmberPose, type EmberExpression, type EmberPose } from "./model";
import { morphEmberContour, morphEmberSideWalls, emberMorphColor, type EmberMorphConcept } from "./morph";
import { limbMorphCrescent } from "./limb-morph";

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
  morph?: number;
  /** Review-only candidates; product defaults to the current baseline. */
  morphConcept?: EmberMorphConcept;
}

export function createEmberScene({ id, pose, expression, shadow = true, morph = 0, morphConcept = "baseline" }: EmberSceneOptions): EmberNode[] {
  const prefix = `ember-${id.replace(/[^a-zA-Z0-9_-]/g, "") || "model"}`;
  const p = normalizeEmberPose({ ...pose, ...(expression ? emberExpression(expression) : {}) });
  const c = EMBER_MODEL.palette;
  const amount = Number.isFinite(morph) ? Math.max(0,Math.min(1,morph)) : 0;
  const detail = (1-amount)**3;
  const body = morphEmberContour(p, amount, morphConcept);
  const yawScale = Math.cos(p.yaw * 1.12);
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
        node("stop", { offset: "0%", stopColor: emberMorphColor(c.light, amount) }), node("stop", { offset: "70%", stopColor: emberMorphColor(c.gold, amount) }),
      ]),
      node("clipPath", { id: `${prefix}-body` }, [node("path", { d: body })]),
      node("clipPath", { id: `${prefix}-mouth` }, [node("path", { d: mouth })]),
    ]),
    ...(shadow ? [node("ellipse", { cx: 180 + p.x * 0.2, cy: 359, rx: f(105 + p.y * 0.5), ry: f(10 + p.y * 0.025), fill: c.shadow, opacity: f(0.15 + p.y * 0.001) })] : []),
    node("g", { transform: `translate(${f(180 + p.x)} ${f(218 + p.y)}) rotate(${f(p.heading)})`, opacity: f(p.trail) }, [
      node("path", { d: "M -125 -25 L -151 -25 M -136 3 L -157 3 M -119 33 L -153 33", fill: "none", stroke: c.edge, strokeWidth: 3.5, strokeLinecap: "round", opacity: 0.5 }),
      node("path", { d: "M -146 -5 L -156 -5 M -130 49 L -143 49", fill: "none", stroke: c.gold, strokeWidth: 2.5, strokeLinecap: "round", opacity: 0.7 }),
      node("g", { opacity: f(p.sparkle) }, [sparkle(-157, -43, 6), sparkle(-175, 23, 4), sparkle(-126, 58, 7)]),
    ]),
    node("g", { opacity: f(p.sparkle * (1 - p.trail * 0.85)) }, [sparkle(287, 88, 12), sparkle(318, 114, 7), sparkle(303, 57, 6), sparkle(65, 105, 8)]),
    node("g", { transform: `translate(${f(p.x)} ${f(p.y)}) translate(180 235) rotate(${f(p.rotation)}) scale(${f(p.scaleX * yawScale)} ${f(p.scaleY)}) translate(-180 -235)` }, [
      // Filled connecting surfaces restore the baseline's directional extrusion.
      // The gold face occludes inward-facing walls; there is no outline stroke or second back star.
      node("path", { d: morphEmberSideWalls(p, amount, morphConcept), fill: emberMorphColor(c.edge, amount) }),
      node("path", { d: body, fill: `url(#${prefix}-gold)` }),
      node("g", { clipPath: `url(#${prefix}-body)`, opacity: detail }, [
        node("path", { d: morphConcept === "baseline" ? emberContour(p, true) : limbMorphCrescent(p, amount, morphConcept), fill: c.edge }),
        face,
      ]),
    ]),
  ];
}

const xmlNames: Record<string, string> = { strokeWidth: "stroke-width", strokeLinecap: "stroke-linecap", strokeLinejoin: "stroke-linejoin", stopColor: "stop-color", stopOpacity: "stop-opacity", clipPath: "clip-path" };
const escapeXml = (value: string | number) => String(value).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** A transparent, self-contained pose asset; animation lives in the model, not the exported SVG. */
export function exportEmberSvg(options: Omit<EmberSceneOptions, "id"> = {}): string {
  function serialize(n: EmberNode): string {
    return `<${n.tag} ${Object.entries(n.attrs).map(([key, value]) => `${xmlNames[key] ?? key}="${escapeXml(value)}"`).join(" ")}>${(n.children ?? []).map(serialize).join("")}</${n.tag}>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${EMBER_MODEL.viewBox}" role="img" aria-label="Star Ember"><title>Star Ember</title>${createEmberScene({ ...options, id: "export" }).map(serialize).join("")}</svg>`;
}
