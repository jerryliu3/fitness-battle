import { beforeEach, expect, it, vi } from "vitest";

const mock = vi.hoisted(() => ({ user: vi.fn(), begin: vi.fn(), finish: vi.fn(), status: vi.fn(), window: vi.fn() }));
vi.mock("@/lib/auth/request-user", () => ({ resolveRequestUserId: mock.user }));
vi.mock("@/lib/fitness-history", () => ({ beginFitnessHistory: mock.begin, finishFitnessHistory: mock.finish, fitnessHistoryStatus: mock.status, fitnessSyncWindow: mock.window }));
import { GET, POST, DELETE } from "./route";

function request(body: unknown, method = "POST") {
  return new Request("http://localhost/api/fitness/history", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
}
beforeEach(() => {
  vi.resetAllMocks(); mock.user.mockResolvedValue("owner");
  mock.status.mockResolvedValue({ completed: false, provider: null, days: null });
});
it("requires authentication for reading and starting history imports", async () => {
  mock.user.mockResolvedValue(null);
  expect((await GET(new Request("http://localhost/api/fitness/history"))).status).toBe(401);
  expect((await POST(request({ provider: "strava", days: 90 }))).status).toBe(401);
  expect(mock.begin).not.toHaveBeenCalled();
});
it.each([0, 91, 1.5, "30", null])("rejects invalid history ranges: %s", async days => {
  expect((await POST(request({ provider: "strava", days }))).status).toBe(400);
  expect(mock.begin).not.toHaveBeenCalled();
});
it("claims the authenticated account's selected range without completing it", async () => {
  mock.begin.mockResolvedValue({ lease: "ticket", since: "2026-10-18", until: "2026-11-17" });
  expect((await POST(request({ userId: "other", provider: "apple_health", days: 30 }))).status).toBe(200);
  expect(mock.begin).toHaveBeenCalledWith("owner", "apple_health", 30);
  expect(mock.finish).not.toHaveBeenCalled();
});
it("reports the durable account-wide lock", async () => {
  mock.status.mockResolvedValue({ completed: true, provider: "strava", days: 14 });
  expect(await (await GET(new Request("http://localhost/api/fitness/history"))).json()).toEqual({ completed: true, provider: "strava", days: 14 });
  mock.begin.mockRejectedValue(new Error("history_locked"));
  expect((await POST(request({ provider: "oura", days: 90 }))).status).toBe(409);
});
it("releases an unsuccessful attempt without consuming the import", async () => {
  expect((await DELETE(request({ lease: "ticket" }, "DELETE"))).status).toBe(200);
  expect(mock.finish).toHaveBeenCalledWith("owner", "ticket", false);
});
