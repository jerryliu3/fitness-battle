import { describe, expect, it } from "vitest";
import { notificationEvent } from "./events";

describe("notificationEvent", () => {
  it("builds week summary and connection alert copy", () => {
    expect(notificationEvent("week_summary", { place: 3 }).body).toContain(
      "place 3",
    );
    expect(notificationEvent("connection_alerts", { provider: "strava" }).path).toBe(
      "/you#connections",
    );
  });

  it("builds activity_synced copy for single and batch syncs", () => {
    const single = notificationEvent("activity_synced", {
      sport: "run",
      provider: "Garmin",
      count: 1,
    });
    expect(single.title).toBe("Activity synced");
    expect(single.body).toContain("run");
    expect(single.body).toContain("Garmin");
    expect(single.path).toBe("/today");

    const batch = notificationEvent("activity_synced", {
      provider: "Strava",
      count: 3,
    });
    expect(batch.title).toBe("3 activities synced");
    expect(batch.body).toContain("Strava");
  });

  it("builds rival_moves copy for both overtook and overtaken", () => {
    const overtook = notificationEvent("rival_moves", {
      direction: "overtook",
      place: 2,
      athleteName: "Alex",
    });
    expect(overtook.title).toBe("You made a pass");
    expect(overtook.body).toContain("Alex");
    expect(overtook.body).toContain("place 2");

    const overtaken = notificationEvent("rival_moves", {
      direction: "overtaken",
      place: 4,
      athleteName: "Sam",
    });
    expect(overtaken.title).toBe("Board moved");
    expect(overtaken.body).toContain("Sam");
    expect(overtaken.body).toContain("place 4");
  });
});
