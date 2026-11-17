import { beforeEach, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ user: vi.fn(), window: vi.fn(), finish: vi.fn(), activities: vi.fn(), readiness: vi.fn(), health: vi.fn(), sleep: vi.fn(), getConnection: vi.fn(), setConnection: vi.fn() }));
vi.mock("@/lib/auth/request-user", () => ({ resolveRequestUserId: mock.user }));
vi.mock("@/lib/fitness-history", () => ({ fitnessSyncWindow: mock.window, finishFitnessHistory: mock.finish }));
vi.mock("@/lib/fitness-store", () => ({ createProviderStore: () => ({ getConnection: mock.getConnection, setConnection: mock.setConnection }), persistSyncedActivities: mock.activities, persistReadiness: mock.readiness }));
vi.mock("@/lib/daily-health-store", () => ({ persistDailyHealth: mock.health }));
vi.mock("@/lib/garmin-record-store", () => ({ persistSleepNight: mock.sleep }));
import { POST } from "./route";

const sample = (id: string, startedAt: string) => ({ externalId: id, startedAt, categorySlug: "running", metricValue: 5000, movingSec: 1800 });
function request(extra = {}) { return new Request("http://localhost/api/fitness/ingest", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ provider: "apple_health", ...extra }) }); }
beforeEach(() => {
  vi.resetAllMocks(); mock.user.mockResolvedValue("owner");
  mock.window.mockResolvedValue({ since: "2026-10-18T18:00:00.000Z", until: "2026-11-17T18:00:00.000Z" });
  mock.getConnection.mockResolvedValue({ connectedAt: "2026-11-17T17:00:00.000Z" });
  mock.activities.mockResolvedValue(true); mock.readiness.mockResolvedValue(true); mock.finish.mockResolvedValue(undefined);
});
it("filters device history to the server-approved range before persisting", async () => {
  const response = await POST(request({ historyLease: "ticket", activities: [sample("old", "2026-10-01T12:00:00Z"), sample("selected", "2026-11-01T12:00:00Z")] }));
  expect(response.status).toBe(200);
  expect(mock.window).toHaveBeenCalledWith("owner", "apple_health", "ticket");
  expect(mock.activities.mock.calls[0][1].map((a: { externalId: string }) => a.externalId)).toEqual(["selected"]);
  expect(mock.finish).toHaveBeenCalledWith("owner", "ticket", true);
  expect((await response.json()).historyImported).toBe(true);
});
it("registers a successful empty connection and completes an empty confirmed import", async () => {
  expect((await POST(request())).status).toBe(200);
  expect(mock.setConnection).toHaveBeenCalledWith(expect.objectContaining({ status: "connected", connectedAt: "2026-11-17T17:00:00.000Z" }));
  expect(mock.finish).not.toHaveBeenCalled();
  expect((await POST(request({ historyLease: "ticket" }))).status).toBe(200);
  expect(mock.finish).toHaveBeenCalledWith("owner", "ticket", true);
});
it("leaves failed persistence retryable", async () => {
  mock.activities.mockResolvedValue(false);
  const response = await POST(request({ historyLease: "ticket", activities: [sample("a", "2026-11-01T12:00:00Z")] }));
  expect(response.status).toBe(503);
  expect(mock.finish).not.toHaveBeenCalledWith("owner", "ticket", true);
  expect(mock.finish).toHaveBeenCalledWith("owner", "ticket", false);
});
it("rejects an expired or previously used history ticket before writes", async () => {
  mock.window.mockRejectedValue(new Error("history_locked"));
  expect((await POST(request({ historyLease: "ticket" }))).status).toBe(409);
  expect(mock.activities).not.toHaveBeenCalled();
});
