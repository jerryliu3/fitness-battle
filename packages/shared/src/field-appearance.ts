/** Device-local presentation only. Never serialized into scoring/account state. */
export const fieldGrounds = {
  athletics: { name: "Personal track", surface: "#899b9d", lane: "#819496" },
  road: { name: "Road ribbons", surface: "#78817b", lane: "#596660" },
  parkland: { name: "Parkland Passage", surface: "#dfe7d2", lane: "#f3f2e9" },
  pool: { name: "Pool Deck", surface: "#deeff0", lane: "#c4e2e5" },
  boardwalk: { name: "Boardwalk", surface: "#e7e4d7", lane: "#e0ddce" },
  trail: { name: "Meadow Trail", surface: "#dfe7d2", lane: "#f0eddd" },
  straight: { name: "Club Straightaway", surface: "#ad5149", lane: "#a44942" },
  oval: { name: "Club Oval", surface: "#ad5149", lane: "#a44942" },
  night: { name: "Night Meet", surface: "#26352f", lane: "#2e4037" },
} as const;
export type FieldGround = keyof typeof fieldGrounds;
export interface FieldAppearance { ground: FieldGround; edges: "club" | "open"; }
export const defaultFieldAppearance: FieldAppearance = { ground: "trail", edges: "club" };
export function readFieldAppearance(raw: string | null): FieldAppearance {
  try {
    const value: unknown = JSON.parse(raw ?? "null");
    if (!value || typeof value !== "object") return { ...defaultFieldAppearance };
    const data = value as Record<string, unknown>;
    return {
      ground: typeof data.ground === "string" && Object.hasOwn(fieldGrounds, data.ground) ? data.ground as FieldGround : "trail",
      edges: data.edges === "open" ? "open" : "club",
    };
  } catch { return { ...defaultFieldAppearance }; }
}
export function fieldAppearanceKey(account: string, sport: string) {
  return `overtaek:field-appearance:v1:${encodeURIComponent(account)}:${encodeURIComponent(sport)}`;
}
