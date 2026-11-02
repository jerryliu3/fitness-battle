import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
vi.mock("react-dom", async original => ({ ...await original<typeof import("react-dom")>(), createPortal: (node: unknown) => node }));
import { AccountSaveToast } from "./account-save-toast";
let renderer: ReactTestRenderer;
const retry = vi.fn();
function notice(message: string | null, conflict = false, saving = false) {
  return createElement(AccountSaveToast, { message, conflict, saving, onRetry: retry });
}
beforeEach(() => { vi.useFakeTimers(); vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true); vi.stubGlobal("document", { body: {} }); retry.mockClear(); });
afterEach(async () => { if (renderer) await act(async () => renderer.unmount()); vi.useRealTimers(); vi.unstubAllGlobals(); });
it("uses one dismissible floating account notice with safe-area offsets and a recovery action", async () => {
  await act(async () => { renderer = create(notice("Generic save failure", true)); });
  const alert = renderer.root.findByProps({ role: "alert" });
  expect(alert.props.style.position).toBe("fixed");
  expect(alert.props.style.top).toContain("env(safe-area-inset-top");
  expect(renderer.root.findAllByProps({ role: "alert" })).toHaveLength(1);
  expect(JSON.stringify(renderer.toJSON())).not.toContain("Generic save failure");
  await act(async () => { vi.advanceTimersByTime(30000); });
  const buttons = renderer.root.findAllByType("button");
  expect(buttons[0].props.children).toBe("Reload account");
  await act(async () => buttons[0].props.onClick());
  expect(retry).toHaveBeenCalledOnce();
  await act(async () => buttons[1].props.onClick());
  expect(renderer.toJSON()).toBeNull();
  await act(async () => renderer.update(notice("Generic save failure", true)));
  expect(renderer.toJSON()).toBeNull();
});
it("keeps active retries visible and reopens after another failure, without clearing the error", async () => {
  await act(async () => { renderer = create(notice("Save failed")); });
  await act(async () => { vi.advanceTimersByTime(8000); });
  expect(renderer.toJSON()).toBeNull();
  await act(async () => renderer.update(notice("Save failed", false, true)));
  expect(renderer.root.findAllByType("button")[0].props.disabled).toBe(true);
  await act(async () => { vi.advanceTimersByTime(30000); });
  expect(renderer.toJSON()).not.toBeNull();
  await act(async () => renderer.update(notice("Save failed")));
  expect(renderer.root.findAllByType("button")[0].props.children).toBe("Retry save");
  await act(async () => renderer.update(notice(null)));
  expect(renderer.toJSON()).toBeNull();
  await act(async () => renderer.update(notice("Save failed")));
  expect(renderer.toJSON()).not.toBeNull();
});

it("moves the notification into the active modal accessibility boundary", async () => {
  const host = {} as Element;
  vi.stubGlobal("document", { body: {}, querySelectorAll: () => [host] });
  await act(async () => { renderer = create(notice("Save failed")); });
  expect(renderer.root.findByProps({ role: "alert" }).props.style.position).toBe("absolute");
});
