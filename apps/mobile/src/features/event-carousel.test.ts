import { createElement } from "react";
import { act, create } from "react-test-renderer";
import { expect, it, vi } from "vitest";
vi.mock("react-native", () => ({
  View: "View",
  Text: "Text",
  Pressable: "Pressable",
  ScrollView: "ScrollView",
  StyleSheet: { create: (x: unknown) => x },
}));
vi.mock("../ui/focus", () => ({
  FocusSheet: "Sheet",
  FocusButton: "Button",
  f: {},
}));
vi.mock("../ui/use-reduced-motion", () => ({ useReducedMotion: () => true }));
import { EventCarousel } from "./event-carousel";
it("switches events with header swipes while keeping tap and accessibility chooser", async () => {
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
  const header = () =>
    r!.root
      .findAllByType("View" as never)
      .find((n) => n.props.onResponderRelease)!;
  const gesture = async (x: number, y = 0) =>
    act(async () => {
      header().props.onResponderGrant({
        nativeEvent: { pageX: 100, pageY: 100 },
      });
      header().props.onResponderRelease({
        nativeEvent: { pageX: 100 + x, pageY: 100 + y },
      });
    });
  await gesture(-80);
  expect(change).toHaveBeenCalledWith("cycling");
  expect(r!.root.findByType("Sheet" as never).props.open).toBe(false);
  change.mockClear();
  await gesture(80);
  expect(change).not.toHaveBeenCalled();
  await gesture(5, 80);
  expect(change).not.toHaveBeenCalled();
  await gesture(0);
  expect(r!.root.findByType("Sheet" as never).props.open).toBe(true);
  await act(async () => r!.root.findByType("Button" as never).props.onPress());
  expect(register).not.toHaveBeenCalled();
  await act(async () => r!.root.findByType("Sheet" as never).props.onClosed());
  expect(register).toHaveBeenCalledTimes(1);
  await act(async () => r!.root.findByType("Sheet" as never).props.onClosed());
  expect(register).toHaveBeenCalledTimes(1);
  await act(async () => r!.unmount());
});
