vi.mock("../ui/screen-fade", () => ({ ScreenFade: ({ children }: { children: unknown }) => children }));
import { createElement } from "react";
import { act, create } from "react-test-renderer";
import { expect, it, vi } from "vitest";
import { encodePolyline, freshState, type SyncReviewReceipt } from "@fitness-battle/shared";
vi.mock("../ui/sync-energy-core", () => ({ SyncEnergyCore: "SyncEnergyCore" }));
vi.mock("../ui/material-back", () => ({ MaterialClose: "MaterialClose" }));
vi.mock("../ui/app-icon", () => ({ AppIcon: "AppIcon" }));
vi.mock("../ui/activity-route", () => ({ ActivityReplay: "ActivityReplay", ActivitySummaryMetrics: "ActivitySummaryMetrics" }));
vi.mock("../ui/route-static-preview", () => ({ RouteStaticPreview: "RouteStaticPreview" }));
vi.mock("./competition-moment", () => ({ CompetitionMoment: "CompetitionMoment" }));
vi.mock("../ui/use-reduced-motion", () => ({ useReducedMotion: () => true }));
vi.mock("react-native-safe-area-context", () => ({ SafeAreaProvider: "SafeAreaProvider", SafeAreaView: "SafeAreaView", useSafeAreaInsets: () => ({ top: 59, bottom: 34, left: 0, right: 0 }) }));
vi.mock("../ui/focus", () => ((()=>{const mock={
  FocusSheet: "Sheet",
  FocusButton: "Button",
  f: {},
};return {...mock,useFocusStyles:()=>("f" in mock ? mock.f : {})};})()));
vi.mock("react-native", () => ({useColorScheme: () => "light",
  AppState: { currentState: "active", addEventListener: vi.fn(() => ({ remove: vi.fn() })) },
  Modal: "Modal",
  View: "View",
  ScrollView: "ScrollView",
  Text: "Text",
  Pressable: "Pressable",
  ActivityIndicator: "ActivityIndicator",
  StyleSheet: { create: (v: unknown) => v, absoluteFill: {} },
  PanResponder: { create: (handlers: object) => ({ panHandlers: handlers }) },
  useWindowDimensions: () => ({ width: 390, height: 844, fontScale: 1 }),
  Platform: { OS: "ios" },
  LayoutAnimation: { configureNext: vi.fn(), Presets: { easeInEaseOut: {} } },
  Animated: {
    View: "AnimatedView",
    Value: class {
      constructor(public value: number = 0) {}
      setValue(v: number) { this.value = v; }
    },
    timing: (val: { value: number }, config: { toValue: number }) => ({
      start: (cb?: () => void) => {
        val.value = config.toValue;
        cb?.();
      },
      stop: vi.fn(),
    }),
  },
  Easing: {
    out: vi.fn(() => vi.fn()),
    cubic: vi.fn(),
    ease: vi.fn(),
  },
}));
import { SyncReview, computeWindowStart, SyncReviewCarouselDots } from "./sync-review";
it("a native full-screen swipe confirms the selected activities once without navigating away", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const done = vi.fn(() => "running" as const),
    receipt: SyncReviewReceipt = {
      account: "a",
      day: "2026-10-22",
      preview: false,
      activities: [
        {
          id: "a",
          sport: "running",
          startedAt: "2026-10-22T12:00:00Z",
          summaryPolyline: encodePolyline([[-73.98,40.75],[-73.97,40.76]]),
          distanceM: 5000,
          movingSec: 1800,
          avgHr: null,
          source: "strava",
          verified: true,
          provenance: "recorded",
          disposition: "counted",
        },
      ],
    };
  let renderer: ReturnType<typeof create>;
  await act(async () => {
    renderer = create(
      createElement(SyncReview, {
        receipt,
        state: freshState(new Date("2026-10-22T18:00:00Z")),
        onComplete: done,
      }),
    );
  });
  const energy = () => renderer!.root.findByType("SyncEnergyCore" as never).props;
  const viewport = renderer!.root.findAllByType("ScrollView" as never).find(node => !node.props.horizontal)!;
  const review = viewport.findAllByType("View" as never).find(node => node.props.onLayout)!;
  const layout = (height: number) => ({ nativeEvent: { layout: { height } } });
  await act(async () => {
    viewport.props.onLayout(layout(720));
    review.props.onLayout(layout(398));
  });
  expect(energy().sideTotals).toBe(false);
  const preferredSize = energy().size;
  await act(async () => viewport.props.onLayout(layout(680)));
  expect(energy().sideTotals).toBe(true);
  const compactSize = energy().size;
  expect(compactSize).toBeLessThanOrEqual(preferredSize);
  await act(async () => viewport.props.onLayout(layout(620)));
  expect(energy().size).toBeLessThan(compactSize);
  expect(viewport.findAll(node => !!node.props.onResponderRelease)).toHaveLength(0);

  const map = renderer!.root.findByType("RouteStaticPreview" as never);
  expect(map.props.width).toBe(342);
  expect(map.props.height).toBe(135);
  const carousel = renderer!.root.findAllByType("ScrollView" as never).find(node => node.props.horizontal)!;
  expect(carousel.props.scrollEnabled).toBe(false);
  expect(carousel.props.contentContainerStyle).toEqual(expect.objectContaining({ justifyContent: "center" }));
  const summary = renderer!.root.findAllByType("ScrollView" as never).find(node => !node.props.horizontal)!;
  expect(summary.props.scrollEnabled).not.toBe(false);
  const details = renderer!.root.findAllByType("Pressable" as never).find(node => node.props.accessibilityLabel === "View Running activity details")!;
  await act(async () => details.props.onPress());
  const cachedReplay = renderer!.root.findByType("ActivityReplay" as never);
  expect(cachedReplay.props.open).toBe(true);
  expect(cachedReplay.props.backLabel).toBe("Back to activities");
  await act(async () => cachedReplay.props.onClose());
  expect(renderer!.root.findByType("ActivityReplay" as never).props.open).toBe(false);
  const slider = renderer!.root
    .findAllByType("View" as never)
    .find((n) => n.props.onResponderRelease)!;
  await act(async () => {
    slider.props.onResponderGrant({ nativeEvent: { pageX: 0 } });
    slider.props.onResponderRelease({ nativeEvent: { pageX: 20 } });
  });
  expect(done).not.toHaveBeenCalled();
  expect(renderer!.root.findByType("SyncEnergyCore" as never).props.draining).toBe(false);
  await act(async () => {
    slider.props.onResponderGrant({ nativeEvent: { pageX: 0 } });
    slider.props.onResponderMove({ nativeEvent: { pageX: 220 } });
    slider.props.onResponderRelease({ nativeEvent: { pageX: 220 } });
    slider.props.onResponderRelease({ nativeEvent: { pageX: 220 } });
  });
  expect(renderer!.root.findByType("SyncEnergyCore" as never).props.draining).toBe(true);
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 1000)); });
  expect(done).toHaveBeenCalledTimes(1);
  expect(done).toHaveBeenCalledWith(["a"]);
  expect(renderer!.root.findAllByType("Modal" as never)[0].props.presentationStyle).toBe("fullScreen");
  await act(async () => renderer!.unmount());
});

