import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, describe, expect, it, vi } from "vitest";
import { freshState, type PeriodResult } from "@fitness-battle/shared";

const mock = vi.hoisted(() => ({ earned: vi.fn(), push: vi.fn() }));
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
vi.mock("react-native", () => ({ View: "View", Modal: "Modal", StyleSheet: { create: (s: unknown) => s } }));
vi.mock("react-native-safe-area-context", () => ({ SafeAreaProvider: "Provider", SafeAreaView: "SafeArea", initialWindowMetrics: null }));
vi.mock("../theme", async () => {
  const { getAppColors } = await import("@fitness-battle/shared");
  return { useThemeColors: () => getAppColors("light") };
});
vi.mock("expo-status-bar", () => ({ StatusBar: "StatusBar" }));
vi.mock("expo-router", () => ({ useRouter: () => ({ push: mock.push }) }));
vi.mock("../ui/section", () => ({ AppText: "Text" }));
vi.mock("../ui/focus", () => ({ FocusButton: "Button", FocusSheet: "Sheet" }));
vi.mock("../ui/use-reduced-motion", () => ({ useReducedMotion: () => true }));
vi.mock("../ui/mascot/animated-ember", () => ({ AnimatedEmber: "Mascot" }));
vi.mock("../ui/standard-line-chart", () => ({ StandardLineChart: "Chart" }));
vi.mock("../lib/haptics", () => ({ playPattern: mock.earned }));
vi.mock("./competition-replay", () => ({ CompetitionReplayButton: "Replay" }));
vi.mock("./result-card", () => ({ ResultCard: "ResultCard" }));
vi.mock("./weekly-social", () => ({ WeeklySocialActions: "Social" }));
vi.mock("./week-recap-background", () => ({ WeekRecapBackground: "Background" }));
vi.mock("./week-recap-fit", () => ({ WeekRecapFit: ({ children }: { children: unknown }) => children }));
import { WeekRecap } from "./week-recap";

const running: PeriodResult = {
  id: "running", sport: "running", track: "open", periodStart: "2026-11-02T05:00:00Z", periodEnd: "2026-11-09T05:00:00Z",
  place: 1, fieldSize: 8, effort: 5, movingSec: 1800, distanceM: 5000, eloBefore: 1100, eloAfter: 1105,
  frozen: false, settledAt: "2026-11-09T05:00:00Z",
};
let view: ReactTestRenderer | undefined;
afterEach(() => { if (view) act(() => view!.unmount()); view = undefined; vi.clearAllMocks(); });
const press = (label: string) => act(() => view!.root.findByProps({ label }).props.onPress());
const step = () => view!.root.findByProps({ accessibilityRole: "progressbar" }).props.accessibilityValue.now;

describe("native week recap navigation", () => {
  it("pairs sports, supports Back and acknowledges only after the last page", () => {
    const cycling = { ...running, id: "cycling", sport: "cycling" as const };
    const state = { ...freshState(), periodResults: [running, cycling] };
    const close = vi.fn();
    act(() => { view = create(createElement(WeekRecap, { state, results: [cycling, running], social: false, onClose: close })); });
    expect(step()).toBe(1);
    press("Reveal my finish →");
    expect(view!.root.findByType("ResultCard" as never).props.result.id).toBe("running");
    press("See what added up →");
    expect(step()).toBe(3);
    press("Back");
    expect(step()).toBe(2);
    expect(close).not.toHaveBeenCalled();
    press("See what added up →");
    press("Cycling results →");
    expect(view!.root.findByType("ResultCard" as never).props.result.id).toBe("cycling");
    press("See what added up →");
    expect(step()).toBe(5);
    expect(close).not.toHaveBeenCalled();
    press("Done");
    expect(close).toHaveBeenCalledTimes(1);
    expect(mock.earned).toHaveBeenCalledTimes(1);
  });
  it("does not celebrate already acknowledged results when reopening their recap", () => {
    const state = { ...freshState(), periodResults: [{ ...running, acknowledgedAt: "2026-11-09T08:00:00Z" }] };
    act(() => { view = create(createElement(WeekRecap, { state, results: [{ ...running, acknowledgedAt: null }], social: false, onClose: vi.fn() })); });
    press("Reveal my finish →");
    expect(mock.earned).not.toHaveBeenCalled();
  });
});
