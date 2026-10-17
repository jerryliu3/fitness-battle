import { createEmberScene, EMBER_MODEL, emberMorphColor, type EmberNode, type EmberSceneOptions } from "@fitness-battle/shared/mascot";

export const MOTION_STYLES = [
  { id: "challenger", name: "Challenger", reference: "pass", material: "Rounded satin · chartreuse / forest", note: "Broader shoulders, compact crest and a heavier dark edge.", gold: "#bde34d", light: "#e6f69b", edge: "#47663c", ink: "#243a2d", width: .11, crown: .18, bevel: 9 },
  { id: "marginal", name: "Marginal Gains", reference: "margin", material: "Soft ceramic · mint / petrol", note: "A quieter, tighter crown with a fine chamfer and calm face.", gold: "#a8d9c5", light: "#e0f3e6", edge: "#537f74", ink: "#234940", width: .045, crown: .10, bevel: 5 },
  { id: "higher", name: "Higher Ground", reference: "ground", material: "Opaque frost study · glacial blue", note: "A fuller central body and a pale, wider rim; no real refraction.", gold: "#a3d6e8", light: "#eefaff", edge: "#659db5", ink: "#274b4d", width: .075, crown: .23, bevel: 12 },
] as const;
export type MotionStyle = typeof MOTION_STYLES[number];

/** Smooth, study-only contour offsets. They fade completely into the shared K.
 * Only absolute M/L/Q/C coordinate paths from the canonical body are accepted.
 * Face, particles and global transforms retain the production rig's coordinates.
 */
export function reshapeContour(path: string, style: MotionStyle, morph: number) {
  const strength = (1 - Math.min(1, Math.max(0, morph))) ** 2;
  if (!strength) return path;
  if (/[a-bd-kno-pr-wy]/i.test(path)) throw new Error("Unsupported contour command");
  let index = 0;
  const values = Array.from(path.matchAll(/-?\d+(?:\.\d+)?(?:e[-+]?\d+)?/gi), m => Number(m[0]));
  return path.replace(/-?\d+(?:\.\d+)?(?:e[-+]?\d+)?/gi, () => {
    const i = index++, x = values[i - i % 2], y = values[i - i % 2 + 1];
    // Smooth field avoids seams between body, side walls and crest.
    const value = i % 2 === 0
      ? 180 + (x - 180) * (1 + style.width * strength * Math.exp(-(((y - 210) / 140) ** 2)))
      : y + Math.max(0, 155 - y) * style.crown * strength;
    return String(Number(value.toFixed(3)));
  });
}

export function createStyledScene(style: MotionStyle, options: EmberSceneOptions, warm = false): EmberNode[] {
  const amount = Math.min(1, Math.max(0, options.morph ?? 0));
  const nodes = createEmberScene(options);
  const tint = (hex: string) => warm ? "#" + [1, 3, 5].map(i => Math.round(parseInt(hex.slice(i,i+2),16)*(1-amount)+parseInt("#282f2c".slice(i,i+2),16)*amount).toString(16).padStart(2,"0")).join("") : emberMorphColor(hex, amount);
  const colors: Record<string, string> = {
    [EMBER_MODEL.palette.ink]: style.ink,
    [EMBER_MODEL.palette.gold]: style.gold,
    [EMBER_MODEL.palette.light]: style.light,
    [EMBER_MODEL.palette.edge]: style.edge,
    [emberMorphColor(EMBER_MODEL.palette.gold, amount)]: tint(style.gold),
    [emberMorphColor(EMBER_MODEL.palette.light, amount)]: tint(style.light),
    [emberMorphColor(EMBER_MODEL.palette.edge, amount)]: tint(style.edge),
  };
  const clip = nodes[0].children?.find(n => n.tag === "clipPath" && String(n.attrs.id).endsWith("-body"));
  const body = String(clip?.children?.[0].attrs.d ?? "");
  function visit(node: EmberNode, geometry = false): EmberNode {
    const attrs = { ...node.attrs };
    for (const key of ["fill", "stroke", "stopColor"]) {
      if (typeof attrs[key] === "string") attrs[key] = colors[attrs[key]] ?? attrs[key];
    }
    if (geometry && typeof attrs.d === "string") attrs.d = reshapeContour(attrs.d, style, amount);
    const bodyGroup = node.tag === "g" && node.children?.some(n => n.attrs.d === body);
    const children = node.children?.map((child, index) => visit(child,
      // Main walls/front, body clip, and the first crest path inside the body clip.
      Boolean((bodyGroup && index < 2) || node === clip || (node.attrs.clipPath === `url(#${clip?.attrs.id})` && index === 0)),
    ));
    if (bodyGroup && children) {
      const front = children[1];
      children.splice(2, 0, { tag: "g", attrs: { clipPath: `url(#${clip?.attrs.id})`, opacity: Number(((1-amount)**3 * .65).toFixed(3)) }, children: [
        { tag: "path", attrs: { d: front.attrs.d, fill: "none", stroke: style.light, strokeWidth: style.bevel, strokeLinejoin: "round" } },
      ] });
    }
    return { ...node, attrs, ...(children ? { children } : {}) };
  }
  return nodes.map(node => visit(node));
}
