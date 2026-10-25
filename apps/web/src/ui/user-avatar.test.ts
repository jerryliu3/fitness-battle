import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, expect, it, vi } from "vitest";
import { UserAvatar } from "./user-avatar";
let view: ReactTestRenderer;
afterEach(async () => { if (view) await act(async () => view.unmount()); vi.unstubAllGlobals(); });
it("prefers the actual photo, falls back on failure, and tries a changed URL", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  await act(async () => { view = create(createElement(UserAvatar, { name: "Alex Park", src: "https://example.test/a.jpg" })); });
  expect(view.root.findByType("img").props.src).toBe("https://example.test/a.jpg");
  expect(JSON.stringify(view.toJSON())).not.toContain('"AP"');
  await act(async () => { view.root.findByType("img").props.onError(); });
  expect(view.root.findAllByType("img")).toHaveLength(0); expect(JSON.stringify(view.toJSON())).toContain("AP");
  await act(async () => { view.update(createElement(UserAvatar, { name: "Alex Park", src: "https://example.test/b.jpg" })); });
  expect(view.root.findByType("img").props.src).toBe("https://example.test/b.jpg");
  await act(async () => { view.update(createElement(UserAvatar, { name: "Alex Park", src: null })); });
  expect(view.root.findAllByType("img")).toHaveLength(0);
});
