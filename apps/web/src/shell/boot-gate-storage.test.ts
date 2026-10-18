import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { hasSeenBootSplash, markBootSplashSeen } from "./boot-gate";

function storageMock() {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => store.clear(),
  };
}

describe("boot splash persistence", () => {
  beforeEach(() => {
    vi.stubGlobal("window", {});
    vi.stubGlobal("localStorage", storageMock());
    vi.stubGlobal("sessionStorage", storageMock());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("remembers the splash across new sessions via localStorage", () => {
    expect(hasSeenBootSplash()).toBe(false);
    markBootSplashSeen();
    expect(localStorage.getItem("fb-boot-splash-seen")).toBe("1");
    expect(hasSeenBootSplash()).toBe(true);
  });
});
