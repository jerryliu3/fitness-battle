/** Presentation only. A fixed distance window; never normalizes or changes standings. */
export interface ArenaViewWindow {
  center: number;
  span: number;
}
export interface ArenaSceneLane {
  id: string;
  name: string;
  initials: string;
  value: number;
  you?: boolean;
  ghost?: boolean;
  lastUpdated?: string;
}
export function arenaWindow(center: number, span: number) {
  const safeCenter = Number.isFinite(center) ? Math.max(0, center) : 0;
  const safeSpan = Number.isFinite(span)
    ? Math.max(0.5, Math.min(5000, span))
    : 6;
  return {
    min: safeCenter - safeSpan / 2,
    max: safeCenter + safeSpan / 2,
    center: safeCenter,
    span: safeSpan,
  };
}

/**
 * For 2D vertical lanes, ensures the starting line (0) remains near the bottom
 * of the visible track (leaving a minimal ~7% margin behind the line) rather
 * than centering on 0 and showing extensive empty space behind the start line.
 */
export function clampArenaLaneCenter(center: number, span: number): number {
  const safeSpan = Number.isFinite(span)
    ? Math.max(0.5, Math.min(5000, span))
    : 6;
  const minCenter = safeSpan * 0.43;
  const safeCenter = Number.isFinite(center) ? center : 0;
  return Math.max(minCenter, safeCenter);
}
export function arenaPosition(value: number, view: ArenaViewWindow) {
  const bounds = arenaWindow(view.center, view.span);
  return {
    fraction: Math.max(0, Math.min(1, (bounds.max - value) / bounds.span)),
    edge:
      value > bounds.max
        ? ("ahead" as const)
        : value < bounds.min
          ? ("behind" as const)
          : null,
  };
}
export function orderedArenaLanes<
  T extends { id: string; you?: boolean; ghost?: boolean },
>(lanes: readonly T[]) {
  const you = lanes.find((l) => l.you);
  const others = lanes
    .filter((l) => !l.you && !l.ghost)
    .slice()
    .sort((a, b) => a.id.localeCompare(b.id));
  const middle = Math.floor(others.length / 2);
  return you
    ? [...others.slice(0, middle), you, ...others.slice(middle)]
    : others;
}
export function fitArenaWindow(
  lanes: readonly ArenaSceneLane[],
): ArenaViewWindow {
  const values = lanes.filter((l) => !l.ghost).map((l) => l.value);
  const low = Math.min(0, ...values),
    high = Math.max(1, ...values);
  return { center: (low + high) / 2, span: Math.max(6, (high - low) * 1.15) };
}
