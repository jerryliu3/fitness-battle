import { describe, expect, it } from "vitest";
import {
  evidenceFromConnection,
  syncWindow,
} from "./sync-window";

describe("sync window", () => {
  it("defaults to a 90-day backfill", () => {
    const window = syncWindow({
      now: new Date("2026-10-12T00:00:00.000Z"),
      forceBackfill: true,
    });
    expect(window.kind).toBe("backfill");
    expect(window.days).toBe(90);
    expect(window.since).toBe("2026-07-14T00:00:00.000Z");
  });

  it("uses incremental lookback after a prior sync", () => {
    const window = syncWindow({
      now: new Date("2026-10-12T00:00:00.000Z"),
      lastSyncAt: "2026-10-10T00:00:00.000Z",
    });
    expect(window.kind).toBe("incremental");
    expect(window.since).toBe("2026-10-09T00:00:00.000Z");
  });

  it("labels stub connections honestly", () => {
    expect(
      evidenceFromConnection({
        status: "stub",
        lastSyncAt: "2026-10-12T00:00:00.000Z",
      }),
    ).toBe("stub");
  });
});
