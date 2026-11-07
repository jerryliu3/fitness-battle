import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { expect, it, vi } from "vitest";
import { DEMO_RACE_COURSE } from "@fitness-battle/shared";

vi.mock("next/dynamic", () => ({ default: () => "CourseMap" }));
vi.mock("@/lib/env", () => ({ webEnv: { mapboxAccessToken: "test" } }));
vi.mock("@/shell/boot-readiness", () => ({ useBootLoading: vi.fn() }));
import { GeographicCourse } from "./geographic-course";
import { useBootLoading } from "@/shell/boot-readiness";

it("holds launch until prepared and keeps timeout failure stable against late callbacks", async () => {
  vi.useFakeTimers();
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const onReady = vi.fn();
  const props = { course: DEMO_RACE_COURSE, lanes: [], unit: "km", selectedId: "you", focusRequest: 0, onSelect() {}, onReady };
  let renderer!: ReactTestRenderer;
  await act(async () => { renderer = create(createElement(GeographicCourse, props)); });
  try {
    const lateReady = renderer.root.findByType("CourseMap" as never).props.onReady;
    expect(useBootLoading).toHaveBeenLastCalledWith(true);
    await act(async () => { vi.advanceTimersByTime(12000); });
    expect(useBootLoading).toHaveBeenLastCalledWith(false);
    expect(renderer.root.findAllByType("CourseMap" as never)).toHaveLength(0);
    await act(async () => lateReady());
    expect(onReady).not.toHaveBeenCalled();
    expect(renderer.root.findAllByType("CourseMap" as never)).toHaveLength(0);
    await act(async () => renderer.root.findByType("button").props.onClick());
    expect(useBootLoading).toHaveBeenLastCalledWith(true);
    await act(async () => renderer.root.findByType("CourseMap" as never).props.onReady());
    expect(onReady).toHaveBeenCalledOnce();
    expect(useBootLoading).toHaveBeenLastCalledWith(false);
  } finally {
    await act(async () => renderer.unmount());
    vi.useRealTimers();
    vi.unstubAllGlobals();
  }
});
