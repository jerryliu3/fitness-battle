import { describe, expect, it, vi } from "vitest";
import { freshState, reduceCompete } from "@fitness-battle/shared";
import { loadCompeteAccount, persistCompeteAccount } from "./compete-persist";

type DbResult<T> = { data: T; error: null };

function thenableQuery<T>(data: T) {
  const response: DbResult<T> = { data, error: null };
  const builder = {
    select: () => builder,
    eq: () => builder,
    in: () => builder,
    order: () => builder,
    limit: () => builder,
    range: () => builder,
    not: () => builder,
    maybeSingle: () => Promise.resolve(response),
    then: (
      onFulfilled?: (value: DbResult<T>) => unknown,
      onRejected?: (reason: unknown) => unknown,
    ) => Promise.resolve(response).then(onFulfilled, onRejected),
  };
  return builder;
}

function tableWriter() {
  return {
    upsert: () => Promise.resolve({ error: null }),
    delete: () => ({
      eq: () => Promise.resolve({ error: null }),
    }),
    insert: () => Promise.resolve({ error: null }),
  };
}

describe("compete account units preference", () => {
  it("loads recorded routes with their owning activity after a refresh", async () => {
    const state = freshState();
    const db = {
      from: (table: string) => thenableQuery(table === "athlete_prefs" ? {
        clock_period_start: state.clock.periodStart, units: "us", onboarding_completed: true,
      } : table === "profiles" ? { primary_sport: "running", display_name: "Runner" } : table === "activities" ? [{
        compete_key: "strava-42", sport: "running", started_at: new Date().toISOString(),
        distance_m: 5000, moving_sec: 1800, verified: true, provenance: "recorded", disposition: "counted",
        source_label: "Strava", summary_polyline: "summary-geometry", detailed_polyline: "detailed-geometry",
      }] : []),
    };
    const loaded = await loadCompeteAccount(db as never, "owner");
    expect(loaded?.state.activities.find(a => a.id === "strava-42")).toMatchObject({
      summaryPolyline: "summary-geometry", detailedPolyline: "detailed-geometry", source: "strava",
    });
  });

  it("preserves an existing activity identity when its compete key has a legacy provider", async () => {
    const state = reduceCompete(freshState(), { type: "log-manual", sport: "running", distanceM: 160, movingSec: 180, activityId: "legacy-key" });
    const rpc = vi.fn(async () => ({ data: "revision", error: null }));
    const db = { rpc, from: (table: string) => thenableQuery(table === "categories" ? [{ id: "running-id", slug: "running" }] : table === "activities" ? [{ compete_key: "legacy-key", provider: "strava", external_id: "original-id" }] : []) };
    await persistCompeteAccount(db as never, "owner", state, "old-revision");
    expect(rpc).toHaveBeenCalledWith("save_compete_account", expect.objectContaining({ p_expected_updated_at: "old-revision", p_activities: [expect.objectContaining({ compete_key: "legacy-key", provider: "strava", external_id: "original-id" })] }));
  });

  it("re-reads a concurrently imported activity and retries without changing the expected revision", async () => {
    const state = reduceCompete(freshState(), { type: "log-manual", sport: "running", distanceM: 160, movingSec: 180, activityId: "legacy-key" });
    let reads = 0;
    const rpc = vi.fn()
      .mockResolvedValueOnce({ data: null, error: { code: "23505", message: 'duplicate key value violates unique constraint "activities_user_compete_key_uidx"' } })
      .mockResolvedValueOnce({ data: "new-revision", error: null });
    const db = { rpc, from: (table: string) => thenableQuery(table === "categories" ? [{ id: "running-id", slug: "running" }] : table === "activities" ? (++reads === 1 ? [] : [{ compete_key: "legacy-key", provider: "strava", external_id: "original-id" }]) : []) };
    expect(await persistCompeteAccount(db as never, "owner", state, "old-revision")).toBe("new-revision");
    expect(rpc).toHaveBeenCalledTimes(2);
    expect(rpc.mock.calls[0]![1]).toMatchObject({ p_expected_updated_at: "old-revision", p_activities: [{ provider: "mock", external_id: "legacy-key" }] });
    expect(rpc.mock.calls[1]![1]).toMatchObject({ p_expected_updated_at: "old-revision", p_activities: [{ provider: "strava", external_id: "original-id" }] });
  });

  it("does not retry unrelated constraints or overwrite a newer account revision", async () => {
    const state = reduceCompete(freshState(), { type: "log-manual", sport: "running", distanceM: 160, movingSec: 180, activityId: "legacy-key" });
    const duplicate = { code: "23505", message: 'duplicate key value violates unique constraint "activities_user_compete_key_uidx"' };
    const db = { rpc: vi.fn().mockResolvedValueOnce({ data: null, error: duplicate }).mockResolvedValueOnce({ data: null, error: { code: "P0001", message: "account_changed_reload" } }), from: (table: string) => thenableQuery(table === "categories" ? [{ id: "running-id", slug: "running" }] : []) };
    await expect(persistCompeteAccount(db as never, "owner", state, "old-revision")).rejects.toThrow("account_changed_reload");
    expect(db.rpc).toHaveBeenCalledTimes(2);
    expect(db.rpc.mock.calls[1]![1].p_expected_updated_at).toBe("old-revision");
    db.rpc.mockReset().mockResolvedValue({ data: null, error: { code: "23505", message: 'duplicate key value violates unique constraint "other_constraint"' } });
    await expect(persistCompeteAccount(db as never, "owner", state, "old-revision")).rejects.toThrow("other_constraint");
    expect(db.rpc).toHaveBeenCalledTimes(1);
  });

  it("persists and reloads metric units from athlete_prefs", async () => {
    const userId = "user-units";
    let storedUnits = "us";
    const state = reduceCompete(freshState(), {
      type: "set-units",
      units: "metric",
    });

    function prefsRow() {
      return {
        freezes_left: 3,
        calibrated: false,
        onboarding_completed: true,
        clock_period_start: state.clock.periodStart,
        focus_family: "sport",
        focus_id: state.primary,
        units: storedUnits,
        training_goal_distance: null,
        training_goal_deadline: null,
        lesson_done_on: null,
      };
    }

    const db = {
      rpc: vi.fn(async (_name: string, args: any) => { storedUnits = args.p_state.units; return { data: "2026-10-20T13:00:00Z", error: null }; }),
      from: vi.fn((table: string) => {
        if (table === "profiles") {
          return {
            ...tableWriter(),
            update: () => ({
              eq: () => ({
                select: () =>
                  Promise.resolve({ data: [{ id: userId }], error: null }),
              }),
            }),
            ...thenableQuery({
              display_name: "Test",
              city: "Toronto",
              primary_sport: state.primary,
              avatar_url: null,
            }),
          };
        }
        if (table === "athlete_prefs") {
          return {
            ...tableWriter(),
            upsert: (row: { units?: string }) => {
              if (row.units) storedUnits = row.units;
              return Promise.resolve({ error: null });
            },
            ...thenableQuery(prefsRow()),
          };
        }
        return {
          ...tableWriter(),
          ...thenableQuery([]),
        };
      }),
    };

    await persistCompeteAccount(db as never, userId, state, null);
    expect(storedUnits).toBe("metric");

    const loaded = await loadCompeteAccount(db as never, userId);
    expect(loaded?.state.units).toBe("metric");
  });
});
