import { createElement } from "react";
import { act, create } from "react-test-renderer";
import { expect, it, vi } from "vitest";
import { freshState, type SyncReviewReceipt } from "@fitness-battle/shared";
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
  Modal: "Modal",
  View: "View",
  ScrollView: "ScrollView",
  Text: "Text",
  Pressable: "Pressable",
  ActivityIndicator: "ActivityIndicator",
  StyleSheet: { create: (v: unknown) => v },
  PanResponder: { create: (handlers: object) => ({ panHandlers: handlers }) },
  useWindowDimensions: () => ({ width: 390, height: 844 }),
}));
import { SyncReview } from "./sync-review";
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
