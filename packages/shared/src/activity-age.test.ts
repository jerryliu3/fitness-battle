import { describe, expect, it } from "vitest";
import { formatActivityAge, formatActivityRecency, isActivityLive, latestCountedActivityAt } from "./activity-age";
import { getDemoCompeteState } from "./compete-demo-seed";
describe("activity update labels", () => {
  it("never fabricates recent activity for unknown rivals", () => {
    expect(formatActivityAge(undefined)).toBe("—");
    expect(formatActivityAge("not a date")).toBe("—");
    expect(
      formatActivityAge(
        "2026-10-18T11:30:00Z",
        new Date("2026-10-18T12:00:00Z"),
      ),
    ).toBe("30m ago");
    expect(
      formatActivityRecency(
        "2026-10-18T11:30:00Z",
        new Date("2026-10-18T12:00:00Z"),
      ),
    ).toBe("30 mins ago");
    expect(
      formatActivityRecency(
        "2026-10-18T11:00:00Z",
        new Date("2026-10-18T12:00:00Z"),
        true,
      ),
    ).toBe("1h ago");
    expect(
      isActivityLive("2026-10-18T11:30:00Z", new Date("2026-10-18T12:00:00Z")),
    ).toBe(true);
    expect(
      isActivityLive("2026-10-18T10:00:00Z", new Date("2026-10-18T12:00:00Z")),
    ).toBe(false);
  });
  it("uses only real counted timestamps inside the selected event period", () => {
    const state = getDemoCompeteState("alice")!;
    const periodStart = new Date(state.clock.periodStart);
    expect(
      latestCountedActivityAt(
        [],
        "running",
        "open",
        periodStart,
        new Date("2100-01-01"),
        new Date("2099-01-01"),
      ),
    ).toBeUndefined();
    const timestamp = latestCountedActivityAt(
      state.activities,
      "running",
      "open",
      periodStart,
      new Date("2100-01-01"),
      new Date("2099-01-01"),
    );
    expect(timestamp).toBeDefined();
    expect(
      state.activities.some(
        (a) => a.startedAt === timestamp && a.sport === "running",
      ),
    ).toBe(true);
  });
});
