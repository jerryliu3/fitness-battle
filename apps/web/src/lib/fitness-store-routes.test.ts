import { describe, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ upsert: vi.fn(async (_rows: unknown) => ({ error: null })) }));
vi.mock("./env", () => ({ serverEnv: { supabaseServiceRoleKey: "test-only" } }));
vi.mock("./supabase/config", () => ({ getSupabaseConfig: () => ({ configured: true, supabaseUrl: "http://localhost:54621" }) }));
vi.mock("@supabase/supabase-js", () => ({ createClient: () => ({
  from: (table: string) => table === "categories" ? { select: async () => ({ data: [{ id: "category", slug: "running" }], error: null }) }
    : table === "activities" ? { upsert: mock.upsert }
    : { select: () => ({ eq: async () => ({ data: [], error: null }) }) },
}) }));
import { persistSyncedActivities } from "./fitness-store";

describe("GPS file persistence", () => {
  it("keeps geometry and import identity without assigning GPS credit or a connected tracker", async () => {
    await persistSyncedActivities("11111111-1111-4111-8111-111111111111", [{
      id: "garmin-file-one", externalId: "file-one", provider: "garmin", categorySlug: "running",
      startedAt: "2026-10-23T12:00:00Z", metricValue: 10000, movingSec: 3000, rawName: "Run",
      routeReplay: [{ progress: 0, elapsedSec: 0, heartRate: 140 }],
      detailedPolyline: "geometry", summaryPolyline: "summary", routeBounds: [-74, 40, -73, 41], elevationGainM: 25,
    }], "imported");
    expect(mock.upsert).toHaveBeenCalledWith([expect.objectContaining({
      compete_key: "garmin-file-one", external_id: "file-one", detailed_polyline: "geometry", summary_polyline: "summary",
      route_replay: [{ progress: 0, elapsedSec: 0, heartRate: 140 }], route_bounds: [-74, 40, -73, 41], elevation_gain_m: 25, verified: false, provenance: "imported", disposition: "pending",
    })], { onConflict: "user_id,provider,external_id" });
  });
});
