import type { ArenaViewWindow } from "./arena-view";

/** Camera travel is measured in visible windows, so miles and points feel alike. */
export function fieldFlightDuration(from: ArenaViewWindow, to: ArenaViewWindow, lanes = 0): number {
  const distance = Math.abs(to.center - from.center) / Math.max(.5, from.span, to.span);
  return Math.min(1250, 320 + 210 * Math.log2(1 + distance + Math.abs(lanes)));
}

/** Zero velocity and acceleration at both ends. */
export function fieldFlightEase(progress: number): number {
  const t = Math.max(0, Math.min(1, progress));
  return t * t * t * (t * (t * 6 - 15) + 10);
}

export function fieldZoomSpan(span: number, unit: string): number {
  return Math.max(unit === "pts" ? 2 : .5, Math.min(unit === "pts" ? 100 : 40, span));
}

/** Keep the distance beneath the fingers fixed, including a moving pinch midpoint. */
export function pinchFieldView(from: ArenaViewWindow, span: number, fromDepth: number, toDepth = fromDepth): ArenaViewWindow {
  return { span, center: from.center + (.5 - fromDepth) * from.span - (.5 - toDepth) * span };
}
