import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { expect, it, vi } from "vitest";
const keyboard = vi.hoisted(() => ({ listeners: {} as Record<string, (event: unknown) => void>, visible: false, bottom: 600 }));
vi.mock("react-native", () => ({
  View: "View",
  Keyboard: {
    metrics: () => keyboard.visible ? { screenY: 350 } : undefined,
    isVisible: () => keyboard.visible,
    addListener: (name: string, listener: (event: unknown) => void) => {
      keyboard.listeners[name] = listener;
      return { remove: () => delete keyboard.listeners[name] };
    },
  },
  TextInput: { State: { currentlyFocusedInput: () => ({ measureInWindow: (callback: (...args: number[]) => void) => callback(0, keyboard.bottom - 46, 200, 46) }) } },
}));
import { Keyboard, TextInput } from "react-native";
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
