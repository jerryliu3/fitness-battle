import { expect, it } from "vitest";
import {
  competeFieldIncludesStart,
  competeStartTrailVector,
  fieldLaneMarkerScale,
  FIELD_LANE_CAPSULE_SCALE,
} from "./compete-trail";
import { polishedLaneScale } from "./polished-identity";

it("keeps field capsule scale separate from study lane scale", () => {
  expect(fieldLaneMarkerScale(true)).toBeCloseTo(
    polishedLaneScale(true) * FIELD_LANE_CAPSULE_SCALE,
  );
});

it("only draws start trails when distance zero is in the view window", () => {
  expect(competeFieldIncludesStart({ center: 10, span: 4 })).toBe(false);
  expect(competeFieldIncludesStart({ center: 2, span: 4 })).toBe(true);
});

it("computes start trail offsets in course space", () => {
  expect(competeStartTrailVector(10, 20, 4, 8)).toEqual({ dx: -6, dy: -12 });
});
