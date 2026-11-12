import { beforeEach, expect, it, vi } from "vitest";
vi.mock("@/lib/auth/request-user", () => ({ resolveRequestUserId: vi.fn() }));
vi.mock("@/lib/supabase/request", () => ({ createRequestClient: vi.fn() }));
import { resolveRequestUserId } from "@/lib/auth/request-user";
import { createRequestClient } from "@/lib/supabase/request";
import { GET, POST } from "./route";
const crewId = "00000000-0000-4000-8000-000000000001";
const rpc = vi.fn();
const post = (body: unknown) => POST(new Request("https://test/api/crews/passport", { method: "POST", body: JSON.stringify(body) }));
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(resolveRequestUserId).mockResolvedValue("member");
  vi.mocked(createRequestClient).mockResolvedValue({ rpc } as never);
});
it("requires authentication for all operations", async () => {
  vi.mocked(resolveRequestUserId).mockResolvedValue(null);
  expect((await GET(new Request(`https://test/api/crews/passport?crewId=${crewId}`))).status).toBe(401);
  expect((await post({})).status).toBe(401);
  expect(rpc).not.toHaveBeenCalled();
});
it("does not coerce targets or accept unsupported metrics", async () => {
  for (const body of [{ metric: "sessions", target: "5" }, { metric: "elo", target: 5 }, { metric: "sessions", target: -1 }]) {
    expect((await post({ action: "contract", crewId, title: "Together", expectedId: null, ...body })).status).toBe(400);
  }
  expect(rpc).not.toHaveBeenCalled();
});
it("ignores forged result, owner and roster data", async () => {
  rpc.mockResolvedValue({ data: "contract", error: null });
  expect((await post({ action: "contract", crewId, title: " Together ", metric: "sessions", target: 5, expectedId: null, value: 999, memberIds: ["forged"], createdBy: "outsider" })).status).toBe(200);
  expect(rpc).toHaveBeenCalledWith("set_crew_contract", { p_crew_id: crewId, p_title: "Together", p_metric: "sessions", p_target: 5, p_expected_id: null });
});
it("reports stale revisions as conflicts and never returns success on a failed write", async () => {
  rpc.mockResolvedValue({ data: null, error: { message: "contract_changed" } });
  expect((await post({ action: "contract", crewId, title: "Together", metric: "sessions", target: 5, expectedId: null })).status).toBe(409);
});
it("reads only the authorized crew snapshot with no shared cache", async () => {
  rpc.mockResolvedValue({ data: { contract: null, seasons: [], stamps: [] }, error: null });
  const response = await GET(new Request(`https://test/api/crews/passport?crewId=${crewId}`));
  expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  expect(rpc).toHaveBeenCalledWith("crew_passport", { p_crew_id: crewId });
});
