import { beforeEach, describe, expect, it, vi } from "vitest";

const mockUpsert = vi.fn();
const mockFrom = vi.fn(() => ({ upsert: mockUpsert }));
vi.mock("./fitness-store", () => ({
  serviceDb: () => ({ from: mockFrom }),
}));

import { persistDailyHealth } from "./daily-health-store";

describe("persistDailyHealth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpsert.mockResolvedValue({ error: null });
  });

  it("merges multiple metrics for the same provider and calendar day into one upsert row", async () => {
    await persistDailyHealth("user-1", [
      { provider: "apple_health", day: "2026-10-30", steps: 6000 },
      { provider: "apple_health", day: "2026-10-30", restingHr: 58 },
      { provider: "apple_health", day: "2026-10-30", hrv: 45 },
    ]);

    expect(mockFrom).toHaveBeenCalledWith("daily_health_readings");
    expect(mockUpsert).toHaveBeenCalledTimes(1);
    const [rows, options] = mockUpsert.mock.calls[0];
    expect(rows).toMatchObject([
      {
        user_id: "user-1",
        provider: "apple_health",
        day: "2026-10-30",
        steps: 6000,
        resting_hr: 58,
        hrv: 45,
      },
    ]);
    expect(options).toEqual({ onConflict: "user_id,provider,day", defaultToNull: false });
  });

  it("filters out invalid dates, zero resting heart rates, and negative values", async () => {
    await persistDailyHealth("user-1", [
      { provider: "garmin", day: "invalid-day", steps: 5000 },
      { provider: "garmin", day: "2026-10-30", restingHr: 0 }, // 0 is invalid for resting HR
      { provider: "garmin", day: "2026-10-30", steps: -10 },
      { provider: "garmin", day: "2026-10-30", hrv: 42 },
    ]);

    expect(mockUpsert).toHaveBeenCalledTimes(1);
    const [rows] = mockUpsert.mock.calls[0];
    expect(rows).toMatchObject([
      {
        user_id: "user-1",
        provider: "garmin",
        day: "2026-10-30",
        hrv: 42,
      },
    ]);
    expect(rows[0].resting_hr).toBeUndefined();
    expect(rows[0].steps).toBeUndefined();
  });

  it("handles empty readings gracefully without calling database", async () => {
    await persistDailyHealth("user-1", []);
    expect(mockFrom).not.toHaveBeenCalled();
  });
});
