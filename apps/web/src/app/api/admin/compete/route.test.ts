import { beforeEach, describe, expect, it, vi } from "vitest";
import { freshState } from "@fitness-battle/shared";
vi.mock("@supabase/supabase-js", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/supabase/request", () => ({ createRequestClient: vi.fn() }));
vi.mock("@/lib/supabase/config", () => ({ getSupabaseConfig: () => ({ configured: true, supabaseUrl: "https://example.supabase.co" }) }));
vi.mock("@/lib/env", () => ({ webEnv: { useDemoData: false }, serverEnv: { supabaseServiceRoleKey: "server-test-key" } }));
vi.mock("@/lib/compete-persist", () => ({ loadCompeteAccount: vi.fn(), persistCompeteAccount: vi.fn(), hydrateFieldBoard: vi.fn() }));
import { createClient } from "@supabase/supabase-js";
import { createRequestClient } from "@/lib/supabase/request";
import { loadCompeteAccount, persistCompeteAccount, hydrateFieldBoard } from "@/lib/compete-persist";
import { serverEnv, webEnv } from "@/lib/env";
import { GET, POST } from "./route";
const target = "00000000-0000-4000-8000-000000000001";
const actionId = "00000000-0000-4000-8000-000000000002";
const insert = vi.fn(), eq = vi.fn(), update = vi.fn();
const getUser = vi.fn();
function request(body: object = {}, origin = "https://overtaek.com") {
 return new Request("https://overtaek.com/api/admin/compete", { method: "POST", headers: { origin, "Content-Type": "application/json" }, body: JSON.stringify({ target, actionId, action: "settle-due", reason: "Test manual settlement", confirmation: `SETTLE ${target}`, updatedAt: "version-1", ...body }) });
}
beforeEach(() => {
 vi.clearAllMocks();
 webEnv.useDemoData = false; serverEnv.supabaseServiceRoleKey = "server-test-key";
 getUser.mockResolvedValue({ data: { user: { id: target, email: "3jerryliu@gmail.com", email_confirmed_at: "2026-01-01" } }, error: null });
 vi.mocked(createRequestClient).mockResolvedValue({ auth: { getUser } } as never);
 insert.mockResolvedValue({ error: null }); eq.mockResolvedValue({ error: null }); update.mockReturnValue({ eq });
 vi.mocked(createClient).mockReturnValue({ from: () => ({ insert, update }) } as never);
 const state = freshState(new Date("2026-10-19T15:00:00Z"));
 vi.mocked(loadCompeteAccount).mockResolvedValue({ state, updatedAt: "version-1" });
 vi.mocked(hydrateFieldBoard).mockImplementation(async (_db, _id, state) => state);
 vi.mocked(persistCompeteAccount).mockResolvedValue("version-2");
});
describe("admin settlement", () => {
 it("rejects demo mode, non-owner and unconfirmed users before constructing privileged client", async () => {
  for (const user of [null, { id: target, email: "other@example.com", email_confirmed_at: "yes" }, { id: target, email: "3jerryliu@gmail.com" }]) {
   getUser.mockResolvedValue({ data: { user }, error: null });
   expect((await POST(request())).status).toBe(403);
  }
  webEnv.useDemoData = true;
  expect((await POST(request())).status).toBe(403);
  expect(createClient).not.toHaveBeenCalled();
 });
 it("requires same origin, target confirmation, reason and a UUID action id", async () => {
  expect((await POST(request({}, "https://other.example"))).status).toBe(403);
  for (const invalid of [{ confirmation: "yes" }, { reason: "short" }, { actionId: "bad" }, { action: "wipe" }, { target: [target] }]) expect((await POST(request(invalid))).status).toBe(400);
  expect(persistCompeteAccount).not.toHaveBeenCalled();
 });
 it("requires configuration and refuses stale previews", async () => {
  serverEnv.supabaseServiceRoleKey = "";
  expect((await POST(request())).status).toBe(503);
  serverEnv.supabaseServiceRoleKey = "key";
  expect((await POST(request({ updatedAt: "old" }))).status).toBe(409);
  expect(persistCompeteAccount).not.toHaveBeenCalled();
 });
 it("requires audit insertion before any mutation and never persists demoNow", async () => {
  insert.mockResolvedValueOnce({ error: { message: "duplicate" } });
  expect((await POST(request())).status).toBe(409);
  expect(persistCompeteAccount).not.toHaveBeenCalled();
  expect((await POST(request({ action: "close-round" }))).status).toBe(200);
  expect(persistCompeteAccount).toHaveBeenCalledWith(expect.anything(), target, expect.objectContaining({ demoNow: null }));
  expect(update).toHaveBeenCalledWith(expect.objectContaining({ outcome: "succeeded" }));
 });
 it("records failures without reporting success", async () => {
  vi.mocked(persistCompeteAccount).mockRejectedValue(new Error("write failed"));
  expect((await POST(request())).status).toBe(500);
  expect(update).toHaveBeenCalledWith(expect.objectContaining({ outcome: "failed" }));
 });
 it("protects account previews too", async () => {
  const response = await GET(new Request(`https://overtaek.com/api/admin/compete?target=${target}`));
  expect(response.status).toBe(200);
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect((await response.json()).name).toBeTruthy();
 });
});
