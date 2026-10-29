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
    const f = model.finish;
    // Print the checks in the top plane and wrap down the front face of the block.
    const strip = 10 / length;
    const a = Math.max(0, f - strip / 2);
    const b = Math.min(1, f + strip / 2);
    const surface = (fraction: number, depth: number) => {
      const front = point(fraction), back = point(fraction, true);
      return `${front.x + (back.x - front.x) * depth} ${front.y + (back.y - front.y) * depth}`;
    };
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 2; col++) {
        const x0 = a + (b - a) * col / 2, x1 = a + (b - a) * (col + 1) / 2;
        const y0 = row / 8, y1 = (row + 1) / 8;
        finish.push(path(`M${surface(x0, y0)} L${surface(x1, y0)} L${surface(x1, y1)} L${surface(x0, y1)}Z`, (row + col) % 2 ? "#ffffff" : "#142b3b"));
      }
    }
    const faceSurface = (fraction: number, depth: number) => {
      const topPt = point(fraction, false, false), bottomPt = point(fraction, false, true);
      return `${topPt.x + (bottomPt.x - topPt.x) * depth} ${topPt.y + (bottomPt.y - topPt.y) * depth}`;
    };
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 2; col++) {
        const x0 = a + (b - a) * col / 2, x1 = a + (b - a) * (col + 1) / 2;
        const y0 = row / 4, y1 = (row + 1) / 4;
        finish.push(path(`M${faceSurface(x0, y0)} L${faceSurface(x1, y0)} L${faceSurface(x1, y1)} L${faceSurface(x0, y1)}Z`, (row + col) % 2 ? "#ffffff" : "#142b3b"));
      }
    }
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
