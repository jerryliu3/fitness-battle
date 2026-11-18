import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { expect, it, vi } from "vitest";
const keyboard = vi.hoisted(() => ({ listeners: {} as Record<string, (event: unknown) => void>, visible: false, bottom: 600, scrollToField: vi.fn() }));
vi.mock("react-native", async () => {
  const { createElement, forwardRef, useImperativeHandle } = await import("react");
  const input = { measureInWindow: (callback: (...args: number[]) => void) => callback(0, keyboard.bottom - 46, 200, 46) };
  return ({
  View: "View", ScrollView: forwardRef((props: object, ref) => {
    useImperativeHandle(ref, () => ({ scrollResponderScrollNativeHandleToKeyboard: keyboard.scrollToField }));
    return createElement("ScrollView", props);
  }), Platform: { OS: "web" },
  Keyboard: {
    metrics: () => keyboard.visible ? { screenY: 350 } : undefined,
    isVisible: () => keyboard.visible,
    addListener: (name: string, listener: (event: unknown) => void) => {
      keyboard.listeners[name] = listener;
      return { remove: () => delete keyboard.listeners[name] };
    },
  },
  TextInput: { State: { currentlyFocusedInput: () => input } },
}); });
import { Keyboard, Platform, TextInput } from "react-native";
import { OnboardingCanvas } from "./onboarding-canvas";
it("keeps the composition size while revealing a field above the keyboard", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  let renderer!: ReactTestRenderer;
  await act(async () => { renderer = create(createElement(OnboardingCanvas, { height: 640, children: null })); });
  const views = () => renderer.root.findAllByType("View" as never);
  const layout = (height: number) => views()[0].props.onLayout({ nativeEvent: { layout: { width: 360, height } } });
  await act(async () => layout(640));
  const original = views()[1].props.style;
  keyboard.visible = true;
  await act(async () => {
    layout(350);
    keyboard.listeners.keyboardDidShow({ endCoordinates: { screenY: 350 } });
  });
  expect(views()[1].props.style.transform).toEqual(original.transform);
  expect(views()[1].props.style.top).toBe(-262);
  vi.stubGlobal("requestAnimationFrame", (callback: () => void) => callback());
  keyboard.bottom = 400;
  await act(async () => views()[0].props.onTouchEnd());
  expect(views()[1].props.style.top).toBe(-324);
  expect(views()[1].props.style.transform).toEqual(original.transform);
  keyboard.visible = false;
  await act(async () => keyboard.listeners.keyboardDidHide({}));
  expect(views()[1].props.style.top).toBe(original.top);
  await act(async () => renderer.unmount());
});

it("renders in Expo web where native keyboard measurement APIs are unavailable", async () => {
  const keyboardApi = Keyboard;
  const inputApi = TextInput.State;
  const metrics = keyboardApi.metrics, focused = inputApi.currentlyFocusedInput;
  Reflect.set(keyboardApi, "metrics", undefined); Reflect.set(inputApi, "currentlyFocusedInput", undefined);
  let renderer!: ReactTestRenderer;
  try {
    await act(async () => { renderer = create(createElement(OnboardingCanvas, { height: 640, children: null })); });
    const canvas = renderer.root.findAllByType("View" as never)[0];
    await act(async () => canvas.props.onLayout({ nativeEvent: { layout: { width: 360, height: 640 } } }));
    await act(async () => canvas.props.onTouchEnd());
    expect(renderer.root.findAllByType("View" as never)[1].props.style.opacity).toBe(1);
    await act(async () => renderer.unmount());
  } finally { Reflect.set(keyboardApi, "metrics", metrics); Reflect.set(inputApi, "currentlyFocusedInput", focused); }
});


it("lays native content out without scaling and scrolls short viewports", async () => {
  Reflect.set(Platform, "OS", "ios");
  let renderer!: ReactTestRenderer;
  try {
    await act(async () => { renderer = create(createElement(OnboardingCanvas, { height: 640, children: null })); });
    const views = () => renderer.root.findAllByType("View" as never);
    for (const [width, height] of [[430, 800], [375, 500]]) {
      await act(async () => views()[0].props.onLayout({ nativeEvent: { layout: { width, height } } }));
      expect(views()[1].props.style).toMatchObject({ width: 360, height: 640 });
      expect(views()[1].props.style.transform).toBeUndefined();
      expect(renderer.root.findByType("ScrollView" as never).props.contentContainerStyle.flexGrow).toBe(1);
    }
  } finally {
    if (renderer) await act(async () => renderer.unmount());
    Reflect.set(Platform, "OS", "web");
  }
});


it("fits native component dimensions to the viewport without a screen transform", async () => {
  Reflect.set(Platform, "OS", "ios");
  let renderer!: ReactTestRenderer;
  const render = vi.fn((scale: number) => createElement("card", { width: 280 * scale }));
  try {
    await act(async () => { renderer = create(createElement(OnboardingCanvas, { height: 640, children: render })); });
    const views = () => renderer.root.findAllByType("View" as never);
    for (const [width, height, scale] of [[375, 500, 44 / 52], [320, 700, 320 / 360]]) {
      await act(async () => views()[0].props.onLayout({ nativeEvent: { layout: { width, height } } }));
      expect(views()[1].props.style.width).toBeCloseTo(360 * scale);
      expect(views()[1].props.style.height).toBeCloseTo(640 * scale);
      expect(views()[1].props.style.transform).toBeUndefined();
      expect(renderer.root.findByType("card" as never).props.width).toBeCloseTo(280 * scale);
    }
  } finally {
    if (renderer) await act(async () => renderer.unmount());
    Reflect.set(Platform, "OS", "web");
  }
});


it("keeps native scrolling available with the keyboard without snapping after each drag", async () => {
  Reflect.set(Platform, "OS", "ios");
  vi.stubGlobal("requestAnimationFrame", (callback: () => void) => callback());
  keyboard.scrollToField.mockClear();
  let renderer!: ReactTestRenderer;
  try {
    await act(async () => { renderer = create(createElement(OnboardingCanvas, { height: 640, children: null })); });
    const views = () => renderer.root.findAllByType("View" as never);
    await act(async () => views()[0].props.onLayout({ nativeEvent: { layout: { width: 375, height: 650 } } }));
    const scroll = renderer.root.findByType("ScrollView" as never);
    expect(scroll.props).toMatchObject({ automaticallyAdjustKeyboardInsets: true, keyboardDismissMode: "none", keyboardShouldPersistTaps: "handled" });
    keyboard.visible = true;
    await act(async () => keyboard.listeners.keyboardDidShow({ endCoordinates: { screenY: 350 } }));
    expect(keyboard.scrollToField).toHaveBeenCalledWith(TextInput.State.currentlyFocusedInput(), 12, true);
    expect(views()[1].props.style.top).toBeUndefined();
    await act(async () => views()[0].props.onTouchEnd());
    await act(async () => views()[0].props.onTouchEnd());
    expect(keyboard.scrollToField).toHaveBeenCalledOnce();
  } finally {
    keyboard.visible = false;
    if (renderer) await act(async () => renderer.unmount());
    Reflect.set(Platform, "OS", "web");
  }
});
