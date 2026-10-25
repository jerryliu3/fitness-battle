import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { freshState, reduceCompete, rollClock } from "@fitness-battle/shared";
const route = vi.hoisted(() => ({ path: "/arena", replay: false }));
vi.mock("@/components/auth-context", () => ({
  useAuth: () => ({ user: { id: "athlete" } }),
}));
vi.mock("next/navigation", () => ({
  usePathname: () => route.path,
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => ({ get: () => (route.replay ? "latest" : null) }),
}));
vi.mock("@radix-ui/react-dialog", () => ({
  Root: "div",
  Trigger: ({ children }: { children: unknown }) =>
    createElement("span", null, children as never),
  Portal: "div",
  Overlay: "div",
  Content: "div",
  Title: "h2",
  Description: "p",
}));
vi.mock("./weekly-social", () => ({ WeeklySocialActions: () => null }));
vi.mock("./result-card", () => ({
  ResultCard: () => createElement("div", null, "Result card"),
}));
import { WeekReveal } from "./week-reveal";
function settled() {
  const now = "2026-10-19T15:00:00Z";
  let state = reduceCompete(freshState(new Date(now)), {
    type: "opt-in",
    sport: "running",
    accountId: "athlete",
    now,
  });
  state = reduceCompete(state, {
    type: "log-manual",
    sport: "running",
    distanceM: 5000,
    movingSec: 1800,
    activityId: "run",
    now,
  });
  return rollClock(state, new Date("2026-10-26T04:00:00Z"));
}
describe("deliberate week results", () => {
  it("keeps ordinary Compete visits free of takeover dialogs, even with pending results", () => {
    route.path = "/arena";
    route.replay = false;
    const state = settled();
    expect(state.periodResults.length).toBeGreaterThan(0);
    expect(
      renderToStaticMarkup(
        createElement(WeekReveal, { state, ready: true, onDismiss: vi.fn() }),
      ),
    ).toBe("");
  });
  it("opens acknowledged results only through the explicit results link", () => {
    route.path = "/arena";
    route.replay = true;
    const state = settled();
    state.periodResults = state.periodResults.map((row) => ({
      ...row,
      acknowledgedAt: "2026-10-26T12:00:00Z",
    }));
    expect(
      renderToStaticMarkup(
        createElement(WeekReveal, { state, ready: true, onDismiss: vi.fn() }),
      ),
    ).toContain("Result card");
    route.path = "/field";
    expect(
      renderToStaticMarkup(
        createElement(WeekReveal, { state, ready: true, onDismiss: vi.fn() }),
      ),
    ).toBe("");
    route.path = "/arena";
    route.replay = false;
  });
});
