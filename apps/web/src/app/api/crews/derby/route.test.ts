import { beforeEach, expect, it, vi } from "vitest";
vi.mock("@/lib/auth/request-user", () => ({ resolveRequestUserId: vi.fn() }));
vi.mock("@/lib/supabase/request", () => ({ createRequestClient: vi.fn() }));
import { resolveRequestUserId } from "@/lib/auth/request-user";
import { createRequestClient } from "@/lib/supabase/request";
import { GET } from "./route";
const crewId = "00000000-0000-4000-8000-000000000001";
const rpc = vi.fn();
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(resolveRequestUserId).mockResolvedValue("member");
  vi.mocked(createRequestClient).mockResolvedValue({ rpc } as never);
});
it("requires a signed-in caller and valid crew ID before reading", async () => {
  vi.mocked(resolveRequestUserId).mockResolvedValue(null);
  expect((await GET(new Request(`https://test/api/crews/derby?crewId=${crewId}`))).status).toBe(401);
  vi.mocked(resolveRequestUserId).mockResolvedValue("member");
  expect((await GET(new Request("https://test/api/crews/derby?crewId=bad"))).status).toBe(400);
  expect(rpc).not.toHaveBeenCalled();
});
it("uses the membership-authorized event projection without caching private standings", async () => {
  rpc.mockResolvedValue({ data: null, error: null });
  const response = await GET(new Request(`https://test/api/crews/derby?crewId=${crewId}`));
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ derby: null });
  expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  expect(rpc).toHaveBeenCalledWith("crew_derby_standings", { p_crew_id: crewId });
});
it("does not turn a failed authorization into an empty successful race", async () => {
  rpc.mockResolvedValue({ data: null, error: { message: "not_a_member" } });
  expect((await GET(new Request(`https://test/api/crews/derby?crewId=${crewId}`))).status).toBe(403);
});
