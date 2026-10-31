import { describe, expect, it } from "vitest";
import { recordedSleep } from "./sleep";

describe("recordedSleep", () => {
  it("uses the Eastern wake day, real duration/stages and rejects invalid nights", () => {
    const night = recordedSleep("oura", {
      id: "one",
      end: "2026-10-25T03:30:00Z",
      durationSec: 25200,
      deepSec: 3600,
      remSec: 5400,
    });
    expect(night).toMatchObject({
      id: "oura-sleep-one",
      day: "2026-10-24",
      durationMin: 420,
      deepMin: 60,
      remMin: 90,
      verified: true,
    });
    expect(recordedSleep("whoop", { id: "bad", end: "invalid", durationSec: 100 })).toBeNull();
    expect(recordedSleep("whoop", { id: "zero", end: "2026-10-25T03:30:00Z", durationSec: 0 })).toBeNull();
  });

  it("avoids duplicate sleep ID prefixes", () => {
    const night = recordedSleep("whoop", {
      id: "whoop-sleep-night-123",
      end: "2026-10-25T12:00:00Z",
      durationSec: 28800,
    });
    expect(night?.id).toBe("whoop-sleep-night-123");
  });
});
