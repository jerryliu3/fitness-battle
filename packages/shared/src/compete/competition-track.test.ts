import { describe, expect, it } from "vitest";
import { competitionTrack, competitionTrackLabel } from "./sports";
describe("competition track", () => {
  it("uses GPS for running and cycling and Open for walking and strength", () => {
    expect(["running", "cycling", "walking", "strength"].map(s => competitionTrack(s as "running"))).toEqual(["verified", "verified", "open", "open"]);
    expect(competitionTrackLabel("running")).toBe("GPS Tracked");
  });
});
