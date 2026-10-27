import { createElement } from "react";
import { act, create } from "react-test-renderer";
import { expect, it, vi } from "vitest";
vi.mock("react-native", () => ({
  View: "View",
  Text: "Text",
  Pressable: "Pressable",
  ScrollView: "ScrollView",
  useWindowDimensions: () => ({ width: 390, height: 844, scale: 2, fontScale: 1 }),
  StyleSheet: { create: (x: unknown) => x },
}));
vi.mock("../ui/section", () => ({
  AppText: "AppText",
}));
import { EventCarousel } from "./event-carousel";

function layoutCarousel(r: ReturnType<typeof create>) {
  const host = r.root.findAll(
    (node) => typeof node.props.onLayout === "function",
  )[0]!;
  act(() => {
    host.props.onLayout({ nativeEvent: { layout: { width: 400, height: 120 } } });
  });
}

it("switches events from tabs", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const change = vi.fn(),
    register = vi.fn();
  let r: ReturnType<typeof create>;
  await act(async () => {
    r = create(
      createElement(EventCarousel, {
        events: [
          { id: "running", label: "Running" },
          { id: "cycling", label: "Cycling" },
        ],
        value: "running",
        onChange: change,
        onRegister: register,
        children: null,
      }),
    );
  });
  layoutCarousel(r!);
  const presses = r!.root.findAllByType("Pressable" as never);
  const cyclingTab = presses.find((n) => n.props.accessibilityRole === "tab" && n.props.accessibilityState?.selected === false)!;
  await act(async () => { cyclingTab.props.onPress(); });
  expect(change).toHaveBeenCalledWith("cycling");
  await act(async () => r!.unmount());
});
it("switches events when a horizontal page drag ends without momentum", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const change = vi.fn();
  let r: ReturnType<typeof create>;
  await act(async () => {
    r = create(
      createElement(EventCarousel, {
        events: [
          { id: "running", label: "Running" },
          { id: "cycling", label: "Cycling" },
        ],
        value: "running",
        onChange: change,
        onRegister: vi.fn(),
        children: null,
      }),
    );
  });
  layoutCarousel(r!);
  const scroller = r!.root.findByType("ScrollView" as never);
  await act(async () => {
    scroller.props.onScrollEndDrag({
      nativeEvent: { contentOffset: { x: 400, y: 0 } },
    });
  });
  expect(change).toHaveBeenCalledWith("cycling");
  await act(async () => r!.unmount());
});
