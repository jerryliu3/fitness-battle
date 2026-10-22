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
  laneOffset = 0,
  prefix = "portrait",
) {
  const ordered = orderedArenaLanes([...lanes].filter((l) => !l.ghost));
  const me = ordered.find((l) => l.you);
  const baseFocus = Math.max(
    0,
    ordered.findIndex((l) => l.id === (focusId ?? me?.id)),
  );
  const focus = Math.max(
    0,
    Math.min(Math.max(0, ordered.length - 1), baseFocus + laneOffset),
  );
  const project = (lane: number, depth: number) => {
    const x = 210 + (lane - focus) * 222 * (0.035 + 0.965 * depth);
    const curve =
      24 * Math.min(1, Math.abs(x - 210) / 210) ** 2 * (1 - depth) ** 2;
    return { x, y: 148 + 452 * depth + curve };
  };
  const path = (
    d: string,
    fill: string,
    extra: FieldNode["attrs"] = {},
  ): FieldNode => ({ tag: "path", attrs: { d, fill, ...extra } });
  const point = (lane: number, depth: number) => {
    const p = project(lane, depth);
    return `${p.x},${p.y}`;
  };
  const ground: FieldNode[] = [
    path("M-600 208 Q210 86 1020 208 L1020 650 H-600 Z", "#1c464b"),
  ];
  // Continue empty scenery beyond the roster; the far curve dissolves into atmospheric haze.
  for (let i = -8; i < ordered.length + 8; i++) {
    ground.push(
      path(
        `M${point(i - 0.5, 0)} L${point(i + 0.5, 0)} L${point(i + 0.5, 0.12)} L${point(i + 0.5, 1.05)} L${point(i - 0.5, 1.05)} L${point(i - 0.5, 0.12)} Z`,
        ordered[i]?.you ? "#255659" : i % 2 ? "#183e44" : "#1c464b",
      ),
    );
    ground.push(
      path(
        `M${point(i - 0.5, 0.02)} Q${point(i - 0.5, 0.18)} ${point(i - 0.5, 1.05)}`,
        "none",
        {
          stroke: ordered[i]?.you ? "#f7c948" : "#7b9a91",
          strokeWidth: ordered[i]?.you ? 2 : 1,
          strokeOpacity: 0.65,
        },
      ),
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
  const ghost = lanes.find((l) => l.ghost);
  const rows = [
    ...ordered.map((lane, i) => ({ lane, i })),
    ...(ghost
      ? [
          {
            lane: ghost,
            i:
              Math.max(
                0,
                ordered.findIndex((l) => l.you),
              ) + 0.42,
          },
        ]
      : []),
  ];
  const markers = rows.map(({ lane, i }) => {
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
      scale: lane.ghost ? 0.78 : 0.78 + depth * 0.3,
      color: lane.ghost
        ? "#c9d6e3"
        : lane.you
          ? "#f7c948"
          : ["#63edda", "#60cfff", "#b4a9ff"][Math.floor(i) % 3]!,
      trail: (() => {
        const end = Math.max(
          depth,
          Math.min(1.04, 0.46 + (view.center / span) * 0.4),
        );
        const a = project(i, depth),
          b = project(i, end);
        return `M${a.x} ${a.y + 27} Q${project(i, (depth + end) / 2).x} ${project(i, (depth + end) / 2).y + 27} ${b.x} ${b.y + 27}`;
      })(),
    };
  });
  const rivals = ordered
    .filter((l) => !l.you && l.value > (me?.value ?? 0))
    .sort((a, b) => a.value - b.value);
  return {
    ground: [
      {
        tag: "defs",
        attrs: {},
        children: [
          {
            tag: "clipPath",
            attrs: { id: `${prefix}-curve` },
            children: [path("M-100 208 Q210 100 520 208 V650 H-100Z", "white")],
          },
        ],
      },
      {
        tag: "g",
        attrs: { clipPath: `url(#${prefix}-curve)` },
        children: ground,
      },
    ] as FieldNode[],
    markers,
    ordered,
    focus,
    baseFocus,
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
