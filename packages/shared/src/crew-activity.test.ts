import { expect, it } from "vitest";
import { freshState } from "./compete/engine";
import { homeRecentActivities, recentActivityStart, type CrewActivity } from "./crew-activity";
const now = new Date("2026-10-23T16:00:00Z");
const row = (patch: Partial<CrewActivity> = {}): CrewActivity => ({ id: "peer-activity", userId: "peer", name: "Peer", avatarUrl: null, sport: "cycling", startedAt: "2026-10-22T15:00:00Z", distanceM: 1000, movingSec: 600, verified: true, source: "strava", ...patch });
it("deduplicates a member across crews and excludes future/stale rows", () => {
  const state = freshState(now);
  const rows = [row(), row({ id: "newest", startedAt: "2026-10-23T15:00:00Z" }), row({ userId: "future", startedAt: "2026-10-24T15:00:00Z" }), row({ userId: "old", startedAt: "2026-10-21T15:00:00Z" })];
  expect(homeRecentActivities(state, "self", rows, now).map(a => a.id)).toEqual(["newest"]);
});
it("prefers the local athlete's eligible activity over a stale API copy", () => {
  const state = freshState(now);
  state.activities = [{ id: "own", sport: "strength", startedAt: "2026-10-23T15:00:00Z", distanceM: 0, movingSec: 1800, avgHr: null, source: "manual", provenance: "manual", verified: false, disposition: "counted" }];
  const rows = homeRecentActivities(state, "self", [row({ userId: "self" }), row()], now);
  expect(rows.map(a => a.id)).toEqual(["own", "peer-activity"]);
  expect(rows[0]?.ownActivity?.id).toBe("own");
});
it("uses Eastern calendar dates rather than a rolling 48-hour cutoff", () => {
  expect(recentActivityStart(new Date("2026-11-02T02:00:00Z"))).toBe("2026-10-31T04:00:00.000Z");
  expect(homeRecentActivities(freshState(now), "self", [row({ startedAt: "2026-10-22T03:59:59Z" })], now)).toEqual([]);
});
it("keeps up to three recent own activities so a later gym session does not hide a GPS route", () => {
  const state = freshState(now);
  state.activities = [1, 2, 3, 4].map(i => ({ id: `own-${i}`, sport: "running", startedAt: `2026-10-23T${10 + i}:00:00Z`, distanceM: 5000, movingSec: 1800, avgHr: null, source: "garmin", provenance: "imported", disposition: "counted", verified: false }));
  expect(homeRecentActivities(state, "self", [], now).map(a => a.id)).toEqual(["own-4", "own-3", "own-2"]);
});