it("computes carousel dot window slide when advancing past the second last dot and backward", () => {
  // With 10 items and maxVisible = 5:
  // Starts at index 0..3: windowStart stays 0 (dot 3 is the second-last visible dot)
  expect(computeWindowStart(0, 0, 10, 5)).toBe(0);
  expect(computeWindowStart(0, 1, 10, 5)).toBe(0);
  expect(computeWindowStart(0, 2, 10, 5)).toBe(0);
  expect(computeWindowStart(0, 3, 10, 5)).toBe(0);

  // Moving to index 4 (past the second-last visible dot 3) slides window to 1
  expect(computeWindowStart(0, 4, 10, 5)).toBe(1);
  // Moving to index 5 slides window to 2
  expect(computeWindowStart(1, 5, 10, 5)).toBe(2);
  // Advancing to the end caps at maxStart = 5
  expect(computeWindowStart(4, 8, 10, 5)).toBe(5);
  expect(computeWindowStart(5, 9, 10, 5)).toBe(5);

  // Moving backward from index 9 to index 7 stays at window 5
  expect(computeWindowStart(5, 7, 10, 5)).toBe(5);
  expect(computeWindowStart(5, 6, 10, 5)).toBe(5);
  // Moving backward to index 5 (below threshold 5 + 1 = 6) slides window to 4
  expect(computeWindowStart(5, 5, 10, 5)).toBe(4);
});

