import { describe, expect, it } from "vitest";
import { crewContractTarget, crewContractValue, crewSeasonBounds, crewPassportError, crewStampLabel, crewSeasonProgress, crewContractMetrics } from "./crew-passport";

describe("crew contracts and passport presentation", () => {
  it("converts displayed targets to canonical values without changing sport scores", () => {
    expect(crewContractMetrics("strength").some(m => m.id === "distance_m")).toBe(false);
    expect(crewContractTarget("distance_m", "12.5")).toBe(12500);
    expect(crewContractTarget("moving_sec", "2.5")).toBe(9000);
    expect(crewContractTarget("sessions", "4")).toBe(4);
    expect(() => crewContractTarget("contributors", "1.5")).toThrow();
    for (const input of ["", "-1", "Infinity", "NaN"]) expect(() => crewContractTarget("sessions", input)).toThrow();
  });
  it("resolves season dates as half-open Eastern instants across DST", () => {
    const spring = crewSeasonBounds("2026-03-02", "2026-03-09");
    expect(spring).toEqual({ startsAt: "2026-03-02T05:00:00.000Z", endsAt: "2026-03-09T04:00:00.000Z" });
    const fall = crewSeasonBounds("2026-10-26", "2026-11-02");
    expect(fall).toEqual({ startsAt: "2026-10-26T04:00:00.000Z", endsAt: "2026-11-02T05:00:00.000Z" });
    expect(() => crewSeasonBounds("2026-11-11", "2026-11-11")).toThrow();
    expect(() => crewSeasonBounds("2026-02-30", "2026-03-09")).toThrow();
  });
  it("clamps configurable season progress to its actual bounds", () => {
    const season = { id: "s", crew_id: "c", title: "S", starts_at: "2026-11-01T05:00Z", ends_at: "2026-12-01T05:00Z", time_zone: "America/New_York" };
    expect(crewSeasonProgress(season, "2026-10-01T05:00Z")).toBe(0);
    expect(crewSeasonProgress(season, "2026-11-16T05:00Z")).toBe(50);
    expect(crewSeasonProgress(season, "2027-01-01T05:00Z")).toBe(100);
  });
  it("keeps persisted stamp codes extendable and metric units explicit", () => {
    expect(crewStampLabel("contract_finish")).toBe("Shared finish");
    expect(crewStampLabel("future_chapter")).toBe("future chapter");
    expect(crewContractValue("moving_sec", 5400)).toBe("1.5 h");
    expect(crewContractValue("distance_m", 1000, "metric")).toContain("km");
    expect(crewPassportError("contract_changed")).toContain("teammate");
  });
});
