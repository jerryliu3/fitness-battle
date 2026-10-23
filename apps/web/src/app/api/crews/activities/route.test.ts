import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ user: vi.fn(), rpc: vi.fn() }));
vi.mock("@/lib/auth/request-user", () => ({ resolveRequestUserId: mocks.user }));
vi.mock("@/lib/supabase/request", () => ({ createRequestClient: async () => ({ rpc: mocks.rpc }) }));
import { GET } from "./route";
beforeEach(() => { vi.clearAllMocks(); mocks.user.mockResolvedValue("athlete"); mocks.rpc.mockResolvedValue({ data: [], error: null }); });
it("requires authentication before reading activities", async () => {
  mocks.user.mockResolvedValue(null);
  expect((await GET(new Request("https://app.test/api/crews/activities"))).status).toBe(401);
  expect(mocks.rpc).not.toHaveBeenCalled();
});
it("rejects malformed filters and bounds page size", async () => {
  for (const query of ["limit=101", "since=bad", "crewId=other", "beforeId=bad"]) expect((await GET(new Request(`https://app.test/api/crews/activities?${query}`))).status).toBe(400);
  expect(mocks.rpc).not.toHaveBeenCalled();
});
it("uses the same bounded RPC for Home and feed pagination", async () => {
  await GET(new Request("https://app.test/api/crews/activities?latestPerMember=true&limit=20"));
  expect(mocks.rpc).toHaveBeenCalledWith("crew_activity_reads", expect.objectContaining({ p_limit: 20, p_latest_per_member: true, p_crew_id: null }));
});
it("does not disguise missing membership as an empty feed", async () => {
  mocks.rpc.mockResolvedValue({ data: null, error: { message: "not_a_member" } });
  expect((await GET(new Request("https://app.test/api/crews/activities"))).status).toBe(403);
});
