import { describe, expect, it } from "vitest";
import { getDemoCompeteState } from "./compete-demo-seed";
import { DEMO_ACCOUNTS } from "./demo-data";
import { dayKey } from "./period";

describe("compete-demo-seed dayKey consistency", () => {
  it("uses dayKey format YYYY-MM-DD consistent with Eastern app timezone for all sleep and readiness entries", () => {
    const today = dayKey(new Date());
    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    for (const demo of DEMO_ACCOUNTS) {
      const state = getDemoCompeteState(demo.id);
      if (!state) continue;

      if (state.sleepNights) {
        for (const s of state.sleepNights) {
          expect(s.day).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        }
      }

      if (state.readiness) {
        for (const r of state.readiness) {
          expect(r.day).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        }
      }

      if (state.dailyHealth) {
        for (const d of state.dailyHealth) {
          expect(d.day).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        }
      }

      if (state.lessonDoneOn) {
        expect(state.lessonDoneOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
    }
  });
});
