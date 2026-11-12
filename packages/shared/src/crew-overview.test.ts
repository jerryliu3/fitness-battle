import { expect, it } from "vitest";
import { crewLineup, crewOverview, crewReplayEvents, type CrewOverviewInput } from "./crew-overview";
const input: CrewOverviewInput = {
  now: "2026-11-11T18:00:00Z", sport: "running", format: "volume", targetSessions: 4, targetDistanceM: 1000, units: "metric",
  members: [{ user_id: "a", display_name: "Alice" }, { user_id: "b", display_name: "Bob" }],
  entries: [{ user_id: "a", distance_m: 1000, moving_sec: 600, started_at: "2026-11-10T12:00:00Z" }, { user_id: "b", distance_m: 500, moving_sec: 300, started_at: "2026-11-10T12:00:00Z" }],
};
it("smoothly replays individual contributions even when all timestamps match", () => {
  const events = crewReplayEvents(input, input.entries);
  expect(crewOverview(input, 0, events).relay.model.total).toBe(0);
  expect(crewOverview(input, 0.25, events).relay.model.total).toBe(500);
  expect(crewOverview(input, 0.5, events).relay.model.total).toBe(1000);
  expect(crewOverview(input, 0.75, events).relay.model.total).toBe(1250);
  const before = crewOverview(input, 0.25, events).relay.model;
  const after = crewOverview(input, 1, events).relay.model;
  expect(before.finish).toBe(after.finish);
  expect(before.segments.map(s => [s.id, s.color])).toEqual(after.segments.map(s => [s.id, s.color]));
});
it("omits future, out-of-week and non-member replay events", () => {
  const extra = [
    { ...input.entries[0]!, started_at: "2026-11-08T12:00:00Z" },
    { ...input.entries[0]!, started_at: "2026-11-12T12:00:00Z" },
    { ...input.entries[0]!, user_id: "outsider" },
  ];
  expect(crewReplayEvents(input, [...input.entries, ...extra])).toHaveLength(2);
});
it("orders the lineup by exact weekly distance, preserving zero contributors", () => {
  const members = [...input.members, { user_id: "c", display_name: "Carla" }];
  expect(crewLineup(members.reverse(), input.entries, "running").map(m => m.user_id)).toEqual(["a", "b", "c"]);
});
