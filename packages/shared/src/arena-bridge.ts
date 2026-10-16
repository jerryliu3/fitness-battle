import {
  arenaWindow,
  type ArenaSceneLane,
  type ArenaViewWindow,
} from "./arena-view";
export interface ArenaSceneMessage {
  type: "arena-view";
  lanes: ArenaSceneLane[];
  view: ArenaViewWindow;
  unit: "km" | "pts";
  selected: string;
}
/** Only bounded presentation data crosses into the embedded renderer; never credentials. */
export function parseArenaSceneMessage(
  input: unknown,
): ArenaSceneMessage | null {
  if (!input || typeof input !== "object") return null;
  const p = input as Partial<ArenaSceneMessage>;
  if (
    p.type !== "arena-view" ||
    !Array.isArray(p.lanes) ||
    p.lanes.length > 32 ||
    !p.lanes.length ||
    !p.view ||
    typeof p.view.center !== "number" ||
    typeof p.view.span !== "number" ||
    !Number.isFinite(p.view.center) ||
    !Number.isFinite(p.view.span) ||
    !["km", "pts"].includes(p.unit ?? "")
  )
    return null;
  const ids = new Set<string>();
  for (const l of p.lanes) {
    if (
      !l ||
      typeof l.id !== "string" ||
      l.id.length > 100 ||
      ids.has(l.id) ||
      typeof l.name !== "string" ||
      l.name.length > 100 ||
      typeof l.initials !== "string" ||
      l.initials.length > 8 ||
      (l.you !== undefined && typeof l.you !== "boolean") ||
      (l.ghost !== undefined && typeof l.ghost !== "boolean") ||
      !Number.isFinite(l.value) ||
      l.value < 0 ||
      l.value > 1e7
    )
      return null;
    ids.add(l.id);
  }
  if (p.lanes.filter((l) => l.you).length !== 1) return null;
  const v = arenaWindow(p.view.center, p.view.span);
  return {
    type: "arena-view",
    lanes: p.lanes.map((l) => ({
      id: l.id,
      name: l.name,
      initials: l.initials,
      value: l.value,
      you: !!l.you,
      ghost: !!l.ghost,
    })),
    view: { center: v.center, span: v.span },
    unit: p.unit as "km" | "pts",
    selected:
      typeof p.selected === "string" && ids.has(p.selected)
        ? p.selected
        : p.lanes.find((l) => l.you)!.id,
  };
}
