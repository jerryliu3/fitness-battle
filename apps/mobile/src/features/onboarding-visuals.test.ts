import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { expect, it, vi } from "vitest";
const animation = vi.hoisted(() => ({ timing: vi.fn((value: { setValue: (v: number) => void }, config: { toValue: number }) => ({ start: () => value.setValue(config.toValue), stop: vi.fn() })) }));
vi.mock("react-native", () => ({ useColorScheme: () => "light", View: "View", Easing: { linear: "linear" }, Animated: {
  Value: class { listeners: ((v: { value: number }) => void)[] = []; setValue(v: number) { this.listeners.forEach(fn => fn({ value: v })); } addListener(fn: (v: { value: number }) => void) { this.listeners.push(fn); return "1"; } removeListener() {} },
  timing: animation.timing,
} }));
vi.mock("../ui/use-reduced-motion", () => ({ useReducedMotion: () => false }));
vi.mock("../ui/section", () => ({ AppText: "AppText" }));
vi.mock("../ui/standard-line-chart", () => ({ StandardLineChart: "Chart" }));
import { OnboardingPotential } from "./onboarding-potential";
it("starts a fresh reveal and updates a single score reading each time growth appears", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const score = vi.fn();
  for (let i = 0; i < 2; i++) {
    let r!: ReactTestRenderer;
    await act(async () => { r = create(createElement(OnboardingPotential, { onScoreChange: score })); });
    expect(r.root.findByType("Chart" as never).props.followRevealDot).toBe(true);
    expect(r.root.findAllByType("AppText" as never).filter(n => n.props.role === "hero").map(n => n.props.children)).toEqual(["2,000"]);
    await act(async () => r.unmount());
  }
  expect(animation.timing).toHaveBeenCalledTimes(2);
  expect(score).toHaveBeenCalledWith(500);
  expect(score).toHaveBeenCalledWith(2000);
});
