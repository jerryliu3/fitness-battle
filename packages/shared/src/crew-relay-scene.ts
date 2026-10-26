import type { FieldNode } from "./field-course";
import type { crewRelay } from "./compete/crew-relay";
type Relay = ReturnType<typeof crewRelay>;
const path = (
  d: string,
  fill: string,
  extra: FieldNode["attrs"] = {},
): FieldNode => ({ tag: "path", attrs: { d, fill, ...extra } });
export function crewRelayScene(model: Relay, width: number, prefix: string) {
  const length = Math.max(180, width - 52),
    left = 16;
  const point = (fraction: number, back = false, bottom = false) => ({
    x: left + fraction * length + (back ? 24 : 0),
    y:
      174 -
      fraction * 30 +
      (back ? -46 : 0) +
      (bottom ? 18 : 0),
  });
  const p = (fraction: number, back = false, bottom = false) => {
    const { x, y } = point(fraction, back, bottom);
    return `${x} ${y}`;
  };
  const top = (a: number, b: number) =>
    `M${p(a)} L${p(b)} L${p(b, true)} L${p(a, true)}Z`;
  const face = (a: number, b: number) =>
    `M${p(a)} L${p(b)} L${p(b, false, true)} L${p(a, false, true)}Z`;
  const ground: FieldNode[] = [
    path(top(0, 1), "#e4ece8"),
    path(face(0, 1), "#c7d5cf"),
    path(`M${p(0)} L${p(1)}`, "none", { stroke: "#d3dfd9", strokeWidth: 2 }),
  ];
  const segments = model.segments
    .filter((s) => s.fraction > 0)
    .map((s, i) => ({
      id: s.id,
      nodes: [
        {
          tag: "defs",
          attrs: {},
          children: [
            {
              tag: "linearGradient",
              attrs: {
                id: `${prefix}-${i}`,
                x1: "0",
                y1: "0",
                x2: "0",
                y2: "1",
              },
              children: [
                { tag: "stop", attrs: { offset: 0, stopColor: s.color } },
                {
                  tag: "stop",
                  attrs: { offset: 1, stopColor: s.color, stopOpacity: 0.7 },
                },
              ],
            },
          ],
        },
        path(face(s.start, s.start + s.fraction), s.color),
        path(top(s.start, s.start + s.fraction), `url(#${prefix}-${i})`),
        path(`M${p(s.start)} L${p(s.start, true)}`, "none", {
          stroke: "white",
          strokeWidth: 1,
          opacity: 0.7,
        }),
      ] as FieldNode[],
    }));
  const finish: FieldNode[] = [];
  if (model.finish !== null) {
    const f = model.finish,
      strip = 0.018,
      a = Math.max(0, f - strip),
      b = Math.min(1, f + strip),
      patternId = `${prefix}-finish`;
    finish.push(
      {
        tag: "defs",
        attrs: {},
        children: [
          {
            tag: "pattern",
            attrs: {
              id: patternId,
              width: 8,
              height: 8,
              patternUnits: "userSpaceOnUse",
            },
            children: [
              {
                tag: "rect",
                attrs: { width: 4, height: 4, fill: "#142b3b" },
              },
              {
                tag: "rect",
                attrs: { x: 4, y: 4, width: 4, height: 4, fill: "#142b3b" },
              },
              {
                tag: "rect",
                attrs: { x: 4, width: 4, height: 4, fill: "#ffffff" },
              },
              {
                tag: "rect",
                attrs: { y: 4, width: 4, height: 4, fill: "#ffffff" },
              },
            ],
          },
        ],
      },
      path(face(a, b), `url(#${patternId})`, { opacity: 0.95 }),
      path(`M${p(f)} L${p(f, false, true)}`, "none", {
        stroke: "#142b3b",
        strokeWidth: 2,
        opacity: 0.85,
      }),
    );
    const { x: bx, y: by } = point(f, true);
    finish.push(
      {
        tag: "line",
        attrs: {
          x1: bx,
          y1: by,
          x2: bx,
          y2: by - 18,
          stroke: "#142b3b",
          strokeWidth: 2,
        },
      },
      path(`M${bx} ${by - 18}h22v12h-22Z`, "#142b3b"),
      path(`M${bx + 11} ${by - 18}h11v6h-11Z`, "#ffffff"),
    );
  }
  const people = model.segments.map((s, i) => {
    const x = left + ((i + 0.5) * length) / Math.max(1, model.segments.length),
      fraction = s.start + s.fraction / 2;
    return {
      id: s.id,
      x,
      y: 20,
      anchorX: left + fraction * length + 12,
      anchorY: 151 - fraction * 30,
      color: s.color,
    };
  });
  for (const person of people)
    ground.push(
      path(
        `M${person.x} 94 Q${person.x} 116 ${person.anchorX} ${person.anchorY}`,
        "none",
        { stroke: person.color, strokeWidth: 1.5, strokeDasharray: "3 4" },
      ),
    );
  return {
    ground,
    segments,
    finish,
    people,
    finishX: model.finish === null ? null : left + model.finish * length,
    height: 250,
  };
}
