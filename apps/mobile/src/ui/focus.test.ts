import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, describe, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({
  finish: null as null | ((result: { finished: boolean }) => void),
  animations: [] as { toValue: number; duration: number }[],
}));
vi.mock("react-native", () => ({
  Animated: {
    Value: class {
      interpolate() {
        return 0;
      }
    },
    View: "AnimatedView",
    createAnimatedComponent: (component: unknown) => component,
    timing: (_: unknown, config: { toValue: number; duration: number }) => {
      mock.animations.push(config);
      return ({
      start: (callback: typeof mock.finish) => {
        mock.finish = callback;
      },
      stop() {},
      });
    },
  },
  Easing: {
    in: (value: unknown) => value,
    out: (value: unknown) => value,
    cubic: "cubic",
  },
  useWindowDimensions: () => ({ height: 844 }),
  KeyboardAvoidingView: "KeyboardAvoidingView",
  Modal: "Modal",
  Platform: { OS: "ios" },
  Pressable: "Pressable",
  ScrollView: "ScrollView",
  Text: "Text",
  View: "View",
  StyleSheet: { create: (styles: unknown) => styles, absoluteFill: {} },
}));
vi.mock("react-native-safe-area-context", () => ({
  SafeAreaView: "SafeAreaView",
}));
vi.mock("./icon-button", () => ({ IconButton: "IconButton" }));
vi.mock("./use-reduced-motion", () => ({ useReducedMotion: () => false }));
vi.mock("../lib/haptics", () => ({ playCue: vi.fn() }));
import { FocusSegments, FocusSheet } from "./focus";
let renderer: ReactTestRenderer;
afterEach(async () => {
  if (renderer) await act(async () => renderer.unmount());
  vi.unstubAllGlobals();
});

it("moves a single selection highlight between measured segments", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const onChange = vi.fn();
  const options = [{ value: "week", label: "Week" }, { value: "month", label: "Month" }, { value: "year", label: "Year" }];
  await act(async () => { renderer = create(createElement(FocusSegments, { label: "Range", options, value: "week", onChange })); });
  const group = () => renderer.root.findAllByType("View" as never).find(node => node.props.accessibilityRole === "tablist")!;
  await act(async () => group().props.onLayout({ nativeEvent: { layout: { width: 300 } } }));
  await act(async () => renderer.root.findAllByType("Pressable" as never)[2]!.props.onPress());
  expect(onChange).toHaveBeenCalledExactlyOnceWith("year");
  await act(async () => renderer.update(createElement(FocusSegments, { label: "Range", options, value: "year", onChange })));
  expect(renderer.root.findAllByType("AnimatedView" as never)).toHaveLength(1);
  expect(mock.animations.at(-1)).toMatchObject({ toValue: 196, duration: 240 });
});
describe("native detail sheet", () => {
  it("retains report content through exit when its parent clears the selected panel", async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    const onClose = vi.fn();
    const onClosed = vi.fn();
    await act(async () => {
      renderer = create(
        createElement(
          FocusSheet,
          { open: true, title: "Report an issue", onClose, onClosed },
          "Report form",
        ),
      );
    });
    await act(async () => {
      renderer.update(
        createElement(
          FocusSheet,
          { open: false, title: "Delete account", onClose, onClosed },
          "Type DELETE",
        ),
      );
    });
    expect(JSON.stringify(renderer.toJSON())).toContain("Report form");
    expect(JSON.stringify(renderer.toJSON())).not.toContain("Type DELETE");
    expect(renderer.root.findByType("Modal" as never).props.visible).toBe(true);
    await act(async () => mock.finish?.({ finished: true }));
    expect(renderer.root.findByType("Modal" as never).props.visible).toBe(
      false,
    );
    expect(onClosed).not.toHaveBeenCalled();
    await act(async () => renderer.root.findByType("Modal" as never).props.onDismiss());
    expect(onClosed).toHaveBeenCalledTimes(1);
  });
});
