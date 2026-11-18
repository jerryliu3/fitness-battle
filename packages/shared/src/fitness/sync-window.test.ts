import { describe, expect, it } from "vitest";
import {
  evidenceFromConnection,
  syncWindow,
  trackerSyncWindow,
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

  it("covers the gap after a missed sync instead of clipping to 14 days", () => {
    const window = syncWindow({
      now: new Date("2026-10-12T00:00:00.000Z"),
      lastSyncAt: "2026-09-02T00:00:00.000Z",
    });
    expect(window.kind).toBe("incremental");
    expect(window.since).toBe("2026-09-01T00:00:00.000Z");
  });

  it("does not look back further than the backfill horizon", () => {
    const window = syncWindow({
      now: new Date("2026-10-12T00:00:00.000Z"),
      lastSyncAt: "2025-01-01T00:00:00.000Z",
    });
    expect(window.since).toBe("2026-07-14T00:00:00.000Z");
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


describe("trackerSyncWindow", () => {
  const now = new Date("2026-11-17T18:00:00Z");
  it("does not import history when first connecting or choosing Later", () => {
    expect(trackerSyncWindow({}, now).since).toBe(now.toISOString());
    expect(trackerSyncWindow({ connectedAt: "2026-11-17T17:00:00Z" }, now).since).toBe("2026-11-17T17:00:00.000Z");
  });
  it("never widens a confirmed history range through incremental overlap", () => {
    const range = trackerSyncWindow({ connectedAt: "2026-11-16T17:00:00Z", lastSyncAt: "2026-11-16T18:00:00Z" }, now);
    expect(range.since).toBe("2026-11-16T17:00:00.000Z");
  });
  it("still covers gaps after connection", () => {
    const range = trackerSyncWindow({ connectedAt: "2026-10-01T17:00:00Z", lastSyncAt: "2026-10-17T18:00:00Z" }, now);
    expect(range.since).toBe("2026-10-16T18:00:00.000Z");
    expect(trackerSyncWindow({ lastSyncAt: "2026-10-17T18:00:00Z" }, now).since).toBe("2026-10-17T18:00:00.000Z");
  });
});
