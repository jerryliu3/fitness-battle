vi.mock("@/features/course/use-competition-course", () => ({ useCompetitionCourse: () => ({ course: null, error: "", retry: vi.fn() }) }));
vi.mock("@/components/compete-context", () => ({ useCompete: () => ({ state: null }) }));
vi.mock("@/features/course/geographic-course", () => ({ GeographicCourse: "GeographicCourse" }));
import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { expect, it, vi } from "vitest";
import { defaultFieldAppearance, applyDebugEvent, competitionMoments, freshState, momentStorageKey } from "@fitness-battle/shared";
const preferences = vi.hoisted(() => ({ reduced: true }));
vi.mock("motion/react", () => ({ useReducedMotion: () => preferences.reduced }));
vi.mock("@/lib/haptics", () => ({ playCue: vi.fn() }));
vi.mock("@/components/auth-context", () => ({ useAuth: () => ({ user: { id: "a" } }) }));
vi.mock("@/features/field/components/field-course", () => ({ useFieldAppearance: () => [defaultFieldAppearance] }));
vi.mock("@/features/focus/arena-lanes", () => ({ ArenaLanes: "ArenaLanes" }));
import { CompetitionMoment } from "./competition-moment";
it("reduced motion shows the final result in either direction and confirms at most once", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  for (const direction of ["overtake", "overtaken"] as const) {
    const result = applyDebugEvent(freshState(new Date("2026-10-24T18:00:00Z")), direction, "a");
    const baselines = Object.fromEntries(Object.entries(result.baselines).map(([k,v]) => [momentStorageKey(k),v]));
    const moment = competitionMoments(result.state, "a", k => baselines[k])[0];
    const done = vi.fn(); let renderer!: ReactTestRenderer;
    await act(async () => { renderer = create(createElement(CompetitionMoment, { moment, dimension: "2d", remaining: 1, onConfirm: done })); });
    const button = renderer.root.findByType("button");
    expect(button.props.children).toBe("Back to the app →");
    const field = renderer.root.findByType("ArenaLanes" as never);
    expect(field.props.immersive).toBe(true);
    expect(field.props.lanes).toHaveLength(moment.lanes.length);
    expect(field.props.lanes.find((lane: { you?: boolean }) => lane.you).value).toBe(moment.plan.youAfter);
    expect(field.props.appearance).toEqual(defaultFieldAppearance);
    await act(async () => { button.props.onClick(); button.props.onClick(); });
    expect(done).toHaveBeenCalledTimes(1);
    await act(async () => renderer.unmount());
  }
});

it("skipping playback shows final totals and waits for explicit confirmation", async () => {
  preferences.reduced = false;
  vi.stubGlobal("requestAnimationFrame", vi.fn(() => 1));
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
  const result = applyDebugEvent(freshState(new Date("2026-10-24T18:00:00Z")), "overtake", "a");
  const baselines = Object.fromEntries(Object.entries(result.baselines).map(([key, value]) => [momentStorageKey(key), value]));
  const moment = competitionMoments(result.state, "a", key => baselines[key])[0];
  const done = vi.fn();
  let renderer!: ReactTestRenderer;
  try {
    await act(async () => { renderer = create(createElement(CompetitionMoment, { moment, dimension: "2d", remaining: 2, onConfirm: done })); });
    const button = renderer.root.findByType("button");
    const field = () => renderer.root.findByType("ArenaLanes" as never);
    expect(field().props.lanes.find((lane: { you?: boolean }) => lane.you).value).toBe(moment.plan.youBefore);
    expect(button.props.children).toBe("See my move →");
    await act(async () => button.props.onClick());
    expect(button.props.children).toBe("Skip animation");
    await act(async () => button.props.onClick());
    expect(field().props.lanes.find((lane: { you?: boolean }) => lane.you).value).toBe(moment.plan.youAfter);
    expect(button.props.children).toBe("Continue →");
    expect(done).not.toHaveBeenCalled();
    await act(async () => { button.props.onClick(); button.props.onClick(); });
    expect(done).toHaveBeenCalledTimes(1);
  } finally {
    if (renderer) await act(async () => renderer.unmount());
    preferences.reduced = true;
    vi.unstubAllGlobals();
  }
});
