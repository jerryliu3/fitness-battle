/** Horizontal lane for a stop. Position lives on the stop — the route only reads centers. */
export type JourneyLane = "l" | "c" | "r";

export type JourneyPt = { x: number; y: number };

/**
 * Lane plan for an arbitrary stop list.
 * Default winding: future right → today center → sessions L/R/L… → start center.
 * Count and order are free to change; this is just one planner.
 */
export function planJourneyLanes(sessionCount: number): JourneyLane[] {
  return [
    "r",
    "c",
    ...Array.from(
      { length: sessionCount },
      (_, i): JourneyLane => (i % 2 === 0 ? "l" : "r"),
    ),
    "c",
  ];
}

/**
 * Dashed route determinator — only input is ordered stop centers (+ width for S-bulge).
 * No lane table, no parallel coordinate system: wherever the circles sit, the path follows.
 */
export function routeThroughCenters(
  centers: JourneyPt[],
  svgWidth: number,
): string[] {
  if (centers.length < 2 || svgWidth < 1) return [];
  const segs: string[] = [];
  const bulge = Math.max(48, svgWidth * 0.26);
  for (let i = 0; i < centers.length - 1; i++) {
    const p0 = centers[i]!;
    const p1 = centers[i + 1]!;
    const midY = (p0.y + p1.y) / 2;
    const rise = p1.y - p0.y;
    if (Math.abs(p0.x - p1.x) < 4) {
      const goRight = p0.x < svgWidth * 0.5;
      const outer = goRight ? p0.x + bulge : p0.x - bulge;
      const inner = goRight ? p0.x - bulge * 0.35 : p0.x + bulge * 0.35;
      segs.push(
        `M ${p0.x.toFixed(1)} ${p0.y.toFixed(1)} C ${outer.toFixed(1)} ${(p0.y + rise * 0.28).toFixed(1)}, ${inner.toFixed(1)} ${midY.toFixed(1)}, ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}`,
      );
    } else {
      segs.push(
        `M ${p0.x.toFixed(1)} ${p0.y.toFixed(1)} C ${p0.x.toFixed(1)} ${(p0.y + rise * 0.28).toFixed(1)}, ${p1.x.toFixed(1)} ${midY.toFixed(1)}, ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}`,
      );
    }
  }
  return segs;
}
