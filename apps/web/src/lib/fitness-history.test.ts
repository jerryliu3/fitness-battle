import { afterEach, beforeEach, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ connection: vi.fn(), row: vi.fn() }));
vi.mock("./fitness-store", () => ({
  createProviderStore: () => ({ getConnection: mock.connection }),
  serviceDb: () => ({ from: () => ({ select: () => ({ eq: () => ({ maybeSingle: mock.row }) }) }) }),
}));
import { fitnessSyncWindow } from "./fitness-history";

beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(new Date("2026-11-17T18:00:00Z"));
  mock.connection.mockResolvedValue({ connectedAt: "2026-11-01T18:00:00Z", lastSyncAt: "2026-11-17T17:00:00Z" });
});
afterEach(() => vi.useRealTimers());
it("keeps ordinary pulls incremental", async () => {
  expect((await fitnessSyncWindow("owner", "apple_health")).since).toBe("2026-11-16T17:00:00.000Z");
});
it("does not discard an upload when another sync advances the cursor during its read", async () => {
  expect((await fitnessSyncWindow("owner", "apple_health", undefined, { incremental: false })).since).toBe("2026-11-01T18:00:00.000Z");
});
it("keeps confirmed history tied to its exact leased range", async () => {
  mock.row.mockResolvedValue({ data: { provider: "apple_health", days: 30, started_at: "2026-11-17T17:59:00Z", lease: "ticket", lease_until: "2026-11-17T18:29:00Z", completed_at: null } });
  expect(await fitnessSyncWindow("owner", "apple_health", "ticket", { incremental: false })).toMatchObject({ since: "2026-10-18T17:59:00.000Z", until: "2026-11-17T17:59:00.000Z" });
  await expect(fitnessSyncWindow("owner", "strava", "ticket")).rejects.toThrow("history_locked");
});
