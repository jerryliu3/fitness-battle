/** Stable world coordinates, with bounded detail when a camera spans a large distance. */
export function progressSamples(from: number, to: number, spacing: number, budget = 150) {
  const stride = 2 ** Math.max(0, Math.ceil(Math.log2(Math.max(spacing, to - from) / spacing / budget)));
  const step = spacing * stride;
  const values: number[] = [];
  for (let d = Math.max(0, Math.ceil((from - 1e-8) / step) * step); d <= to + 1e-8 && values.length <= budget; d += step) values.push(Number(d.toFixed(7)));
  return values;
}

/** Paint remains on the centerline; only its strength changes through the wake. */
export function traceOpacity(distance: number, total: number, clearance: number, mode: "underlay" | "blend") {
  if (mode === "underlay") return .22;
  const t = Math.max(0, Math.min(1, (total - distance) / Math.max(.000001, clearance)));
  return .07 + .51 * t * t * (3 - 2 * t);
}

/** Bounded vertices for a continuous ribbon on a straight, winding or oval path. */
export function traceSegments(from: number, to: number, spacing: number) {
  if (to <= from) return [];
  const count = Math.min(120, Math.max(1, Math.ceil((to - from) / spacing)));
  return Array.from({ length: count }, (_, i) => ({ from: from + (to - from) * i / count, to: from + (to - from) * (i + 1) / count }));
}
