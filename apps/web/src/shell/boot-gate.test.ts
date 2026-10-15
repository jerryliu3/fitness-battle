import { describe, expect, it } from "vitest";
import { isCompeteDataReady, shouldShowBootSplash } from "./boot-gate";

describe("boot splash gating", () => {
  it("treats the initial loading empty state as not ready", () => {
    expect(isCompeteDataReady("loading", null)).toBe(false);
  });

  it("is ready for local, ready, failed, or any status that already has state", () => {
    expect(isCompeteDataReady("local", {})).toBe(true);
    expect(isCompeteDataReady("ready", {})).toBe(true);
    expect(isCompeteDataReady("failed", {})).toBe(true);
    expect(isCompeteDataReady("loading", {})).toBe(true);
    expect(isCompeteDataReady("failed", null)).toBe(true);
  });

  it("holds the splash until animation finishes even when data is ready", () => {
    expect(shouldShowBootSplash(true, false)).toBe(true);
    expect(shouldShowBootSplash(false, true)).toBe(true);
    expect(shouldShowBootSplash(false, false)).toBe(true);
    expect(shouldShowBootSplash(true, true)).toBe(false);
  });
});
