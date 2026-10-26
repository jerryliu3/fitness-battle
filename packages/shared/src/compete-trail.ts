import { polishedLaneScale } from "./polished-identity";
import type { ArenaViewWindow } from "./arena-view";

/** Product field markers only — app icon / design studies keep `polishedLaneScale`. */
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
    stroke,
    dotFill: "#ffffff",
    dotStroke: you ? "#f7c948" : "#98a6bc",
  };
}
