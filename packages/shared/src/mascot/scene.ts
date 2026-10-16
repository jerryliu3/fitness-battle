import {
  EMBER_MODEL,
  emberContour,
  emberExpression,
  emberKMorphContour,
  emberKMorphSideWalls,
  emberSideWalls,
  normalizeEmberPose,
  type EmberExpression,
  type EmberKConcept,
  type EmberPose,
} from "./model";

/** A small platform-neutral vector display list. No React, native or DOM dependencies. */
export interface EmberNode {
  tag: "g" | "path" | "ellipse" | "circle" | "defs" | "clipPath" | "linearGradient" | "stop";
  attrs: Record<string, string | number>;
  children?: EmberNode[];
}
const node = (tag: EmberNode["tag"], attrs: EmberNode["attrs"], children?: EmberNode[]): EmberNode => ({ tag, attrs, children });
const f = (value: number) => Number(value.toFixed(3));
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const smooth01 = (v: number) => {
  const t = clamp01(v);
  return t * t * t * (t * (6 * t - 15) + 10);
};

function mixHex(a: string, b: string, amount: number): string {
  const t = clamp01(amount);
  if (t <= 0) return a;
  if (t >= 1) return b;
  const parse = (hex: string) => {
    const clean = hex.replace("#", "");
    return [
      Number.parseInt(clean.slice(0, 2), 16),
      Number.parseInt(clean.slice(2, 4), 16),
      Number.parseInt(clean.slice(4, 6), 16),
    ] as const;
  };
  const ca = parse(a);
  const cb = parse(b);
  const toHex = (n: number) => Math.round(n).toString(16).padStart(2, "0");
  return `#${toHex(ca[0] + (cb[0] - ca[0]) * t)}${toHex(ca[1] + (cb[1] - ca[1]) * t)}${toHex(ca[2] + (cb[2] - ca[2]) * t)}`;
}

export interface EmberSceneOptions {
  id: string;
  pose?: Partial<EmberPose>;
  expression?: EmberExpression;
  shadow?: boolean;
  /** 0 = pure Star Ember, 1 = pure geometric letter K. */
  kMorph?: number;
  /** Anatomical limb-to-K correspondence concept. */
  kConcept?: EmberKConcept;
  /** Target letter color at kMorph = 1 (defaults to Overtaek cream #fff9e9). */
  kColor?: string;
}

export function createEmberScene({
  id,
  pose,
  expression,
  shadow = true,
  kMorph = 0,
  kConcept = "skater",
  kColor = "#fff9e9",
}: EmberSceneOptions): EmberNode[] {
  const prefix = `ember-${id.replace(/[^a-zA-Z0-9_-]/g, "") || "model"}`;
  const p = normalizeEmberPose({ ...pose, ...(expression ? emberExpression(expression) : {}) });
  const morph = Number.isFinite(kMorph) ? clamp01(kMorph) : 0;
  const c = EMBER_MODEL.palette;
  const body = morph > 0 ? emberKMorphContour(p, morph, kConcept) : emberContour(p);
  const walls = morph > 0 ? emberKMorphSideWalls(p, morph, kConcept) : emberSideWalls(p);
  const colorMix = morph > 0 ? smooth01((morph - 0.3) / 0.65) : 0;
  const stopLight = morph > 0 ? mixHex(c.light, kColor, colorMix) : c.light;
  const stopGold = morph > 0 ? mixHex(c.gold, kColor, colorMix) : c.gold;
  const wallColor = morph > 0 ? mixHex(c.edge, kColor, smooth01((morph - 0.45) / 0.5)) : c.edge;
  const detailFade = morph > 0 ? 1 - smooth01((morph - 0.12) / 0.52) : 1;
  const yawScale = Math.cos(p.yaw * 1.12);
  const morphShiftX = morph > 0 ? (kConcept === "skater" ? 14 * morph : -34 * morph) : 0;
  const morphShiftY = morph > 0 ? (kConcept === "skater" ? -12 * morph : -8 * morph) : 0;
  const faceShift = p.yaw * 38 + morphShiftX;
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
  const face = node("g", { transform: `translate(${f(faceShift + p.lookX * 6)} ${f(p.lookY * 5 + morphShiftY)})`, opacity: f((1 - Math.abs(p.yaw) * 0.22) * detailFade) }, [
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
  const bodyTransform =
    morph > 0
      ? "translate(0 0) translate(180 235) rotate(0) scale(1 1) translate(-180 -235)"
      : `translate(${f(p.x)} ${f(p.y)}) translate(180 235) rotate(${f(p.rotation)}) scale(${f(p.scaleX * yawScale)} ${f(p.scaleY)}) translate(-180 -235)`;
  const crescentAttrs: Record<string, string | number> =
    morph > 0
      ? { d: emberContour(p, true), fill: c.edge, opacity: f(detailFade) }
      : { d: emberContour(p, true), fill: c.edge };
  return [
    node("defs", {}, [
      node("linearGradient", { id: `${prefix}-gold`, x1: "20%", y1: "0%", x2: "85%", y2: "100%" }, [
        node("stop", { offset: "0%", stopColor: stopLight }), node("stop", { offset: "70%", stopColor: stopGold }),
      ]),
      node("clipPath", { id: `${prefix}-body` }, [node("path", { d: body })]),
      node("clipPath", { id: `${prefix}-mouth` }, [node("path", { d: mouth })]),
    ]),
    ...(shadow ? [node("ellipse", { cx: 180 + p.x * 0.2, cy: 359, rx: f(105 + p.y * 0.5), ry: f(10 + p.y * 0.025), fill: c.shadow, opacity: f((0.15 + p.y * 0.001) * (1 - morph)) })] : []),
    node("g", { transform: `translate(${f(180 + p.x)} ${f(218 + p.y)}) rotate(${f(p.heading)})`, opacity: f(p.trail * (1 - morph)) }, [
      node("path", { d: "M -125 -25 L -151 -25 M -136 3 L -157 3 M -119 33 L -153 33", fill: "none", stroke: c.edge, strokeWidth: 3.5, strokeLinecap: "round", opacity: 0.5 }),
      node("path", { d: "M -146 -5 L -156 -5 M -130 49 L -143 49", fill: "none", stroke: c.gold, strokeWidth: 2.5, strokeLinecap: "round", opacity: 0.7 }),
      node("g", { opacity: f(p.sparkle) }, [sparkle(-157, -43, 6), sparkle(-175, 23, 4), sparkle(-126, 58, 7)]),
    ]),
    node("g", { opacity: f(p.sparkle * (1 - p.trail * 0.85) * (1 - morph)) }, [sparkle(287, 88, 12), sparkle(318, 114, 7), sparkle(303, 57, 6), sparkle(65, 105, 8)]),
    node("g", { transform: bodyTransform }, [
      // Filled connecting surfaces restore the baseline's directional extrusion.
      // The gold face occludes inward-facing walls; there is no outline stroke or second back star.
      node("path", { d: walls, fill: wallColor }),
      node("path", { d: body, fill: `url(#${prefix}-gold)` }),
      node("g", { clipPath: `url(#${prefix}-body)` }, [
        node("path", crescentAttrs),
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
