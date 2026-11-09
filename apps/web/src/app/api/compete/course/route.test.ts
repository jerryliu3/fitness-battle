import { beforeEach, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ owner: "owner" as string | null, rpc: vi.fn(), registration: vi.fn(), eq: vi.fn(), course: vi.fn() }));
vi.mock("@/lib/auth/request-user", () => ({ resolveRequestUserId: async () => mock.owner }));
vi.mock("@/lib/competition-course", () => ({ registeredCompetitionCourse: (...args: unknown[]) => mock.course(...args) }));
vi.mock("@/lib/supabase/request", () => ({ createRequestClient: async () => ({
  rpc: mock.rpc,
  from: () => { const query = { select: () => query, eq: (...args: unknown[]) => { mock.eq(...args); return query; }, maybeSingle: mock.registration }; return query; },
}) }));
import { GET } from "./route";
const start = "2026-10-26T04:00:00Z", end = "2026-11-02T05:00:00Z";
const url = `https://test/api/compete/course?sport=running&start=${start}&end=${end}`;
beforeEach(() => { mock.owner = "owner"; vi.clearAllMocks(); mock.rpc.mockReset(); mock.course.mockReset(); mock.registration.mockResolvedValue({ data: null, error: null }); });
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
  mock.rpc.mockRejectedValue(new Error("Transport unavailable"));
  expect((await GET(new Request(url))).status).toBe(503);
});

it("serves the registered event course without a field or roster read", async () => {
  mock.registration.mockResolvedValue({ data: { user_id: "owner" }, error: null });
  mock.course.mockResolvedValue({ name: "Park", coordinates: [[0, 0], [.02, 0]] });
  const response = await GET(new Request(url));
  expect(response.status).toBe(200);
  expect((await response.json()).name).toBe("Park");
  expect(mock.eq.mock.calls).toEqual([["user_id", "owner"], ["sport", "running"], ["wave_start", start], ["week_end", end]]);
  expect(mock.course).toHaveBeenCalledWith(start, end);
  expect(mock.rpc).not.toHaveBeenCalled();
});
it("fails closed when registration validation or course storage fails", async () => {
  mock.registration.mockResolvedValue({ data: null, error: new Error("Unavailable") });
  expect((await GET(new Request(url))).status).toBe(503);
  expect(mock.course).not.toHaveBeenCalled();
  expect(mock.rpc).not.toHaveBeenCalled();
  mock.registration.mockResolvedValue({ data: { user_id: "owner" }, error: null });
  mock.course.mockRejectedValue(new Error("Unavailable"));
  expect((await GET(new Request(url))).status).toBe(503);
  expect(mock.rpc).not.toHaveBeenCalled();
});
