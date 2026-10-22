import { createElement } from "react";
import { act, create } from "react-test-renderer";
import { expect, it, vi } from "vitest";
import { freshState, type SyncReviewReceipt } from "@fitness-battle/shared";
const nav = vi.hoisted(() => vi.fn());
vi.mock("expo-router", () => ({ useRouter: () => ({ navigate: nav }) }));
vi.mock("../ui/focus", () => ({
  FocusSheet: "Sheet",
  FocusButton: "Button",
  f: {},
}));
vi.mock("react-native", () => ({
  View: "View",
  ScrollView: "ScrollView",
  Text: "Text",
  Pressable: "Pressable",
  StyleSheet: { create: (v: unknown) => v },
  PanResponder: { create: (handlers: object) => ({ panHandlers: handlers }) },
}));
import { SyncReview } from "./sync-review";
it("a native swipe confirms once and reveals the applicable field", async () => {
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
  expect(done).toHaveBeenCalledTimes(1);
  expect(nav).toHaveBeenCalledWith({
    pathname: "/arena",
    params: { event: "running" },
  });
  await act(async () => renderer!.unmount());
});
