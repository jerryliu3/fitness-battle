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
});
