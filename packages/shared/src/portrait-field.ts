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
  // A pinhole projection of a flat distance plane. Both markers and survey
  // lines use this function; no rank compression or far-athlete edge pinning.
  const span = Math.max(0.0001, view.span);
  const min = view.center - span / 2;
  const max = view.center + span / 2;
  const project = (lane: number, depth: number) => {
    const perspective = 1 / (2 - depth);
    return {
      x: 210 + (lane - focus) * 110 * perspective,
      y: 180 + 330 * depth * perspective,
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
    path("M-600 208 Q210 86 1020 208 L1020 650 H-600 Z", "#1c464b"),
  ];
  // Constant scene budget independent of roster size and accumulated distance.
  const firstLane = Math.max(-1, Math.floor(focus) - 7);
  const lastLane = Math.min(ordered.length, Math.ceil(focus) + 7);
  for (let i = firstLane; i <= lastLane; i++) {
    ground.push(path(
      `M${point(i - 0.5, 0)} L${point(i + 0.5, 0)} L${point(i + 0.5, 1)} L${point(i - 0.5, 1)} Z`,
      ordered[i]?.you ? "#255659" : i % 2 ? "#183e44" : "#1c464b",
    ));
    ground.push(path(`M${point(i - 0.5, 0)} L${point(i - 0.5, 1)}`, "none", {
      stroke: ordered[i]?.you ? "#f7c948" : "#7b9a91",
      strokeWidth: ordered[i]?.you ? 2 : 1, strokeOpacity: 0.65,
    }));
  }
  const rawStep = span / 5;
  const power = 10 ** Math.floor(Math.log10(rawStep));
  const step = [1, 2, 5, 10].find(n => n * power >= rawStep)! * power;
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
      scale: (lane.ghost ? 0.85 : 1) * p.perspective,
      color: lane.ghost
        ? "#c9d6e3"
        : lane.you
          ? "#f7c948"
          : "#c9d6e3",
      trail: outside ? "" : (() => {
        const end = Math.min(1, (max - Math.max(0, lane.value - span * 0.18)) / span);
        const a = project(i, depth), b = project(i, end);
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

/** Inverse ground projection, used to keep the grabbed distance under the finger. */
export function portraitDepthAt(y: number) {
  const q = Math.max(-0.3, Math.min(1.8, (y - 180) / 330));
  return 2 * q / (1 + q);
}
