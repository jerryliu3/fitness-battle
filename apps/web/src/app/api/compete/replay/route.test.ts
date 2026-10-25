import { beforeEach, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ owner: "owner" as string | null, rpc: vi.fn() }));
vi.mock("@/lib/auth/request-user", () => ({ resolveRequestUserId: async () => mock.owner }));
vi.mock("@/lib/supabase/request", () => ({ createRequestClient: async () => ({ rpc: mock.rpc }) }));
import { GET } from "./route";
const url = "https://test/api/compete/replay?sport=running&track=verified&start=2026-10-19T04:00:00Z&end=2026-10-26T04:00:00Z";
beforeEach(() => { mock.owner = "owner"; mock.rpc.mockReset(); });
it("requires a session and validates bounds before accessing the field", async () => {
  mock.owner = null;
  expect((await GET(new Request(url))).status).toBe(401);
  mock.owner = "owner";
  expect((await GET(new Request(url.replace("running", "invalid")))).status).toBe(400);
  expect((await GET(new Request(url.replace("2026-10-26", "2026-10-18")))).status).toBe(400);
  expect(mock.rpc).not.toHaveBeenCalled();
});
it("returns a minimal private ledger and uses the member-authorized RPC", async () => {
  mock.rpc.mockResolvedValue({ data: { sport: "running", track: "verified", periodStart: "2026-10-19T04:00:00Z", periodEnd: "2026-10-26T04:00:00Z", through: "2026-10-25T12:00:00Z", athletes: [{ id: "owner", name: "Athlete", you: true }], syntheticIds: [], events: [{ id: "workout", athleteId: "owner", at: "2026-10-20T12:00:00Z", distanceM: "5000", movingSec: "1800", avgHr: 140 }] }, error: null });
  const response = await GET(new Request(url));
  expect(response.status).toBe(200);
  expect(response.headers.get("cache-control")).toBe("private, no-store");
  const body = await response.json();
  expect(body.events[0].distanceM).toBe(5000);
  expect(body.events[0].effort).toBeGreaterThan(0);
  expect(body.events[0]).not.toHaveProperty("avgHr");
  expect(body).not.toHaveProperty("syntheticIds");
  expect(mock.rpc).toHaveBeenCalledWith("competition_replay", { p_sport: "running", p_track: "verified", p_start: "2026-10-19T04:00:00Z", p_end: "2026-10-26T04:00:00Z" });
});
it("keeps denied or unavailable timelines explicit without returning another field or synthetic fallback", async () => {
  mock.rpc.mockResolvedValue({ data: null, error: { code: "42501", message: "private details" } });
  const denied = await GET(new Request(url));
  expect(denied.status).toBe(404);
  expect(JSON.stringify(await denied.json())).not.toContain("private details");
  mock.rpc.mockResolvedValue({ data: null, error: { code: "PGRST202" } });
  expect((await GET(new Request(url))).status).toBe(503);
});
