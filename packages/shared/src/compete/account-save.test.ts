import { describe, expect, it } from "vitest";
import type { Action } from "./engine";
import { freshState, withAccountEloBaseline } from "./sports";
import {
  accountSavePlan,
  coalesceSaveActions,
  dequeueAccountSaveWork,
  runAccountSaveSteps,
} from "./account-save";

const now = new Date("2026-10-28T15:00:00Z");
const state = withAccountEloBaseline(freshState(now));

describe("coalesceSaveActions", () => {
  it("drops redundant disposition intents covered by apply-sync", () => {
    const actions = coalesceSaveActions([
      { type: "set-disposition", activityId: "a-1", disposition: "excluded" } as Action,
      { type: "set-disposition", activityId: "a-2", disposition: "excluded" } as Action,
      {
        type: "apply-sync",
        provider: "strava",
        activities: [
          { id: "a-1", disposition: "excluded" },
          { id: "a-2", disposition: "counted" },
        ],
      } as Action,
    ]);
    expect(actions).toEqual([
      {
        type: "apply-sync",
        provider: "strava",
        activities: [
          { id: "a-1", disposition: "excluded" },
          { id: "a-2", disposition: "counted" },
        ],
      },
    ]);
  });
});

describe("accountSavePlan", () => {
  it("sends one intent batch plus document when a recovered draft still needs full persist", () => {
    const steps = accountSavePlan(
      [{ type: "rename", name: "Ada" } as Action],
      state,
      true,
    );
    expect(steps.map((step) => step.kind)).toEqual(["actions", "document"]);
  });

  it("uses a single actions step for sync and intent work", () => {
    const steps = accountSavePlan(
      [
        { type: "import-history", level: "steady" } as Action,
        { type: "rename", name: "Ada" } as Action,
      ],
      state,
    );
    expect(steps).toEqual([
      {
        kind: "actions",
        actions: [
          { type: "import-history", level: "steady" },
          { type: "rename", name: "Ada" },
        ],
      },
    ]);
  });
});

describe("runAccountSaveSteps", () => {
  it("returns partial progress on transport failure without invalid Response status", async () => {
    const steps = accountSavePlan(
      [
        { type: "import-history", level: "steady" } as Action,
        { type: "rename", name: "Ada" } as Action,
      ],
      state,
    );
    let calls = 0;
    const result = await runAccountSaveSteps("athlete", "rev-a", steps, async () => {
      calls += 1;
      if (calls === 1) {
        return new Response(JSON.stringify({ ok: true, updatedAt: "rev-b", state }), {
          status: 200,
        });
      }
      throw new TypeError("Failed to fetch");
    });
    expect(result.transportError).toBe(true);
    expect(result.response).toBe(null);
    expect(result.revision).toBe("rev-b");
    expect(result.completedStepCount).toBe(1);
  });
});

describe("dequeueAccountSaveWork", () => {
  it("keeps pendingDocument until the document step succeeds", () => {
    const actions = [{ type: "import-history" } as Action];
    const steps = accountSavePlan(actions, state, true);
    expect(dequeueAccountSaveWork(steps, 1, actions, true).document).toBe(true);
    expect(dequeueAccountSaveWork(steps, 2, actions, true).document).toBe(false);
  });
});