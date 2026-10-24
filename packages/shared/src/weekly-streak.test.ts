import { expect, it } from "vitest";
import { weeklyActivityStreak } from "./weekly-streak";
import type { Activity } from "./compete/sports";
const row = (startedAt: string, extra: Partial<Activity> = {}): Activity => ({ id: startedAt, sport: "running", startedAt, movingSec: 600, distanceM: 1000, avgHr: null, verified: false, source: "manual", provenance: "manual", disposition: "counted", ...extra });
it("counts active Eastern weeks across DST and ignores duplicate sessions", () => {
  const rows = [row("2026-11-02T05:00:00Z"), row("2026-11-02T06:00:00Z"), row("2026-11-02T04:59:59Z"), row("2026-10-20T12:00:00Z")];
  expect(weeklyActivityStreak(rows, new Date("2026-11-03T12:00:00Z"))).toEqual({ count: 3, active: true });
});
it("dims the still-completable week and breaks after a missed full week", () => {
  const rows = [row("2026-10-20T12:00:00Z")];
  expect(weeklyActivityStreak(rows, new Date("2026-10-27T12:00:00Z"))).toEqual({ count: 1, active: false });
  expect(weeklyActivityStreak(rows, new Date("2026-11-03T12:00:00Z"))).toEqual({ count: 0, active: false });
});
it("ignores future, excluded, sample, pending and zero-volume sessions", () => {
  const rows = [row("2026-10-24T12:00:00Z"), row("2026-10-20T12:00:00Z", { disposition: "excluded" }), row("2026-10-20T12:00:00Z", { provenance: "demo" }), row("2026-10-20T12:00:00Z", { disposition: "pending" }), row("2026-10-20T12:00:00Z", { movingSec: 0, distanceM: 0 })];
  expect(weeklyActivityStreak(rows, new Date("2026-10-23T12:00:00Z"))).toEqual({ count: 0, active: false });
});
