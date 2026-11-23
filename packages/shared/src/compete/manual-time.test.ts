import { expect, it } from "vitest";
import { APP_TIMEZONE } from "../timezone";
import { manualActivityInstant, parseManualActivity } from "./manual-input";
it("preserves now when time is omitted", () => {
  expect(manualActivityInstant("", new Date("2026-10-23T16:00:00Z"))).toEqual({ startedAt: "2026-10-23T16:00:00.000Z", error: null });
});
it("resolves today's Eastern wall time across UTC midnight", () => {
  expect(manualActivityInstant("20:30", new Date("2026-10-24T02:00:00Z"), APP_TIMEZONE)).toEqual({ startedAt: "2026-10-24T00:30:00.000Z", error: null });
});
it("resolves today's account wall time across UTC midnight", () => {
  expect(manualActivityInstant("17:30", new Date("2026-10-24T02:00:00Z"), "America/Los_Angeles")).toEqual({ startedAt: "2026-10-24T00:30:00.000Z", error: null });
});
it("rejects future times, invalid input and the spring DST gap", () => {
  expect(manualActivityInstant("13:00", new Date("2026-10-23T16:00:00Z")).error).toBeTruthy();
  expect(manualActivityInstant("25:00", new Date("2026-10-23T16:00:00Z")).error).toBeTruthy();
  expect(manualActivityInstant("02:30", new Date("2026-03-08T16:00:00Z"), APP_TIMEZONE).error).toBeTruthy();
});
it("uses the earlier occurrence for a repeated Eastern hour", () => {
  expect(manualActivityInstant("01:30", new Date("2026-11-01T16:00:00Z"), APP_TIMEZONE)).toEqual({ startedAt: "2026-11-01T05:30:00.000Z", error: null });
  expect(manualActivityInstant("08:30", new Date("2026-10-23T16:00:00Z"), APP_TIMEZONE, "2026-10-20")).toEqual({ startedAt: "2026-10-20T12:30:00.000Z", error: null });
  expect(manualActivityInstant("08:30", new Date("2026-10-23T16:00:00Z"), APP_TIMEZONE, "2026-10-25").error).toBeTruthy();
});
it("converts metric distance without changing the default mile contract", () => {
  expect(parseManualActivity("running", "5", "30", "metric")).toEqual({ distanceM: 5000, movingSec: 1800, error: null });
  expect(parseManualActivity("running", "5", "30")).toEqual({ distanceM: 8046.72, movingSec: 1800, error: null });
});
