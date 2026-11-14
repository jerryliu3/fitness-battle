import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, expect, it, vi } from "vitest";
import { freshState } from "@fitness-battle/shared";
vi.mock("react-native", () => ({useColorScheme: () => "light",
  View: "View",
  Text: "Text",
  Pressable: "Pressable",
  Animated: {
    View: "AnimatedView",
    Value: class {
      setValue() {}
      stopAnimation() {}
      interpolate() { return 0; }
    },
    timing: () => ({ start: (cb?: (r: { finished: boolean }) => void) => cb?.({ finished: true }) }),
  },
  Easing: { cubic: "cubic", in: (v: unknown) => v, out: (v: unknown) => v },
  LayoutAnimation: { configureNext: vi.fn(), Presets: { easeInEaseOut: {} } },
  AccessibilityInfo: {
    isReduceMotionEnabled: () => Promise.resolve(true),
    addEventListener: () => ({ remove() {} }),
  },
  useWindowDimensions: () => ({ fontScale: 1.5, width: 320 }),
  StyleSheet: { create: (value: unknown) => value },
}));
vi.mock("react-native-svg", () => ({
  default: "Svg",
  Circle: "Circle",
  G: "G",
  Line: "Line",
  Path: "Path",
  Polyline: "Polyline",
  Text: "SvgText",
}));
vi.mock("../ui/section", () => ({
  AppText: "Text",
  textStyle: () => ({}),
  chartTextProps: () => ({}),
}));
vi.mock("../ui/chart-scrubber", () => ({
  ChartScrubber: ({ children }: { children: unknown }) => children,
}));
import { DailyHealth } from "./daily-health";
let view: ReactTestRenderer;
afterEach(async () => {
  if (view) await act(async () => view.unmount());
  vi.unstubAllGlobals();
});
it("opens honest reading details with accessible expanded state and 7-day corridor chart", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const now = new Date("2026-10-25T03:30:00Z");
  const state = freshState(now);
  state.demoNow = now.toISOString();
  state.dailyHealth = [{ provider: "garmin", day: "2026-10-24", steps: 8420, restingHr: 52, hrv: 64 }];
  await act(async () => {
    view = create(createElement(DailyHealth, { state }));
  });
  const tiles = () => view.root.findAll((node) => (node.type as unknown) === "Pressable");
  expect(tiles()).toHaveLength(4);
  expect(tiles()[0].props.style[1].width).toBe("100%");
  const initialJson = JSON.stringify(view.toJSON());
  expect(initialJson).not.toContain("7 day range");
  expect(initialJson).toContain('"0"');
  expect(initialJson).toContain('"8,420"');
  await act(async () => {
    tiles()[2].props.onPress();
  });
  expect(tiles()[2].props.accessibilityState.expanded).toBe(true);
  expect(JSON.stringify(view.toJSON())).not.toContain("Baseline corridor:");
  expect(JSON.stringify(view.toJSON())).not.toContain("Below corridor");
  expect(JSON.stringify(view.toJSON())).toContain("Resting HR");
  await act(async () => {
    tiles()[2].props.onPress();
  });
  expect(tiles()[2].props.accessibilityState.expanded).toBe(false);
});
