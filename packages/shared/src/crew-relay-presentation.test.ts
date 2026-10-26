import { describe, expect, it } from "vitest";
import {
  buildCrewRelayViewState,
  crewRelaySegmentKey,
  crewRelaySelectedMember,
  crewRelayTrackWidth,
  formatCrewRelayVolume,
} from "./crew-relay-presentation";
import { crewWeekRelay } from "./compete/crew-relay";

const relay = crewWeekRelay({
  members: [
    { user_id: "a", display_name: "A" },
    { user_id: "b", display_name: "B" },
  ],
  entries: [
    { user_id: "a", distance_m: 5000, moving_sec: 1200 },
    { user_id: "b", distance_m: 3000, moving_sec: 900 },
  ],
  format: "volume",
  sport: "running",
  targetSessions: 3,
  targetDistanceM: 10000,
  previousDistanceM: null,
});

describe("crew relay presentation", () => {
  it("keys segments by stable ids", () => {
    expect(crewRelaySegmentKey(relay.model)).toBe("a,b");
  });

  it("widens the track for each active member", () => {
    expect(crewRelayTrackWidth(100, relay.model)).toBe(160);
    expect(crewRelayTrackWidth(400, relay.model)).toBe(400);
  });

  it("selects the viewer when nothing is pressed", () => {
    expect(crewRelaySelectedMember(relay.model, "", "b")?.id).toBe("b");
    expect(crewRelaySelectedMember(relay.model, "a", "b")?.id).toBe("a");
  });

  it("formats session targets separately from distance", () => {
    expect(formatCrewRelayVolume(true, "running", 3)).toBe("3 sessions");
    expect(formatCrewRelayVolume(false, "running", 5000, "metric")).toContain(
      "km",
    );
  });

  it("builds scene width and empty state from relay input", () => {
    const view = buildCrewRelayViewState(relay, {
      selected: "",
      userId: "a",
      containerWidth: 320,
      scenePrefix: "pfx",
      sport: "running",
      units: "metric",
    });
    expect(view.empty).toBe(false);
    expect(view.width).toBeGreaterThanOrEqual(320);
    expect(view.member?.id).toBe("a");
    expect(view.scene.people).toHaveLength(2);
  });
});
