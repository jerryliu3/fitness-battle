import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { freshState, reduceCompete, rollClock, withAccountEloBaseline, type CompeteState } from "@fitness-battle/shared";
const mock = vi.hoisted(() => ({ load: vi.fn(), settle: vi.fn(), persist: vi.fn(), revision: vi.fn(), history: vi.fn() }));
vi.mock("@/lib/auth/request-user", () => ({ resolveRequestUserId: async () => "owner" }));
vi.mock("@/lib/supabase/request", () => ({ createRequestClient: async () => ({ rpc: mock.revision }) }));
vi.mock("@/lib/competition-authority", () => ({ competitionAuthorityDatabase: () => ({}) }));
vi.mock("@/lib/compete-persist", () => ({ loadCompeteAccount: mock.load, settleAccountFields: mock.settle,
  persistCompeteAccount: mock.persist, loadEffortScoreEvents: mock.history, overtakeSnapshotChanged: vi.fn() }));
import { PUT } from "@/app/api/compete/route";
const now = new Date("2026-10-28T15:00:00Z");
let stored: CompeteState;
function request(state = stored) {
  return new Request("http://test.local/api/compete", { method: "PUT", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ state, accountId: "owner", updatedAt: "original-revision" }) });
}
beforeEach(() => {
  vi.resetAllMocks(); vi.useFakeTimers(); vi.setSystemTime(now);
  stored = reduceCompete(withAccountEloBaseline(freshState(now)), { type: "opt-in", sport: "running", now: "2026-10-28T09:00:00Z" });
  stored.activities = [{ id: "apple_health-new", sport: "running", startedAt: "2026-10-28T12:00:00Z",
    distanceM: 20000, movingSec: 3600, avgHr: null, source: "apple_health", verified: true, provenance: "recorded", disposition: "counted" }];
  mock.load.mockImplementation(async () => ({ state: stored, updatedAt: "original-revision" }));
  mock.settle.mockImplementation(async (_db, _user, state, at) => rollClock(state, at));
  mock.revision.mockResolvedValue({ data: 10, error: null });
  mock.persist.mockResolvedValue("saved-revision");
  mock.history.mockResolvedValue([]);
});
afterEach(() => { vi.useRealTimers(); });
it("saves a deselected sync without calculating unpersistable milestone awards", async () => {
  const incoming = { ...stored, activities: stored.activities.map(a => ({ ...a, disposition: "excluded" as const })) };
  const response = await PUT(request(incoming));
  expect(response.status).toBe(200);
  const state = mock.persist.mock.calls[0]![2] as CompeteState;
  expect(state.activities[0]!.disposition).toBe("excluded");
  expect(state.effortMilestones!.every(r => r.earned === 0)).toBe(true);
  expect((await response.json()).persisted).toBe(true);
});
it("recomputes a concurrent tracker delivery once while preserving the optimistic account revision", async () => {
  mock.persist.mockRejectedValueOnce(new Error("competition_inputs_changed"));
  mock.revision.mockResolvedValueOnce({ data: 10, error: null }).mockResolvedValue({ data: 11, error: null });
  const response = await PUT(request());
  expect(response.status).toBe(200);
  expect(mock.load).toHaveBeenCalledTimes(2);
  expect(mock.persist.mock.calls.map(call => call[3])).toEqual(["original-revision", "original-revision"]);
  expect(mock.persist.mock.calls.map(call => call[4].receipts)).toEqual([10, 11]);
});
it("keeps ongoing ingest races retryable and a later retry succeeds", async () => {
  mock.persist.mockRejectedValue(new Error("competition_inputs_changed"));
  const response = await PUT(request());
  expect(response.status).toBe(409);
  expect((await response.json()).error).toBe("competition_inputs_changed");
  expect(mock.persist).toHaveBeenCalledTimes(2);
  mock.persist.mockResolvedValue("saved-revision");
  expect((await PUT(request())).status).toBe(200);
});
it("does not retry or overwrite a concurrent account edit", async () => {
  mock.persist.mockRejectedValue(new Error("account_changed_reload"));
  const response = await PUT(request());
  expect(response.status).toBe(409);
  expect((await response.json()).error).toBe("account_changed_reload");
  expect(mock.persist).toHaveBeenCalledTimes(1);
});
