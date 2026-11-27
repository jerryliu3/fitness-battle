import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { expect, it, vi } from "vitest";
import { useRefreshEducation } from "./use-refresh-education";

const mock = vi.hoisted(() => ({ counts: new Map<string, string>(), active: true }));
vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: async (key: string) => mock.counts.get(key) ?? null,
    setItem: async (key: string, value: string) => { mock.counts.set(key, value); },
  },
}));
vi.mock("./use-scene-active", () => ({ useSceneActive: () => mock.active }));

it("waits for a confirmed update and remembers three pulls separately by account and tab", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal("__DEV__", false);
  vi.useFakeTimers();
  let renderer: ReactTestRenderer | undefined;
  let education!: ReturnType<typeof useRefreshEducation>;
  function Screen({ screen, account, updates }: { screen: "home" | "compete"; account: string; updates: boolean }) {
    education = useRefreshEducation(screen, account, updates);
    return null;
  }
  try {
    await act(async () => {
      renderer = create(createElement(Screen, { screen: "home", account: "athlete", updates: false }));
    });
    await act(async () => { vi.advanceTimersByTime(8000); });
    expect(education.visible).toBe(false);
    await act(async () => renderer!.update(createElement(Screen, { screen: "home", account: "athlete", updates: true })));
    expect(education.visible).toBe(true);

    await act(async () => {
      education.recordPull();
      education.recordPull();
      education.recordPull();
    });
    expect(education.visible).toBe(false);
    expect(mock.counts.get("overtaek:pull-refresh:athlete:home")).toBe("3");

    await act(async () => renderer!.update(createElement(Screen, { screen: "compete", account: "athlete", updates: true })));
    await act(async () => { vi.advanceTimersByTime(7999); });
    expect(education.visible).toBe(false);
    await act(async () => { vi.advanceTimersByTime(1); });
    expect(education.visible).toBe(true);

    await act(async () => renderer!.update(createElement(Screen, { screen: "home", account: "athlete", updates: true })));
    await act(async () => { vi.advanceTimersByTime(8000); });
    expect(education.visible).toBe(false);
    await act(async () => renderer!.update(createElement(Screen, { screen: "home", account: "other", updates: true })));
    await act(async () => { vi.advanceTimersByTime(8000); });
    expect(education.visible).toBe(true);
  } finally {
    if (renderer) await act(async () => renderer!.unmount());
    vi.useRealTimers();
    vi.unstubAllGlobals();
  }
});

it("restarts the dev timer on each visit without pending data or a pull limit", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal("__DEV__", true);
  vi.useFakeTimers();
  const key = "overtaek:pull-refresh:developer:home";
  mock.counts.set(key, "3");
  let renderer: ReactTestRenderer | undefined;
  let education!: ReturnType<typeof useRefreshEducation>;
  function Screen() {
    education = useRefreshEducation("home", "developer", false);
    return null;
  }
  try {
    await act(async () => { renderer = create(createElement(Screen)); });
    await act(async () => { vi.advanceTimersByTime(7999); });
    expect(education.visible).toBe(false);
    await act(async () => { vi.advanceTimersByTime(1); });
    expect(education.visible).toBe(true);
    await act(async () => {
      for (let i = 0; i < 4; i++) education.recordPull();
    });
    expect(education.visible).toBe(true);
    expect(mock.counts.get(key)).toBe("3");

    mock.active = false;
    await act(async () => renderer!.update(createElement(Screen)));
    expect(education.visible).toBe(false);
    mock.active = true;
    await act(async () => renderer!.update(createElement(Screen)));
    expect(education.visible).toBe(false);
    await act(async () => { vi.advanceTimersByTime(8000); });
    expect(education.visible).toBe(true);
  } finally {
    mock.active = true;
    if (renderer) await act(async () => renderer!.unmount());
    vi.useRealTimers();
    vi.unstubAllGlobals();
  }
});
