import { MEDAL_GOLD } from "./appearance";
import { polishedLaneScale } from "./polished-identity";

/** Compete live-field markers only (not app icon or design studies). */
export const FIELD_LANE_CAPSULE_SCALE = 0.6;

export function fieldLaneMarkerScale(you: boolean) {
  return polishedLaneScale(you) * FIELD_LANE_CAPSULE_SCALE;
}

export function competeAthleteTrailColors(you: boolean, ghost = false) {
  const stroke = you ? MEDAL_GOLD.srgb : ghost ? "#98a6bc" : "#20b9c6";
  return {
    stroke,
    strokeWidth: 6,
    strokeOpacity: 1,
    dotFill: "#ffffff",
    dotStroke: you ? MEDAL_GOLD.srgb : "#98a6bc",
  };
}

