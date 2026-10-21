import { describe, expect, it } from "vitest";
import { crewSessionInstant } from "./crew-sessions";
describe("crew session wall time", () => {
  it("resolves Eastern summer and winter offsets", () => {
    expect(crewSessionInstant("2026-10-24", "08:00")).toBe(
      "2026-10-24T12:00:00.000Z",
    );
    expect(crewSessionInstant("2026-11-07", "08:00")).toBe(
      "2026-11-07T13:00:00.000Z",
    );
  });
  it("rejects DST gaps and invalid calendar days", () => {
    expect(() => crewSessionInstant("2027-03-14", "02:30")).toThrow();
    expect(() => crewSessionInstant("2026-02-30", "08:00")).toThrow();
  });
  it("chooses the earlier occurrence of a repeated clock time", () => {
    expect(crewSessionInstant("2026-11-01", "01:30")).toBe(
      "2026-11-01T05:30:00.000Z",
    );
  });
});
