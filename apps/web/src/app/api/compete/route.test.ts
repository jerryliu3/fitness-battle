import { beforeEach, describe, expect, it, vi } from "vitest";
import { freshState } from "@fitness-battle/shared";
vi.mock("@/lib/auth/request-user", () => ({ resolveRequestUserId: vi.fn() }));
vi.mock("@/lib/supabase/request", () => ({ createRequestClient: vi.fn() }));
vi.mock("@/lib/compete-persist", () => ({ loadCompeteAccount: vi.fn(), persistCompeteAccount: vi.fn(), hydrateFieldBoard: vi.fn() }));
import { resolveRequestUserId } from "@/lib/auth/request-user";
import { createRequestClient } from "@/lib/supabase/request";
import { loadCompeteAccount, persistCompeteAccount } from "@/lib/compete-persist";
import { PUT } from "./route";
function request(extra: object) { return new Request("https://test.local/api/compete", { method: "PUT", body: JSON.stringify({ accountId: "athlete", state: freshState(), ...extra }) }); }
beforeEach(() => {
 vi.clearAllMocks();
 vi.mocked(resolveRequestUserId).mockResolvedValue("athlete");
 vi.mocked(createRequestClient).mockResolvedValue({} as never);
 vi.mocked(loadCompeteAccount).mockResolvedValue(null);
 vi.mocked(persistCompeteAccount).mockResolvedValue("new-version");
});
describe("versioned account API", () => {
 it("refuses clients that omit their base version", async () => {
  expect((await PUT(request({}))).status).toBe(409);
  expect(persistCompeteAccount).not.toHaveBeenCalled();
 });
 it("passes the client's version into the atomic writer", async () => {
  expect((await PUT(request({ updatedAt: "base-version" }))).status).toBe(200);
  expect(persistCompeteAccount).toHaveBeenCalledWith({}, "athlete", expect.anything(), "base-version");
 });
 it("reports stale writes as conflicts, never successful saves", async () => {
  vi.mocked(persistCompeteAccount).mockRejectedValue(new Error("account_changed_reload"));
  const response = await PUT(request({ updatedAt: "stale-version" }));
  expect(response.status).toBe(409);
  expect(await response.json()).toMatchObject({ error: "account_changed_reload", persisted: false });
 });
});
