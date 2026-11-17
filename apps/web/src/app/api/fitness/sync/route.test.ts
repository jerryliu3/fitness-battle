import { beforeEach, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ window: vi.fn(), finish: vi.fn(), sync: vi.fn(), connection: vi.fn(), setConnection: vi.fn(), activities: vi.fn(), rpc: vi.fn() }));
vi.mock("@/lib/auth/request-user", () => ({ resolveRequestUserId: async () => "owner" }));
vi.mock("@/lib/fitness-history", () => ({ fitnessSyncWindow: mock.window, finishFitnessHistory: mock.finish }));
vi.mock("@/lib/fitness", () => ({ isOAuthProvider: (p: string) => p === "strava", getServerFitnessProvider: () => ({ getConnection: mock.connection, syncActivities: mock.sync }) }));
vi.mock("@/lib/fitness-store", () => ({ serviceDb: () => ({ rpc: mock.rpc }), createProviderStore: () => ({ setConnection: mock.setConnection }), persistSyncedActivities: mock.activities, persistReadiness: async () => true }));
vi.mock("@/lib/daily-health-store", () => ({ persistDailyHealth: async () => {} }));
vi.mock("@/lib/garmin-record-store", () => ({ persistSleepNight: async () => {} }));
import { POST } from "./route";

function request(extra = {}) { return new Request("http://localhost/api/fitness/sync", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ provider: "strava", ...extra }) }); }
beforeEach(() => {
  vi.resetAllMocks();
  mock.window.mockResolvedValue({ since: "2026-11-17T17:00:00.000Z", until: "2026-11-17T18:00:00.000Z" });
  mock.connection.mockResolvedValue({ status: "connected", connectedAt: "2026-11-17T17:00:00.000Z" });
  mock.rpc.mockResolvedValue({ data: true });
  mock.sync.mockResolvedValue({ provider: "strava", activities: [], readiness: [], usedMock: false });
  mock.finish.mockResolvedValue(undefined);
});
it("keeps automatic pulls separate from the one-time history import", async () => {
  expect((await POST(request({ automatic: true }))).status).toBe(200);
  expect(mock.window).toHaveBeenCalledWith("owner", "strava", undefined);
  expect(mock.sync).toHaveBeenCalledWith("owner", expect.objectContaining({ since: "2026-11-17T17:00:00.000Z" }));
  expect(mock.finish).not.toHaveBeenCalled();
});
it("completes a confirmed history import only after persistence succeeds", async () => {
  expect((await POST(request({ historyLease: "ticket" }))).status).toBe(200);
  expect(mock.window).toHaveBeenCalledWith("owner", "strava", "ticket");
  expect(mock.finish).toHaveBeenCalledWith("owner", "ticket", true);
});
it("releases history when persistence fails", async () => {
  mock.sync.mockResolvedValue({ activities: [{ id: "a" }], usedMock: false });
  mock.activities.mockResolvedValue(false);
  expect((await POST(request({ historyLease: "ticket" }))).status).toBe(503);
  expect(mock.finish).not.toHaveBeenCalledWith("owner", "ticket", true);
  expect(mock.finish).toHaveBeenCalledWith("owner", "ticket", false);
});
it("rejects the old unconfirmed backfill override", async () => {
  expect((await POST(request({ backfill: true }))).status).toBe(400);
  expect(mock.sync).not.toHaveBeenCalled();
});
