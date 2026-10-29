import { beforeEach, describe, expect, it, vi } from "vitest";
import { freshState, reduceCompete } from "@fitness-battle/shared";
vi.mock("@/lib/admin-auth", () => ({ authorizeAdmin: vi.fn(), adminDatabase: vi.fn() }));
vi.mock("@/lib/compete-persist", () => ({ loadCompeteAccount: vi.fn() }));
import { authorizeAdmin, adminDatabase } from "@/lib/admin-auth";
import { loadCompeteAccount } from "@/lib/compete-persist";
import { GET, POST } from "./route";
const target = "00000000-0000-4000-8000-000000000001";
const actionId = "00000000-0000-4000-8000-000000000002";
function request(extra = {}) {
 return new Request("https://test.local/api/admin/scenarios", { method: "POST", body: JSON.stringify({ target, actionId, updatedAt: "v1", action: "add-activity", sport: "running", distanceM: 5000, movingSec: 1800, verified: false, reason: "Exercise return experience", confirmation: `SCENARIO ${target}`, ...extra }) });
}
beforeEach(() => { vi.resetAllMocks(); vi.mocked(authorizeAdmin).mockResolvedValue(target); });
describe("admin scenario API", () => {
 it("authorizes reads and writes before creating a service client", async () => {
  vi.mocked(authorizeAdmin).mockResolvedValue(null);
  expect((await GET(new Request(`https://test.local/api/admin/scenarios?target=${target}`))).status).toBe(403);
  expect((await POST(request())).status).toBe(403);
  expect(adminDatabase).not.toHaveBeenCalled();
 });
 it("rejects cross-origin mutations and missing confirmation", async () => {
  const cross = request(); cross.headers.set("origin", "https://other.local");
  expect((await POST(cross)).status).toBe(403);
  expect((await POST(request({ confirmation: "" }))).status).toBe(400);
  expect(adminDatabase).not.toHaveBeenCalled();
 });
 it("rejects stale previews before invoking the write RPC", async () => {
  const rpc = vi.fn(); vi.mocked(adminDatabase).mockReturnValue({ rpc } as never);
  vi.mocked(loadCompeteAccount).mockResolvedValue({ state: freshState(), updatedAt: "v2" });
  expect((await POST(request())).status).toBe(409);
  expect(rpc).not.toHaveBeenCalled();
 });
 it("targets the opponent when arranging being overtaken, while checking the observed athlete revision", async () => {
  const now = new Date();
  const state = reduceCompete(freshState(now), { type: "opt-in", sport: "running", now: new Date(now.getTime() - 86400000).toISOString() });
  const opponent = "00000000-0000-4000-8000-000000000003";
  const field = { id: actionId, sport: "running", member_ids: [target, opponent], updated_at: "field-v1" };
  const chain = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), contains: vi.fn().mockReturnThis(), lte: vi.fn().mockReturnThis(), gt: vi.fn().mockResolvedValue({ data: [field], error: null }) };
  const rpc = vi.fn().mockResolvedValue({ data: "next", error: null });
  vi.mocked(adminDatabase).mockReturnValue({ from: () => chain, rpc } as never);
  vi.mocked(loadCompeteAccount).mockImplementation(async (_db, id) => ({ state: id === target ? { ...state, activities: [{ id: "leader", sport: "running", startedAt: new Date(now.getTime()-60000).toISOString(), distanceM: 1000, movingSec: 600, avgHr: null, source: "manual", verified: false, provenance: "manual" }] } : state, updatedAt: id === target ? "v1" : "opponent-v1" }));
  expect((await POST(request({ action: "overtake", opponent, direction: "be-passed" }))).status).toBe(200);
  expect(rpc).toHaveBeenCalledWith("admin_apply_compete_scenario", expect.objectContaining({ p_target_id: opponent, p_expected_updated_at: "opponent-v1", p_payload: expect.objectContaining({ peerId: target, peerUpdatedAt: "v1", fieldId: actionId }) }));
 });
 it("passes only server-loaded state and validated activity parameters to the transaction", async () => {
  const rpc = vi.fn().mockResolvedValue({ data: "v2", error: null });
  vi.mocked(adminDatabase).mockReturnValue({ rpc } as never);
  const state = freshState(); vi.mocked(loadCompeteAccount).mockResolvedValue({ state, updatedAt: "v1" });
  expect((await POST(request({ before: { untrusted: true }, payload: { verified: true } }))).status).toBe(200);
  expect(rpc).toHaveBeenCalledWith("admin_apply_compete_scenario", expect.objectContaining({ p_actor_id: target, p_target_id: target, p_expected_updated_at: "v1", p_before: state, p_payload: expect.objectContaining({ distanceM: 5000, movingSec: 1800, verified: false }) }));
 });
});
