import { beforeEach, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ owner: "owner" as string | null, rpc: vi.fn() }));
vi.mock("@/lib/auth/request-user", () => ({ resolveRequestUserId: async () => mock.owner }));
vi.mock("@/lib/supabase/request", () => ({ createRequestClient: async () => ({ rpc: mock.rpc }) }));
import { GET } from "./route";
const start = "2026-10-26T04:00:00Z", end = "2026-11-02T05:00:00Z";
const url = `https://test/api/compete/course?sport=running&start=${start}&end=${end}`;
beforeEach(() => { mock.owner = "owner"; mock.rpc.mockReset(); });
it("requires authentication and valid bounds", async () => {
  mock.owner = null;
  expect((await GET(new Request(url))).status).toBe(401);
  mock.owner = "owner";
  expect((await GET(new Request(url.replace("running", "strength")))).status).toBe(400);
  expect((await GET(new Request(url.replace(end, start)))).status).toBe(400);
  expect(mock.rpc).not.toHaveBeenCalled();
});
it("reads only the assigned course through the membership-checked RPC", async () => {
  mock.rpc.mockResolvedValue({ data: { name: "Park", coordinates: [[0, 0], [.02, 0]], periodStart: start, periodEnd: end }, error: null });
  const response = await GET(new Request(url));
  expect(response.status).toBe(200);
  expect(response.headers.get("cache-control")).toBe("private, no-store");
  expect((await response.json()).name).toBe("Park");
  expect(mock.rpc).toHaveBeenCalledWith("competition_route", { p_sport: "running", p_start: start, p_end: end });
});
it("does not substitute a local route for denied or invalid assignments", async () => {
  mock.rpc.mockResolvedValue({ data: null, error: { code: "42501" } });
  expect((await GET(new Request(url))).status).toBe(404);
  mock.rpc.mockResolvedValue({ data: { name: "Park", coordinates: [[0, 0], [.02, 0]], periodStart: "2026-10-19T04:00:00Z", periodEnd: end }, error: null });
  expect((await GET(new Request(url))).status).toBe(503);
});
