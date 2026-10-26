import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { NavigationWarmup } from "./navigation-warmup";

const mock = vi.hoisted(() => ({ path: "/today", account: "alice", ready: true, prefetch: vi.fn() }));
const router = { prefetch: mock.prefetch };
vi.mock("expo-router", () => ({ usePathname: () => mock.path, useRouter: () => router }));
vi.mock("react-native", () => ({ AppState: { currentState: "active" } }));
vi.mock("./compete-store", () => ({ useCompeteStore: () => ({ state: mock.ready ? {} : null, accountKey: mock.account }) }));
let renderer: ReactTestRenderer;
beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  mock.path = "/today"; mock.account = "alice"; mock.ready = true; mock.prefetch.mockClear();
});
afterEach(async () => {
  if (renderer) await act(async () => renderer.unmount());
  vi.useRealTimers(); vi.unstubAllGlobals();
});

it("lets the parent render first, cancels abandoned warmups, and warms the active page's children", async () => {
  await act(async () => { renderer = create(createElement(NavigationWarmup)); });
  await act(async () => { await vi.advanceTimersByTimeAsync(300); });
  expect(mock.prefetch).not.toHaveBeenCalled();
  mock.path = "/arena";
  await act(async () => renderer.update(createElement(NavigationWarmup)));
  await act(async () => { await vi.advanceTimersByTimeAsync(600); });
  expect(mock.prefetch.mock.calls).toEqual([["/benchmarks"]]);
  mock.path = "/you";
  await act(async () => renderer.update(createElement(NavigationWarmup)));
  await act(async () => { await vi.advanceTimersByTimeAsync(900); });
  expect(mock.prefetch.mock.calls.slice(1)).toEqual([["/progress-history"], ["/progress-achievements"]]);
});

it("waits for account data and avoids repeated pre-renders within the same account", async () => {
  mock.ready = false;
  await act(async () => { renderer = create(createElement(NavigationWarmup)); });
  await act(async () => { await vi.advanceTimersByTimeAsync(1000); });
  expect(mock.prefetch).not.toHaveBeenCalled();
  mock.ready = true;
  await act(async () => renderer.update(createElement(NavigationWarmup)));
  await act(async () => { await vi.advanceTimersByTimeAsync(600); });
  mock.path = "/week";
  await act(async () => renderer.update(createElement(NavigationWarmup)));
  mock.path = "/today";
  await act(async () => renderer.update(createElement(NavigationWarmup)));
  await act(async () => { await vi.advanceTimersByTimeAsync(600); });
  expect(mock.prefetch).toHaveBeenCalledTimes(1);
  mock.account = "bob";
  await act(async () => renderer.update(createElement(NavigationWarmup)));
  await act(async () => { await vi.advanceTimersByTimeAsync(600); });
  expect(mock.prefetch).toHaveBeenCalledTimes(2);
});
