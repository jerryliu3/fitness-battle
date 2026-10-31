import { beforeEach, describe, expect, it, vi } from "vitest";
import { freshState } from "@fitness-battle/shared";
vi.mock("@/lib/auth/request-user", () => ({ resolveRequestUserId: vi.fn() }));
vi.mock("@/lib/supabase/request", () => ({ createRequestClient: vi.fn() }));
vi.mock("@/lib/competition-authority", () => ({ competitionAuthorityDatabase: () => ({}) }));
vi.mock("@/lib/compete-persist", () => ({ loadCompeteAccount: vi.fn(), loadEffortScoreEvents: vi.fn().mockResolvedValue([]), persistCompeteAccount: vi.fn(), hydrateFieldBoard: vi.fn(), settleAccountFields: vi.fn(), reconcileAccountSettlement: vi.fn() }));
import { resolveRequestUserId } from "@/lib/auth/request-user";
import { createRequestClient } from "@/lib/supabase/request";
import { loadEffortScoreEvents, loadCompeteAccount, persistCompeteAccount, settleAccountFields, reconcileAccountSettlement } from "@/lib/compete-persist";
import { GET, PUT } from "./route";
function request(extra: object) { return new Request("https://test.local/api/compete", { method: "PUT", body: JSON.stringify({ accountId: "athlete", state: freshState(), ...extra }) }); }
beforeEach(() => {
 vi.clearAllMocks();
 vi.mocked(resolveRequestUserId).mockResolvedValue("athlete");
 vi.mocked(createRequestClient).mockResolvedValue({ rpc: async () => ({ data: 0, error: null }) } as never);
 vi.mocked(loadCompeteAccount).mockResolvedValue(null);
 vi.mocked(persistCompeteAccount).mockResolvedValue("new-version");
 vi.mocked(reconcileAccountSettlement).mockImplementation(async (_db, _user, state) => state);
});
describe("versioned account API", () => {
 it("refuses clients that omit their base version", async () => {
  expect((await PUT(request({}))).status).toBe(409);
  expect(persistCompeteAccount).not.toHaveBeenCalled();
 });
 it("passes the client's version into the atomic writer", async () => {
  expect((await PUT(request({ updatedAt: "base-version" }))).status).toBe(200);
  expect(persistCompeteAccount).toHaveBeenCalledWith(expect.anything(), "athlete", expect.anything(), "base-version", expect.objectContaining({ receipts: 0 }));
 });
 it("reports stale writes as conflicts, never successful saves", async () => {
  vi.mocked(persistCompeteAccount).mockRejectedValue(new Error("account_changed_reload"));
  const response = await PUT(request({ updatedAt: "stale-version" }));
  expect(response.status).toBe(409);
  expect(await response.json()).toMatchObject({ error: "account_changed_reload", persisted: false });
 });
});

it("does not archive estimated results when an authoritative field cannot load", async () => {
 vi.mocked(loadCompeteAccount).mockResolvedValue({ state: freshState(), updatedAt: "base" });
 vi.mocked(settleAccountFields).mockRejectedValue(new Error("field_roster_unavailable"));
 const response = await GET(new Request("https://test.local/api/compete"));
 expect(response.status).toBe(503);
 expect(persistCompeteAccount).not.toHaveBeenCalled();
});

it("does not return an uncommitted rollover as an authoritative account snapshot", async () => {
 const base = freshState();
 vi.mocked(loadCompeteAccount).mockResolvedValue({ state: base, updatedAt: "base" });
 vi.mocked(settleAccountFields).mockResolvedValue({ ...base, name: "Settled account" });
 vi.mocked(persistCompeteAccount).mockRejectedValue(new Error("account_changed_reload"));
 const response = await GET(new Request("https://test.local/api/compete"));
 expect(response.status).toBe(503);
 expect(await response.json()).toEqual({ error: "account_not_saved" });
});

it("returns newly committed score events with the save acknowledgement", async () => {
 const events = [{ id: "1", sport: "running" as const, track: "open" as const, occurredAt: new Date().toISOString(), scoreBefore: 1000, scoreAfter: 1001 }];
 vi.mocked(loadEffortScoreEvents).mockResolvedValueOnce(events);
 const response = await PUT(request({ updatedAt: "base-version" }));
 expect(response.status).toBe(200);
 expect((await response.json()).state.effortScoreEvents).toEqual(events);
});
it("does not report a committed save as failed when the history reread fails", async () => {
 vi.mocked(loadEffortScoreEvents).mockRejectedValueOnce(new Error("score_history_unavailable"));
 const response = await PUT(request({ updatedAt: "base-version" }));
 expect(response.status).toBe(200);
 expect(await response.json()).toMatchObject({ persisted: true, updatedAt: "new-version" });
});
