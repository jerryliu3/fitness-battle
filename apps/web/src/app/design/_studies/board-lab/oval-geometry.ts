/** A normalized display circuit, not a regulation track measurement or GPS route. */
export function lapPosition(distance: number, lapLength = 1) {
  const value = Math.max(0, Number.isFinite(distance) ? distance : 0);
  const normalized = value / lapLength;
  const laps = Math.floor(normalized + 1e-9);
  return { laps, fraction: Math.max(0, normalized - laps) };
}

/** Arc-length parameterization: start at the foot of the right straight, travel upward. */
export function ovalPoint(fraction: number, radius: number, straight = 270) {
  const perimeter = 2 * straight + 2 * Math.PI * radius;
  let d = ((fraction % 1) + 1) % 1 * perimeter;
  if (d < straight) return { x: radius, y: straight / 2 - d, angle: 0 };
  d -= straight;
  if (d < Math.PI * radius) {
    const t = -d / radius;
    return { x: radius * Math.cos(t), y: -straight / 2 + radius * Math.sin(t), angle: t * 180 / Math.PI };
  }
  d -= Math.PI * radius;
  if (d < straight) return { x: -radius, y: -straight / 2 + d, angle: 180 };
  d -= straight;
  const t = Math.PI - d / radius;
  return { x: radius * Math.cos(t), y: straight / 2 + radius * Math.sin(t), angle: t * 180 / Math.PI };
}

export function ovalPath(radius: number, straight = 270) {
  const h = straight / 2;
  return `M${radius} ${h}V${-h}A${radius} ${radius} 0 0 0 ${-radius} ${-h}V${h}A${radius} ${radius} 0 0 0 ${radius} ${h}Z`;
}
/** Offset along the local normal, keeping the endpoint aligned with the actual athlete. */
export function ovalOffsetPoint(fraction: number, radius: number, offset: number, straight = 270) {
  const p = ovalPoint(fraction, radius, straight), angle = p.angle * Math.PI / 180;
  return { ...p, x: p.x + offset * Math.cos(angle), y: p.y + offset * Math.sin(angle) };
}

export function ovalArc(from: number, to: number, radius: number, straight = 270, offset = 0) {
  const steps = Math.max(1, Math.ceil(Math.abs(to - from) * 180));
  return Array.from({ length: steps + 1 }, (_, i) => {
    const p = ovalOffsetPoint(from + (to - from) * i / steps, radius, offset, straight);
    return `${i ? "L" : "M"}${p.x.toFixed(3)} ${p.y.toFixed(3)}`;
  }).join(" ");
}
