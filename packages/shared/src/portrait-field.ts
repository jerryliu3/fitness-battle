import {
  orderedArenaLanes,
  type ArenaSceneLane,
  type ArenaViewWindow,
} from "./arena-view";
import { competeFieldIncludesStart } from "./compete-trail";
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
  // A pinhole projection of a flat distance plane. Both markers and survey
  // lines use this function; no rank compression or far-athlete edge pinning.
  const span = Math.max(0.0001, view.span);
  const min = view.center - span / 2;
  const max = view.center + span / 2;
  const project = (lane: number, depth: number) => {
    const perspective = portraitScaleAtDepth(depth);
    return {
      x: 210 + (lane - focus) * 222 * perspective,
      y: 148 + 362 * perspective,
      perspective,
    };
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
    path("M-600 148 Q210 130 1020 148 L1020 700 H-600 Z", "#1c464b"),
  ];
  // Constant scene budget independent of roster size and accumulated distance.
  // Recycle a fixed band of scenery lanes, including beyond the roster. The
  // whole plane continues to a common vanishing point and below the viewport;
  // the measured distance window is not a rectangular cutout in the scenery.
  const firstLane = Math.floor(focus) - 8;
  const lastLane = Math.ceil(focus) + 8;
  const foreground = portraitDepthAt(700);
  for (let i = firstLane; i <= lastLane; i++) {
    ground.push(path(
      `M210,148 L${point(i + 0.5, foreground)} L${point(i - 0.5, foreground)} Z`,
      ordered[i]?.you ? "#255659" : i % 2 ? "#183e44" : "#1c464b",
    ));
    ground.push(path(`M210,148 L${point(i - 0.5, foreground)}`, "none", {
      stroke: ordered[i]?.you ? "#f7c948" : "#7b9a91",
      strokeWidth: ordered[i]?.you ? 2 : 1, strokeOpacity: 0.65,
    }));
  }
  const rawStep = span / 5;
  const power = 10 ** Math.floor(Math.log10(rawStep));
  const step = [1, 2, 5, 10].find(n => n * power >= rawStep)! * power;
  // Fixed-size continuation beyond the ruler: increasingly distant survey
  // lines approach the horizon. They remain tied to distance while panning.
  for (const multiple of [1, 2, 4, 8, 16, 32]) {
    const value = (Math.ceil(max / step) + multiple) * step;
    const depth = (max - value) / span;
    ground.push(path(`M${point(focus - 8, depth)} L${point(focus + 8, depth)}`, "none", {
      stroke: "#b4c8b8", strokeOpacity: 0.16 / Math.sqrt(multiple), strokeWidth: 1,
    }));
  }
  const ticks: { value: number; y: number }[] = [];
  for (let value = Math.max(0, Math.ceil(min / step) * step); value <= max + step * 0.001; value += step) {
    const depth = (max - value) / span;
    const y = project(focus, depth).y;
    ticks.push({ value, y });
    ground.push(path(`M0 ${y} H420`, "none", {
      stroke: value === 0 ? "#f7c948" : "#b4c8b8", strokeOpacity: value === 0 ? 0.85 : 0.26,
      strokeWidth: value === 0 ? 2 : 1,
    }));
  }
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
    const depth = (max - lane.value) / span;
    const p = project(i, outside ? 0 : depth);
    return {
      ...lane,
      ...p,
      outside,
      direction: delta > 0 ? "↑" : "↓",
      gap: lane.value - (me?.value ?? 0),
      scale: (lane.ghost ? 0.85 : 1) * Math.max(0.6, p.perspective),
      color: lane.ghost
        ? "#c9d6e3"
        : lane.you
          ? "#f7c948"
          : "#c9d6e3",
      trail:
        outside || !competeFieldIncludesStart(view)
          ? ""
          : (() => {
              const startDepth = Math.min(1, max / span);
              if (startDepth <= depth) return "";
              const a = project(i, depth);
              const b = project(i, startDepth);
              return `M${a.x} ${a.y} L${b.x} ${b.y}`;
            })(),
    };
  });
  const rivals = ordered
    .filter((l) => !l.you && l.value > (me?.value ?? 0))
    .sort((a, b) => a.value - b.value);
  return {
    ticks,
    min,
    max,
    ground: [
      {
        tag: "defs",
        attrs: {},
        children: [
          {
            tag: "clipPath",
            attrs: { id: `${prefix}-curve` },
            children: [path("M-100 148 Q210 130 520 148 V700 H-100Z", "white")],
          },
          {
            tag: "linearGradient",
            attrs: { id: `${prefix}-depth-fade`, gradientUnits: "userSpaceOnUse", x1: 0, y1: 148, x2: 0, y2: 245 },
            children: [
              { tag: "stop", attrs: { offset: "0%", stopColor: "white", stopOpacity: 0 } },
              { tag: "stop", attrs: { offset: "100%", stopColor: "white", stopOpacity: 1 } },
            ],
          },
          {
            tag: "mask",
            attrs: { id: `${prefix}-atmosphere`, maskUnits: "userSpaceOnUse", x: -100, y: 130, width: 620, height: 570 },
            children: [{ tag: "rect", attrs: { x: -100, y: 130, width: 620, height: 570, fill: `url(#${prefix}-depth-fade)` } }],
          },
        ],
      },
      {
        tag: "g",
        attrs: { clipPath: `url(#${prefix}-curve)`, mask: `url(#${prefix}-atmosphere)` },
        children: ground,
      },
    ] as FieldNode[],
    markers: markers.filter(m => !m.outside && m.x > -45 && m.x < 465).sort((a, b) => a.y - b.y),
    outside: markers.filter(m => m.outside),
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

/** Camera-space scale; shared by projection and lateral gesture anchoring. */
export function portraitScaleAtDepth(depth: number) {
  return 1 / (3 - 2 * depth);
}

/** Inverse of y = horizon + camera height * perspective. */
export function portraitDepthAt(y: number) {
  const perspective = Math.max(1 / 6, Math.min(2, (y - 148) / 362));
  return (3 - 1 / perspective) / 2;
}
