vi.mock("../ui/screen-fade", () => ({ ScreenFade: ({ children }: { children: unknown }) => children }));
import { createElement } from "react";
import { act, create } from "react-test-renderer";
import { expect, it, vi } from "vitest";
import { encodePolyline, freshState, type SyncReviewReceipt } from "@fitness-battle/shared";
vi.mock("../ui/activity-route", () => ({ ActivityRoute: "ActivityRoute" }));
vi.mock("../ui/route-static-preview", () => ({ RouteStaticPreview: "RouteStaticPreview" }));
vi.mock("./competition-moment", () => ({ CompetitionMoment: "CompetitionMoment" }));
vi.mock("../ui/use-reduced-motion", () => ({ useReducedMotion: () => true }));
vi.mock("react-native-safe-area-context", () => ({ SafeAreaProvider: "SafeAreaProvider", SafeAreaView: "SafeAreaView" }));
vi.mock("../ui/focus", () => ({
  FocusSheet: "Sheet",
  FocusButton: "Button",
  f: {},
}));
vi.mock("react-native", () => ({
  AppState: { currentState: "active", addEventListener: vi.fn(() => ({ remove: vi.fn() })) },
  Modal: "Modal",
  View: "View",
  ScrollView: "ScrollView",
  Text: "Text",
  Pressable: "Pressable",
  ActivityIndicator: "ActivityIndicator",
  StyleSheet: { create: (v: unknown) => v, absoluteFill: {} },
  PanResponder: { create: (handlers: object) => ({ panHandlers: handlers }) },
  useWindowDimensions: () => ({ width: 390, height: 844 }),
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
  const map = renderer!.root.findByType("RouteStaticPreview" as never);
  expect(map.props.width).toBe(Math.round(390 * .82));
  expect(map.props.height).toBe(180);
  const slider = renderer!.root
    .findAllByType("View" as never)
    .find((n) => n.props.onResponderRelease)!;
  await act(async () => {
    slider.props.onResponderGrant({ nativeEvent: { pageX: 0 } });
    slider.props.onResponderRelease({ nativeEvent: { pageX: 20 } });
  });
  expect(done).not.toHaveBeenCalled();
  await act(async () => {
    slider.props.onResponderGrant({ nativeEvent: { pageX: 0 } });
    slider.props.onResponderMove({ nativeEvent: { pageX: 220 } });
    slider.props.onResponderRelease({ nativeEvent: { pageX: 220 } });
    slider.props.onResponderRelease({ nativeEvent: { pageX: 220 } });
  });
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 1000)); });
  expect(done).toHaveBeenCalledTimes(1);
  expect(done).toHaveBeenCalledWith(["a"]);
  expect(renderer!.root.findByType("Modal" as never).props.presentationStyle).toBe("fullScreen");
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

  // Initially all 2 activities are selected, so Select all is disabled
  expect(selectAllBtn!.props.accessibilityState?.disabled).toBe(true);
  expect(deselectAllBtn!.props.accessibilityState?.disabled).toBe(false);

  // Press Deselect all
  await act(async () => {
    deselectAllBtn!.props.onPress();
  });

  // Now 0 are selected
  expect(deselectAllBtn!.props.accessibilityState?.disabled).toBe(true);
  expect(selectAllBtn!.props.accessibilityState?.disabled).toBe(false);

  // Press Select all
  await act(async () => {
    selectAllBtn!.props.onPress();
  });

  expect(selectAllBtn!.props.accessibilityState?.disabled).toBe(true);
  expect(deselectAllBtn!.props.accessibilityState?.disabled).toBe(false);

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
