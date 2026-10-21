import { describe, expect, it, vi } from "vitest";
import { freshState, reduceCompete } from "@fitness-battle/shared";
import { loadCompeteAccount, persistCompeteAccount } from "./compete-persist";

type DbResult<T> = { data: T; error: null };

function thenableQuery<T>(data: T) {
  const response: DbResult<T> = { data, error: null };
  const builder = {
    select: () => builder,
    eq: () => builder,
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
