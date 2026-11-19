import { beforeEach, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ owner: "owner" as string | null, eq: vi.fn(), routeForActivity: vi.fn(), data: { route_replay: [{ progress: 0, elapsedSec: 0, heartRate: 140 }] } as unknown, error: null as unknown }));
vi.mock("@/lib/auth/request-user", () => ({ resolveRequestUserId: async () => mock.owner }));
vi.mock("@/lib/supabase/request", () => ({ createRequestClient: async () => ({ from: () => ({ select: () => { const query = { eq: (key: string, value: string) => { mock.eq(key, value); return query; }, maybeSingle: async () => ({ data: mock.data, error: mock.error }) }; return query; } }) }) }));
vi.mock("@/lib/fitness", () => ({ getServerFitnessProvider: () => ({ routeForActivity: mock.routeForActivity }) }));
vi.mock("@/lib/fitness-store", () => ({ serviceDb: () => undefined }));
import { GET } from "./route";
beforeEach(() => { mock.owner = "owner"; mock.data = { route_replay: [{ progress: 0, elapsedSec: 0, heartRate: 140 }] }; mock.error = null; mock.eq.mockClear(); });
it("requires auth and always filters samples to the requesting owner", async () => {
  const response = await GET(new Request("https://test/api/fitness/replay?activityId=garmin-file-1"));
  expect(mock.eq).toHaveBeenCalledWith("user_id", "owner"); expect(mock.eq).toHaveBeenCalledWith("compete_key", "garmin-file-1");
  expect(await response.json()).toEqual({ routeReplay: [{ progress: 0, elapsedSec: 0, heartRate: 140 }] });
  expect(response.headers.get("cache-control")).toBe("private, no-store");
  mock.owner = null; expect((await GET(new Request("https://test/api/fitness/replay?activityId=x"))).status).toBe(401);
});
it("handles missing/invalid activities and database failure without exposing measurements", async () => {
  expect((await GET(new Request("https://test/api/fitness/replay"))).status).toBe(400);
  mock.data = null; expect((await GET(new Request("https://test/api/fitness/replay?activityId=x"))).status).toBe(404);
  mock.error = {}; expect((await GET(new Request("https://test/api/fitness/replay?activityId=x"))).status).toBe(503);
});

it("fetches Strava streams when an existing activity has an empty replay array", async () => {
  mock.data = { provider: "strava", external_id: "123", sport: "running", route_replay: [] };
  const routeReplay = [{ progress: 0, elapsedSec: 0, heartRate: 140 }];
  mock.routeForActivity.mockResolvedValueOnce({ detailedPolyline: "route", routeReplay });
  const response = await GET(new Request("https://test/api/fitness/replay?activityId=strava-123"));
  expect(mock.routeForActivity).toHaveBeenCalledWith("owner", "123", "running");
  expect(await response.json()).toEqual({ detailedPolyline: "route", routeReplay });
});
