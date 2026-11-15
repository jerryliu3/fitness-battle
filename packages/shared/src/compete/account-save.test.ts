import { describe, expect, it } from "vitest";
import type { Action } from "./engine";
import { freshState, withAccountEloBaseline } from "./sports";
import { accountSavePlan, dequeueAccountSaveWork, runAccountSaveSteps } from "./account-save";

const now = new Date("2026-10-28T15:00:00Z");
const state = withAccountEloBaseline(freshState(now));

describe("accountSavePlan", () => {
  it("appends a document step when a recovered draft still needs full persist", () => {
    const steps = accountSavePlan(
      [],
      [{ type: "rename", name: "Ada" } as Action],
      state,
      true,
    );
    expect(steps.map((step) => step.kind)).toEqual(["intents", "document"]);
  });
});

describe("runAccountSaveSteps", () => {
  it("returns partial progress on transport failure without invalid Response status", async () => {
    const steps = accountSavePlan([{ type: "import-history", level: "steady" } as Action], [], state);
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
    const sync = [{ type: "import-history" } as Action];
    const steps = accountSavePlan(sync, [], state, true);
    expect(dequeueAccountSaveWork(steps, 1, sync, [], true).document).toBe(true);
    expect(dequeueAccountSaveWork(steps, 2, sync, [], true).document).toBe(false);
  });
});