it("supports Select all and Deselect all, and omits the saved safely message", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const done = vi.fn();
  const receipt: SyncReviewReceipt = {
    account: "a",
    day: "2026-10-22",
    preview: false,
    activities: [
      {
        id: "act-1",
        sport: "running",
        startedAt: "2026-10-22T10:00:00Z",
        distanceM: 3000,
        movingSec: 1200,
        avgHr: null,
        source: "strava",
        verified: true,
        provenance: "recorded",
        disposition: "counted",
      },
      {
        id: "act-2",
        sport: "cycling",
        startedAt: "2026-10-22T14:00:00Z",
        distanceM: 10000,
        movingSec: 2400,
        avgHr: null,
        source: "strava",
        verified: true,
        provenance: "recorded",
        disposition: "counted",
      },
    ],
  };

  let renderer: ReturnType<typeof create>;
  await act(async () => {
    renderer = create(
      createElement(SyncReview, {
        receipt,
        state: freshState(new Date("2026-10-22T18:00:00Z")),
        onComplete: done,
      }),
    );
  });

  // Verify "Your synced activities are saved safely." is NOT anywhere in rendered text
  const allTexts = renderer!.root.findAllByType("Text" as never).map((t) => t.props.children).flat();
  expect(allTexts.join(" ")).not.toContain("Your synced activities are saved safely");

  // Find Select all and Deselect all buttons
  const buttons = renderer!.root.findAllByType("Pressable" as never);
  const deselectAllBtn = buttons.find((b) => b.props.accessibilityLabel === "Deselect all activities");
  const selectAllBtn = buttons.find((b) => b.props.accessibilityLabel === "Select all activities");

  expect(deselectAllBtn).toBeDefined();
  expect(selectAllBtn).toBeDefined();

  expect(renderer!.root.findByType("SyncEnergyCore" as never).props.benchmarkSeconds).toBe(3600);

  // Initially all 2 activities are selected, so Select all is disabled
  expect(selectAllBtn!.props.accessibilityState?.disabled).toBe(true);
  expect(deselectAllBtn!.props.accessibilityState?.disabled).toBe(false);

  // Press Deselect all
  await act(async () => {
    deselectAllBtn!.props.onPress();
  });

  expect(renderer!.root.findByType("SyncEnergyCore" as never).props.activities).toEqual([]);

  // Now 0 are selected
  expect(deselectAllBtn!.props.accessibilityState?.disabled).toBe(true);
  expect(selectAllBtn!.props.accessibilityState?.disabled).toBe(false);

  // Press Select all
  await act(async () => {
    selectAllBtn!.props.onPress();
  });

  expect(selectAllBtn!.props.accessibilityState?.disabled).toBe(true);
  expect(deselectAllBtn!.props.accessibilityState?.disabled).toBe(false);

  await act(async () => deselectAllBtn!.props.onPress());
  const close = renderer!.root.findByType("MaterialClose" as never);
  expect(close.props.label).toBe("Dismiss review");
  await act(async () => close.props.onPress());
  expect(done).toHaveBeenCalledWith(undefined, true);

  await act(async () => renderer!.unmount());
});

it("renders scrollable carousel dots with fixed window when activities exceed 5", async () => {
  const onSelect = vi.fn();
  let renderer: ReturnType<typeof create>;
  await act(async () => {
    renderer = create(
      createElement(SyncReviewCarouselDots, {
        total: 8,
        activeIndex: 0,
        onSelectIndex: onSelect,
      }),
    );
  });

  const tablist = renderer!.root.findByProps({ accessibilityRole: "tablist" });
  expect(tablist.props.style.width).toBe(66);
  expect(tablist.props.style.overflow).toBe("hidden");

  // All 8 tabs exist inside the animated track
  const tabs = renderer!.root.findAllByProps({ accessibilityRole: "tab" });
  expect(tabs).toHaveLength(8);

  // Pressing a tab triggers onSelectIndex
  await act(async () => {
    tabs[3]!.props.onPress();
  });
  expect(onSelect).toHaveBeenCalledWith(3);

  await act(async () => renderer!.unmount());
});

it("renders non-windowed carousel dots when activities are 5 or fewer, and null for 1", async () => {
  let renderer: ReturnType<typeof create>;
  await act(async () => {
    renderer = create(
      createElement(SyncReviewCarouselDots, {
        total: 3,
        activeIndex: 1,
      }),
    );
  });

  const tablist = renderer!.root.findByProps({ accessibilityRole: "tablist" });
  expect(tablist.props.style.width).toBeUndefined();
  expect(tablist.props.style.overflow).toBeUndefined();

  const tabs = renderer!.root.findAllByProps({ accessibilityRole: "tab" });
  expect(tabs).toHaveLength(3);
  expect(tabs[1]!.props.accessibilityState.selected).toBe(true);

  await act(async () => renderer!.unmount());

  // 1 activity returns null
  await act(async () => {
    renderer = create(
      createElement(SyncReviewCarouselDots, {
        total: 1,
        activeIndex: 0,
      }),
    );
  });
  expect(renderer!.toJSON()).toBeNull();
  await act(async () => renderer!.unmount());
});
