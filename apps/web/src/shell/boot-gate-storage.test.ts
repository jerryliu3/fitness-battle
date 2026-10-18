import { afterEach, describe, expect, it } from "vitest";
import { hasSeenBootSplash, markBootSplashSeen } from "./boot-gate";

describe("boot splash persistence", () => {
  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it("remembers the splash across new sessions via localStorage", () => {
    expect(hasSeenBootSplash()).toBe(false);
    markBootSplashSeen();
    expect(localStorage.getItem("fb-boot-splash-seen")).toBe("1");
    expect(hasSeenBootSplash()).toBe(true);
  });
});
