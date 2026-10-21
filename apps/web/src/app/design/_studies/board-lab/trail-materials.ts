/** Presentation finishes only: these colors never change the canonical capsule identity. */
export const trailMaterials = {
  enamel: { name: "Route Enamel", short: "Solid color, crisp outline", description: "A saturated gold or blue route with a precise dark keyline. Flat, clear and easy to read against the ground." },
  rubber: { name: "Pop Rubber", short: "Rounded, chunky, tactile", description: "Warm yellow or mint pieces with a darker base and a small raised edge. A playful, substantial path rather than a translucent shadow." },
  neon: { name: "Signal Neon", short: "Electric color, soft light", description: "Acid yellow or electric cyan with a dark rim, a restrained glow and a bright core. The most energetic direction." },
  inlay: { name: "Porcelain Inlay", short: "White core, colored border", description: "A clean white center framed by gold or teal and a fine dark outer edge. A sharp graphic treatment that works on bright and dark grounds." },
  glass: { name: "Liquid Glass", short: "Polished, luminous, dimensional", description: "Rich gold or ice blue, a precise edge, a soft shadow and a narrow reflected highlight. A glossy trail that relates to the polished capsules." },
} as const;
export type TrailMaterialId = keyof typeof trailMaterials;
export function isTrailMaterialId(value: string | null): value is TrailMaterialId { return value !== null && Object.hasOwn(trailMaterials, value); }

export interface TrailPalette { core: string; edge: string; rim: string; highlight: string; shadow: string; glow: string; }
const pairs: Record<TrailMaterialId, [TrailPalette, TrailPalette]> = {
    enamel: [
      { core: "#ffc400", edge: "#9c6900", rim: "#604416", highlight: "#fff6c4", shadow: "#674e1a", glow: "#ffd54a" },
      { core: "#45bddd", edge: "#216d83", rim: "#254d58", highlight: "#e3fbff", shadow: "#254d58", glow: "#74ddf5" },
    ],
    rubber: [
      { core: "#ffd336", edge: "#d09a08", rim: "#a57600", highlight: "#ffed91", shadow: "#987015", glow: "#ffd336" },
      { core: "#8fddb5", edge: "#4da97e", rim: "#347f5e", highlight: "#d9ffe9", shadow: "#347f5e", glow: "#8fddb5" },
    ],
    neon: [
      { core: "#dcff36", edge: "#52651a", rim: "#34481c", highlight: "#fbffe6", shadow: "#34481c", glow: "#c5ff38" },
      { core: "#3beedb", edge: "#206a61", rim: "#174c48", highlight: "#e6fffb", shadow: "#174c48", glow: "#35f4dc" },
    ],
    inlay: [
      { core: "#fffdf3", edge: "#edb500", rim: "#78601f", highlight: "#ffffff", shadow: "#78601f", glow: "#fff5c9" },
      { core: "#fffdf3", edge: "#329dac", rim: "#255963", highlight: "#ffffff", shadow: "#255963", glow: "#e2fbff" },
    ],
    glass: [
      { core: "#ffbf12", edge: "#a46a00", rim: "#77521b", highlight: "#fff9db", shadow: "#8e6b21", glow: "#ffe87e" },
      { core: "#9cddf2", edge: "#4d91b1", rim: "#32647c", highlight: "#effdff", shadow: "#32647c", glow: "#d4f7ff" },
    ],
};
export function trailPalette(material: TrailMaterialId, you: boolean): TrailPalette {
  return pairs[material][you ? 0 : 1];
}
