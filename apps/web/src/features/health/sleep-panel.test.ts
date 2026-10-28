import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { demoSleepNight, freshState } from "@fitness-battle/shared";
import { SleepPanel } from "./sleep-panel";

describe("sleep reading context", () => {
  it("dates and labels an older sample instead of calling it last night", () => {
    const now = new Date("2026-10-27T16:00:00Z");
    const state = freshState(now);
    state.healthRatings = state.healthRatings.map(rating => ({ ...rating, optedIn: true }));
    state.sleepNights = [demoSleepNight("oura", "2026-10-25")];
    const html = renderToStaticMarkup(createElement(SleepPanel, { state, now, onJoin: () => {}, onLeave: () => {} }));
    expect(html).toContain("Latest sleep");
    expect(html).toContain("Sample reading");
    expect(html).toContain("Wake date 2026-10-25");
    expect(html).toContain("current competition week");
  });
});
