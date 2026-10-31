import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, describe, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({
  finish: null as null | ((result: { finished: boolean }) => void),
  animations: [] as { toValue: number; duration: number }[],
}));
vi.mock("react-native", () => ({
  Animated: {
    add: () => 0,
    Value: class {
      setValue() {}
      stopAnimation() {}
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
  PanResponder: { create: (handlers: unknown) => ({ panHandlers: handlers }) },
  BackHandler: { addEventListener: () => ({ remove() {} }) },
  useWindowDimensions: () => ({ height: 844, width: 390 }),
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
  useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
}));
vi.mock("./icon-button", () => ({ IconButton: "IconButton" }));
vi.mock("./use-reduced-motion", () => ({ useReducedMotion: () => false }));
vi.mock("../lib/haptics", () => ({ playCue: vi.fn() }));
import { FocusSegments, FocusSheet, FocusSidePanel } from "./focus";
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


it("dismisses sheets downward, yields to scrolled content and keeps accessibility dismissal", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const onClose = vi.fn();
  await act(async () => { renderer = create(createElement(FocusSheet, { open: true, title: "Your activity", onClose })); });
  const surface = renderer.root.findByType("SafeAreaView" as never);
  const gesture = { dx: 0, dy: 120, vy: 0.2, numberActiveTouches: 1, y0: 700 };
  const captures = (change = {}) => surface.props.onMoveShouldSetPanResponderCapture({}, { ...gesture, ...change });
  expect(captures()).toBe(true);
  expect(captures({ dx: 130 })).toBe(false);
  expect(captures({ dy: -120 })).toBe(false);
  expect(captures({ numberActiveTouches: 2 })).toBe(false);
  const scroll = renderer.root.findByType("ScrollView" as never);
  await act(async () => scroll.props.onScroll({ nativeEvent: { contentOffset: { y: 80 } } }));
  expect(captures()).toBe(false);
  expect(captures({ y0: 25 })).toBe(true);
  await act(async () => surface.props.onPanResponderRelease({}, gesture));
  expect(onClose).toHaveBeenCalledTimes(1);
  await act(async () => surface.props.onAccessibilityEscape());
  expect(onClose).toHaveBeenCalledTimes(2);
  expect(renderer.root.findAllByType("Pressable" as never).some(node => node.props.accessibilityLabel === "Close dialog")).toBe(false);
});

it("springs a short drag back, but dismisses a deliberate downward flick", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const onClose = vi.fn();
  await act(async () => { renderer = create(createElement(FocusSheet, { open: true, title: "Activity", onClose })); });
  const surface = renderer.root.findByType("SafeAreaView" as never);
  await act(async () => surface.props.onPanResponderRelease({}, { dy: 20, vy: 0.1 }));
  expect(onClose).not.toHaveBeenCalled();
  expect(mock.animations.at(-1)).toMatchObject({ toValue: 0, duration: 180 });
  await act(async () => surface.props.onPanResponderRelease({}, { dy: 30, vy: 1 }));
  expect(onClose).toHaveBeenCalledTimes(1);
});

it("dismisses side panels from their header or leading edge without stealing chart swipes", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const onClose = vi.fn();
  await act(async () => { renderer = create(createElement(FocusSidePanel, { open: true, title: "Preferences", onClose })); });
  const surface = renderer.root.findAllByType("AnimatedView" as never).find(node => node.props.onPanResponderRelease)!;
  const gesture = { dx: 120, dy: 0, vx: .2, numberActiveTouches: 1, x0: 10, y0: 400 };
  expect(surface.props.onMoveShouldSetPanResponderCapture({}, gesture)).toBe(true);
  expect(surface.props.onMoveShouldSetPanResponderCapture({}, { ...gesture, x0: 150 })).toBe(false);
  expect(surface.props.onMoveShouldSetPanResponderCapture({}, { ...gesture, x0: 150, y0: 60 })).toBe(true);
  await act(async () => surface.props.onPanResponderRelease({}, gesture));
  expect(onClose).toHaveBeenCalledTimes(1);
});


it("keeps full-screen map drags inside the map and permits header dismissal", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  await act(async () => { renderer = create(createElement(FocusSheet, { open: true, title: "Your route", onClose: vi.fn(), fullScreen: true })); });
  const surface = renderer.root.findByType("SafeAreaView" as never);
  const gesture = { dx: 0, dy: 120, numberActiveTouches: 1, y0: 400 };
  expect(surface.props.onMoveShouldSetPanResponderCapture({}, gesture)).toBe(false);
  expect(surface.props.onMoveShouldSetPanResponderCapture({}, { ...gesture, y0: 60 })).toBe(true);
});
