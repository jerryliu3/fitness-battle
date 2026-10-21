import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, describe, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ finish: null as null | ((result: { finished: boolean }) => void) }));
vi.mock("react-native", () => ({
  Animated: {
    Value: class { interpolate() { return 0; } },
    View: "AnimatedView",
    createAnimatedComponent: (component: unknown) => component,
    timing: () => ({ start: (callback: typeof mock.finish) => { mock.finish = callback; }, stop() {} }),
  },
  Easing: { in: (value: unknown) => value, out: (value: unknown) => value, cubic: "cubic" },
  useWindowDimensions: () => ({ height: 844 }),
  KeyboardAvoidingView: "KeyboardAvoidingView", Modal: "Modal", Platform: { OS: "ios" },
  Pressable: "Pressable", ScrollView: "ScrollView", Text: "Text", View: "View",
  StyleSheet: { create: (styles: unknown) => styles, absoluteFill: {} },
}));
vi.mock("react-native-safe-area-context", () => ({ SafeAreaView: "SafeAreaView" }));
vi.mock("./use-reduced-motion", () => ({ useReducedMotion: () => false }));
vi.mock("../lib/haptics", () => ({ playCue: vi.fn() }));
import { FocusSheet } from "./focus";
let renderer: ReactTestRenderer;
afterEach(async () => { if (renderer) await act(async () => renderer.unmount()); vi.unstubAllGlobals(); });
describe("native detail sheet", () => {
  it("retains report content through exit when its parent clears the selected panel", async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    const onClose = vi.fn();
    await act(async () => { renderer = create(createElement(FocusSheet, { open: true, title: "Report an issue", onClose }, "Report form")); });
    await act(async () => { renderer.update(createElement(FocusSheet, { open: false, title: "Delete account", onClose }, "Type DELETE")); });
    expect(JSON.stringify(renderer.toJSON())).toContain("Report form");
    expect(JSON.stringify(renderer.toJSON())).not.toContain("Type DELETE");
    expect(renderer.root.findByType("Modal" as never).props.visible).toBe(true);
    await act(async () => mock.finish?.({ finished: true }));
    expect(renderer.root.findByType("Modal" as never).props.visible).toBe(false);
  });
});
