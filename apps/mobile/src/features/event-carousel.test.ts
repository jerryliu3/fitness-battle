import { createElement } from "react";
import { act, create } from "react-test-renderer";
import { expect, it, vi } from "vitest";
vi.mock("react-native", () => ({
  View: "View",
  Text: "Text",
  Pressable: "Pressable",
  ScrollView: "ScrollView",
  Dimensions: { get: () => ({ width: 400, height: 800 }) },
  StyleSheet: { create: (x: unknown) => x },
}));
vi.mock("../ui/section", () => ({
  AppText: "AppText",
}));
import { EventCarousel } from "./event-carousel";
it("switches events from chips and opens register from the dashed chip", async () => {
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
  const presses = r!.root.findAllByType("Pressable" as never);
  const cyclingChip = presses.find((n) => n.props.accessibilityRole === "tab" && n.props.accessibilityState?.selected === false)!;
  await act(async () => { cyclingChip.props.onPress(); });
  expect(change).toHaveBeenCalledWith("cycling");
  const registerChip = presses.find((n) => n.props.accessibilityLabel === "Register for an event")!;
  await act(async () => { registerChip.props.onPress(); });
  expect(register).toHaveBeenCalledTimes(1);
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
  const scroller = r!.root.findByType("ScrollView" as never);
  await act(async () => {
    scroller.props.onScrollEndDrag({
      nativeEvent: { contentOffset: { x: 400, y: 0 } },
    });
  });
  expect(change).toHaveBeenCalledWith("cycling");
  await act(async () => r!.unmount());
});
