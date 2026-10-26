import { polishedLaneScale } from "./polished-identity";
import type { ArenaViewWindow } from "./arena-view";

/** Compete live-field markers only (not app icon or design studies). */
export const FIELD_LANE_CAPSULE_SCALE = 0.6;

export function fieldLaneMarkerScale(you: boolean) {
  return polishedLaneScale(you) * FIELD_LANE_CAPSULE_SCALE;
}

export function competeFieldIncludesStart(view: ArenaViewWindow) {
  return view.center - view.span / 2 <= 0;
}

export function competeAthleteTrailColors(you: boolean, ghost = false) {
  const stroke = you ? "#f7c948" : ghost ? "#c9d6e3" : "#d8e4ec";
  return {
    glow: stroke,
    glowOpacity: 0.22,
    stroke,
    strokeWidth: ghost ? 4 : 5,
    strokeOpacity: ghost ? 0.45 : 0.95,
    dotFill: "#ffffff",
    dotStroke: you ? "#f7c948" : "#98a6bc",
  };
}

/** Head and start positions in the same SVG/course coordinate space. */
export function competeStartTrailVector(
  headX: number,
  headY: number,
  startX: number,
  startY: number,
) {
  return { dx: startX - headX, dy: startY - headY };
}
