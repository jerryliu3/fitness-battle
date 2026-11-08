import { describe, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({
  upsert: vi.fn(async (_rows: unknown) => ({ error: null })),
  existing: [] as Record<string, unknown>[],
}));
vi.mock("./env", () => ({ serverEnv: { supabaseServiceRoleKey: "test-only" } }));
vi.mock("./supabase/config", () => ({ getSupabaseConfig: () => ({ configured: true, supabaseUrl: "http://localhost:54621" }) }));
vi.mock("@supabase/supabase-js", () => ({ createClient: () => ({
  from: (table: string) => table === "categories" ? { select: async () => ({ data: [{ id: "category", slug: "running" }], error: null }) }
    : table === "activities" ? {
      select: () => ({ eq: async () => ({ data: mock.existing, error: null }) }),
      upsert: mock.upsert,
    }
    : { select: () => ({ eq: async () => ({ data: [], error: null }) }) },
}) }));
import { persistSyncedActivities } from "./fitness-store";

describe("GPS file persistence", () => {
  it("keeps geometry and import identity without assigning GPS credit or a connected tracker", async () => {
    mock.existing = [];
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


it("persists Garmin GPS evidence rather than treating every sync as GPS", async () => {
  for (const verified of [false, true, undefined]) {
    mock.existing = [];
    await persistSyncedActivities("11111111-1111-4111-8111-111111111111", [{
      id: "garmin-one", externalId: "one", provider: "garmin", categorySlug: "running",
      startedAt: "2026-10-30T12:00:00Z", metricValue: 2000, movingSec: 600, rawName: "Run", verified,
    }]);
    expect(mock.upsert).toHaveBeenLastCalledWith([expect.objectContaining({ verified: verified === true })], { onConflict: "user_id,provider,external_id" });
  }
});

it("preserves excluded disposition on re-sync and excludes duplicate workouts", async () => {
  mock.existing = [
    {
      provider: "apple_health",
      external_id: "hk-excluded",
      compete_key: "apple_health-hk-excluded",
      sport: "running",
      started_at: "2026-10-30T12:00:00Z",
      distance_m: 5000,
      moving_sec: 1500,
      verified: false,
      provenance: "recorded",
      disposition: "excluded",
      disposition_reason: "Deselected during sync review.",
      source_label: "apple_health",
    },
  ];
  await persistSyncedActivities("11111111-1111-4111-8111-111111111111", [
    {
      id: "apple_health-hk-excluded",
      externalId: "hk-excluded",
      provider: "apple_health",
      categorySlug: "running",
      startedAt: "2026-10-30T12:00:00Z",
      metricValue: 5000,
      movingSec: 1500,
      rawName: "Run",
    },
    {
      id: "apple_health-hk-1",
      externalId: "hk-1",
      provider: "apple_health",
      categorySlug: "running",
      startedAt: "2026-10-31T12:00:00Z",
      metricValue: 8000,
      movingSec: 2400,
      rawName: "Run",
    },
    {
      id: "apple_health-hk-2",
      externalId: "hk-2",
      provider: "apple_health",
      categorySlug: "running",
      startedAt: "2026-10-31T12:00:20Z",
      metricValue: 8050,
      movingSec: 2405,
      rawName: "Run",
    },
  ]);
  expect(mock.upsert).toHaveBeenLastCalledWith(
    [
      expect.objectContaining({
        external_id: "hk-excluded",
        disposition: "excluded",
        disposition_reason: "Deselected during sync review.",
        verified: false,
      }),
      expect.objectContaining({
        external_id: "hk-1",
        disposition: "counted",
        verified: true,
      }),
      expect.objectContaining({
        external_id: "hk-2",
        disposition: "excluded",
        verified: false,
      }),
    ],
    { onConflict: "user_id,provider,external_id" },
  );
});
