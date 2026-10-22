import {
  orderedArenaLanes,
  type ArenaSceneLane,
  type ArenaViewWindow,
} from "./arena-view";
import type { FieldNode } from "./field-course";

/** Fixed-camera perspective, presentation only. Values remain in the current score-track unit. */
export function portraitField(
  lanes: readonly ArenaSceneLane[],
  view: ArenaViewWindow,
  focusId?: string,
) {
  const ordered = orderedArenaLanes([...lanes].filter((l) => !l.ghost));
  const me = ordered.find((l) => l.you);
  const focus = Math.max(
    0,
    ordered.findIndex((l) => l.id === (focusId ?? me?.id)),
  );
  const project = (lane: number, depth: number) => ({
    x: 210 + (lane - focus) * 222 * (0.1 + 0.9 * depth),
    y: 148 + 452 * depth,
  });
  const path = (
    d: string,
    fill: string,
    extra: FieldNode["attrs"] = {},
  ): FieldNode => ({ tag: "path", attrs: { d, fill, ...extra } });
  const point = (lane: number, depth: number) => {
    const p = project(lane, depth);
    return `${p.x},${p.y}`;
  };
  const ground: FieldNode[] = [];
  for (let i = 0; i < ordered.length; i++) {
    ground.push(
      path(
        `M${point(i - 0.5, 0)} L${point(i + 0.5, 0)} L${point(i + 0.5, 1)} L${point(i - 0.5, 1)} Z`,
        ordered[i]!.you ? "#255659" : i % 2 ? "#183e44" : "#1c464b",
      ),
    );
    ground.push(
      path(`M${point(i - 0.5, 0)} L${point(i - 0.5, 1)}`, "none", {
        stroke: ordered[i]!.you ? "#f7c948" : "#7b9a91",
        strokeWidth: ordered[i]!.you ? 2 : 1,
        strokeOpacity: 0.65,
      }),
    );
  }
  ground.push(
    path(
      `M${point(ordered.length - 0.5, 0)} L${point(ordered.length - 0.5, 1)}`,
      "none",
      { stroke: "#7b9a91", strokeWidth: 1 },
    ),
  );
  for (const depth of [0.14, 0.28, 0.46, 0.7, 0.98])
    ground.push(
      path(
        `M${point(-0.5, depth)} L${point(ordered.length - 0.5, depth)}`,
        "none",
        { stroke: "#b4c8b8", strokeOpacity: 0.16, strokeWidth: 1 },
      ),
    );
  const span = Math.max(0.0001, view.span);
  const markers = ordered.map((lane, i) => {
    const delta = (lane.value - view.center) / span;
    const outside = Math.abs(delta) > 0.5;
    const depth = Math.min(
      0.6,
      0.46 - Math.max(-0.5, Math.min(0.5, delta)) * 0.4,
    );
    const p = project(i, depth);
    return {
      ...lane,
      ...p,
      outside,
      direction: delta > 0 ? "↑" : "↓",
      gap: lane.value - (me?.value ?? 0),
      scale: 0.78 + depth * 0.3,
    };
  });
  const rivals = ordered
    .filter((l) => !l.you && l.value > (me?.value ?? 0))
    .sort((a, b) => a.value - b.value);
  return {
    ground,
    markers,
    ordered,
    focus,
    place: me ? 1 + ordered.filter((l) => l.value > me.value).length : 0,
    nextGap: me && rivals[0] ? rivals[0].value - me.value : null,
    fieldSize: ordered.length,
  };
}

export function portraitFieldGap(gap: number | null, unit: string) {
  return gap === null
    ? "You’re leading the field"
    : `${gap.toLocaleString("en-US", { maximumFractionDigits: unit === "pts" ? 0 : 2 })} ${unit} to next rival`;
}
