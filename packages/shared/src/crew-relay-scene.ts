import type { FieldNode } from "./field-course";
import type { crewRelay } from "./compete/crew-relay";
type Relay = ReturnType<typeof crewRelay>;
const path = (
  d: string,
  fill: string,
  extra: FieldNode["attrs"] = {},
): FieldNode => ({ tag: "path", attrs: { d, fill, ...extra } });
/** Projected extruded ribbon, shared by native SVG and DOM SVG. Width encodes the same canonical fractions. */
export function crewRelayScene(model: Relay, width: number, prefix: string) {
  const length = Math.max(180, width - 52),
    left = 16;
  const p = (fraction: number, back = false, bottom = false) =>
    `${(left + fraction * length + (back ? 14 : 0)).toFixed(2)} ${(74 - fraction * 18 + (back ? -18 : 0) + (bottom ? 23 : 0)).toFixed(2)}`;
  const top = (a: number, b: number) =>
    `M${p(a)} L${p(b)} L${p(b, true)} L${p(a, true)} Z`;
  const face = (a: number, b: number) =>
    `M${p(a)} L${p(b)} L${p(b, false, true)} L${p(a, false, true)} Z`;
  const ground: FieldNode[] = [
    path(
      `M${p(0, false, true)} L${p(1, false, true)} l16 9 L24 111 Z`,
      "#282f2c",
      { opacity: 0.08 },
    ),
    path(top(0, 1), "#eef0e9"),
    path(face(0, 1), "#d9e0d4"),
    path(`M${p(1)} L${p(1, true)} l0 23 L${p(1, false, true)} Z`, "#b9c5b5"),
  ];
  const segments = model.segments
    .filter((s) => s.fraction > 0)
    .map((s, i) => {
      const id = `${prefix}-relay-${i}`;
      const nodes: FieldNode[] = [
        {
          tag: "defs",
          attrs: {},
          children: [
            {
              tag: "linearGradient",
              attrs: { id, x1: "0%", y1: "0%", x2: "0%", y2: "100%" },
              children: [
                {
                  tag: "stop",
                  attrs: {
                    offset: "0%",
                    stopColor: "#ffffff",
                    stopOpacity: 0.5,
                  },
                },
                {
                  tag: "stop",
                  attrs: {
                    offset: "40%",
                    stopColor: s.color,
                    stopOpacity: 0.9,
                  },
                },
                { tag: "stop", attrs: { offset: "100%", stopColor: s.color } },
              ],
            },
          ],
        },
        path(face(s.start, s.start + s.fraction), s.color),
        path(face(s.start, s.start + s.fraction), "#282f2c", { opacity: 0.16 }),
        path(top(s.start, s.start + s.fraction), `url(#${id})`),
        {
          tag: "line",
          attrs: {
            x1: left + s.start * length,
            y1: 74 - s.start * 18,
            x2: left + (s.start + s.fraction) * length,
            y2: 74 - (s.start + s.fraction) * 18,
            stroke: "#ffffff",
            strokeOpacity: 0.65,
            strokeWidth: 1.3,
          },
        },
      ];
      return { id: s.id, nodes };
    });
  const finish: FieldNode[] = [];
  if (model.finish !== null) {
    const x = left + model.finish * length,
      y = 74 - model.finish * 18;
    // A checkered stripe crosses the full track; contributions can visibly pass it.
    finish.push(
      path(`M${p(model.finish)} L${p(model.finish, true)}`, "none", {
        stroke: "#142b3b",
        strokeWidth: 7,
      }),
      path(`M${p(model.finish)} L${p(model.finish, true)}`, "none", {
        stroke: "#ffffff",
        strokeWidth: 7,
        strokeDasharray: "4 4",
      }),
    );
    finish.push(
      {
        tag: "line",
        attrs: {
          x1: x,
          y1: y - 31,
          x2: x,
          y2: y + 28,
          stroke: "#282f2c",
          strokeWidth: 2,
        },
      },
      {
        tag: "line",
        attrs: {
          x1: x + 14,
          y1: y - 49,
          x2: x + 14,
          y2: y + 5,
          stroke: "#282f2c",
          strokeWidth: 2,
        },
      },
    );
    for (let i = 0; i < 6; i++)
      finish.push(
        path(
          `M${x + (i * 14) / 6} ${y - 31 - i * 3} l${14 / 6} -3 v8 l${-14 / 6} 3 Z`,
          i % 2 ? "#ffffff" : "#282f2c",
        ),
      );
  }
  return { ground, segments, finish };
}
