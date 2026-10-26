import { expect, it } from "vitest";
import {
  competeAthleteTrailColors,
  fieldLaneMarkerScale,
  FIELD_LANE_CAPSULE_SCALE,
} from "./compete-trail";
import { polishedLaneScale } from "./polished-identity";

it("keeps field capsule scale separate from study lane scale", () => {
  expect(fieldLaneMarkerScale(true)).toBeCloseTo(
    polishedLaneScale(true) * FIELD_LANE_CAPSULE_SCALE,
  );
});

it("uses the same opaque six-point solid stroke for every athlete", () => {
  for (const [you, ghost] of [[true, false], [false, false], [false, true]]) {
    expect(competeAthleteTrailColors(you, ghost)).toMatchObject({ strokeWidth: 6, strokeOpacity: 1 });
  }
});
