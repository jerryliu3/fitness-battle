import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { freshState, type Activity } from "@fitness-battle/shared";

vi.mock("react-native", () => ({ Pressable: "Pressable", View: "View", StyleSheet: { create: (styles: unknown) => styles } }));
vi.mock("../ui/section", () => ({ AppText: "AppText" }));

import { ActivityComparison } from "./activity-comparison";

let renderer: ReactTestRenderer;
beforeEach(() => { vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true); vi.useFakeTimers(); vi.setSystemTime(new Date("2026-10-26T14:00:00Z")); });
afterEach(async () => { if (renderer) await act(async () => renderer.unmount()); vi.useRealTimers(); vi.unstubAllGlobals(); });

it("switches between a session's available comparisons", async () => {
  const make = (id: string, day: number, movingSec: number): Activity => ({ id, sport: "running", startedAt: `2026-10-${day}T12:00:00Z`, movingSec, distanceM: 5000, avgHr: null, verified: true, source: "strava" });
  const current = make("current", 26, 2400);
  const state = { ...freshState(new Date("2026-10-26T14:00:00Z")), units: "metric" as const, activities: [current, make("a", 25, 1800), make("b", 24, 2100), make("c", 23, 2400)] };
  await act(async () => { renderer = create(createElement(ActivityComparison, { activity: current, state })); });
  const buttons = renderer.root.findAllByType("Pressable" as never);
  expect(buttons).toHaveLength(3);
  expect(buttons[0]!.props.accessibilityState.selected).toBe(true);
  await act(async () => buttons[2]!.props.onPress());
  expect(buttons[2]!.props.accessibilityState.selected).toBe(true);
  const chart = renderer.root.findAllByType("View" as never).find(node => node.props.accessible);
  expect(chart?.props.accessibilityLabel).toContain("Pace. This session: 8:00/km. Previous median: 7:00/km.");
});
