import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { freshState } from "@fitness-battle/shared";
import { useDailySuggestion } from "./use-daily-suggestion";
const values = vi.hoisted(() => new Map<string, string>());
vi.mock("react-native", () => ({ AppState: { addEventListener: () => ({ remove() {} }) } }));
vi.mock("@react-native-async-storage/async-storage", () => ({ default: {
  getItem: async (key: string) => values.get(key) ?? null,
  setItem: async (key: string, value: string) => { values.set(key, value); },
} }));
let api: ReturnType<typeof useDailySuggestion>, renderer: ReactTestRenderer;
function Probe({ account = "alice" }) { api = useDailySuggestion(account, freshState()); return null; }
beforeEach(() => { values.clear(); vi.useFakeTimers(); vi.setSystemTime(new Date("2026-10-27T23:00:00-04:00")); vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true); });
afterEach(async () => { if (renderer) await act(async () => renderer.unmount()); vi.useRealTimers(); vi.unstubAllGlobals(); });
it("keeps daily dismissal across remount and isolates accounts", async () => {
  await act(async () => { renderer = create(createElement(Probe)); });
  expect(api.visible).toBe(true);
  await act(async () => api.dismiss());
  expect(api.visible).toBe(false);
  await act(async () => renderer.unmount());
  await act(async () => { renderer = create(createElement(Probe)); });
  expect(api.visible).toBe(false);
  await act(async () => renderer.update(createElement(Probe, { account: "bob" })));
  expect(api.visible).toBe(true);
});
it("offers the prompt again after Eastern midnight", async () => {
  await act(async () => { renderer = create(createElement(Probe)); });
  await act(async () => api.dismiss());
  vi.setSystemTime(new Date("2026-10-28T00:01:00-04:00"));
  await act(async () => { await vi.advanceTimersByTimeAsync(60_000); });
  expect(api.visible).toBe(true);
});
