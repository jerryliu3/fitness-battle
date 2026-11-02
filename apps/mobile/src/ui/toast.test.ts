import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
const platform = vi.hoisted(() => ({ OS: "ios", insets: { top: 59, left: 0, right: 0, bottom: 34 } }));
vi.mock("react-native", () => ({ Platform: platform, View: "View", Pressable: "Pressable", PanResponder: { create: (handlers: object) => ({ panHandlers: handlers }) } }));
vi.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => platform.insets }));
vi.mock("./section", () => ({ AppText: "AppText" }));
import { Toast, ToastProvider } from "./toast";
let renderer: ReactTestRenderer;
const retry = vi.fn(), dismissed = vi.fn();
function notice(message: string, busy = false, conflict = false) {
  return createElement(ToastProvider, null,
    createElement("Page"),
    createElement(Toast, { message, onDismiss: dismissed, durationMs: conflict ? null : 8000, priority: 20,
      action: { label: busy ? "Saving…" : conflict ? "Reload account" : "Retry save", onPress: retry, disabled: busy } }),
  );
}
beforeEach(() => { vi.useFakeTimers(); vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true); retry.mockClear(); dismissed.mockClear(); platform.OS = "ios"; platform.insets = { top: 59, left: 0, right: 0, bottom: 34 }; });
afterEach(async () => { if (renderer) await act(async () => renderer.unmount()); vi.useRealTimers(); vi.unstubAllGlobals(); });
it("floats account feedback above iOS navigation and sheets, inside safe areas, without blocking the page", async () => {
  await act(async () => { renderer = create(notice("Your account changed elsewhere.", false, true)); });
  expect(renderer.root.findAllByType("FullWindowOverlay" as never)).toHaveLength(1);
  const inset = renderer.root.findByProps({ pointerEvents: "box-none" });
  expect(inset.props.style.paddingTop).toBe(59);
  expect(inset.props.style.paddingLeft).toBe(16);
  platform.insets = { top: 0, left: 44, right: 0, bottom: 21 };
  await act(async () => renderer.update(notice("Your account changed elsewhere.", false, true)));
  expect(renderer.root.findByProps({ pointerEvents: "box-none" }).props.style.paddingLeft).toBe(60);
  expect(inset.props.pointerEvents).toBe("box-none");
  expect(inset.props.style.position).toBe("absolute");
  expect(renderer.root.findAllByType("Page" as never)).toHaveLength(1);
  expect(renderer.root.findAllByType("Modal" as never)).toHaveLength(0);
  await act(async () => { vi.advanceTimersByTime(30000); });
  expect(renderer.root.findAllByType("FullWindowOverlay" as never)).toHaveLength(1);
  const buttons = renderer.root.findAllByType("Pressable" as never);
  await act(async () => buttons[0].props.onPress());
  expect(retry).toHaveBeenCalledOnce();
  await act(async () => buttons[1].props.onPress());
  expect(dismissed).toHaveBeenCalledOnce();
  expect(renderer.root.findAllByType("FullWindowOverlay" as never)).toHaveLength(0);
  await act(async () => renderer.update(notice("Your account changed elsewhere.", false, true)));
  expect(renderer.root.findAllByType("FullWindowOverlay" as never)).toHaveLength(0);
});
it("keeps a retry visible while saving and shows a repeated failure again", async () => {
  await act(async () => { renderer = create(notice("Changes remain on this device.")); });
  await act(async () => { vi.advanceTimersByTime(8000); });
  expect(renderer.root.findAllByProps({ pointerEvents: "box-none" })).toHaveLength(0);
  await act(async () => renderer.update(notice("Changes remain on this device.", true)));
  const button = renderer.root.findAllByType("Pressable" as never)[0];
  expect(button.props.disabled).toBe(true);
  await act(async () => { button.props.onPress(); vi.advanceTimersByTime(30000); });
  expect(retry).not.toHaveBeenCalled();
  expect(renderer.root.findAllByProps({ pointerEvents: "box-none" })).toHaveLength(1);
  await act(async () => renderer.update(notice("Changes remain on this device.")));
  expect(renderer.root.findAllByProps({ pointerEvents: "box-none" })).toHaveLength(1);
  await act(async () => renderer.update(notice("")));
  expect(renderer.root.findAllByProps({ pointerEvents: "box-none" })).toHaveLength(0);
});
it("does not let an ordinary sync toast replace an account conflict", async () => {
  await act(async () => { renderer = create(createElement(ToastProvider, null,
    createElement(Toast, { message: "Account changed", priority: 20, durationMs: null }),
    createElement(ToastProvider, null, createElement(Toast, { message: "Sync completed", priority: 0 })),
  )); });
  const text = renderer.root.findAllByType("AppText" as never).map(node => node.props.children);
  expect(text).toContain("Account changed");
  expect(text).not.toContain("Sync completed");
});
it("retains the five-second lifetime and swipe dismissal for ordinary native feedback", async () => {
  await act(async () => { renderer = create(createElement(ToastProvider, null, createElement(Toast, { message: "Synced", onDismiss: dismissed }))); });
  await act(async () => { vi.advanceTimersByTime(5000); });
  expect(dismissed).toHaveBeenCalledOnce();
  expect(renderer.root.findAllByProps({ pointerEvents: "box-none" })).toHaveLength(0);
  await act(async () => renderer.update(createElement(ToastProvider, null, createElement(Toast, { message: "Another sync", onDismiss: dismissed }))));
  const card = renderer.root.findAllByType("View" as never).find(node => node.props.onPanResponderRelease);
  await act(async () => card!.props.onPanResponderRelease(null, { dy: -50, vy: 0 }));
  expect(dismissed).toHaveBeenCalledTimes(2);
});
