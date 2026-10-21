/** Stable world coordinates, with bounded detail when a camera spans a large distance. */
export function progressSamples(from: number, to: number, spacing: number, budget = 150) {
  const stride = 2 ** Math.max(0, Math.ceil(Math.log2(Math.max(spacing, to - from) / spacing / budget)));
  const step = spacing * stride;
  const values: number[] = [];
  for (let d = Math.max(0, Math.ceil((from - 1e-8) / step) * step); d <= to + 1e-8 && values.length <= budget; d += step) values.push(Number(d.toFixed(7)));
  return values;
}

/** Bend around the entire wake rather than shortening the amount of distance drawn. */
export function wakeBypass(distance: number, total: number, clearance: number, shoulder: number) {
  const t = Math.max(0, Math.min(1, 2 - (total - distance) / Math.max(.000001, clearance)));
  return shoulder * t * t * (3 - 2 * t);
}
