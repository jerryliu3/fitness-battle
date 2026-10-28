import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, expect, it, vi } from "vitest";
import { DEMO_RACE_COURSE } from "@fitness-battle/shared";
const auth = vi.hoisted(() => ({ user: { id: "athlete", mode: "supabase" }, offlineMode: false }));
vi.mock("@/components/auth-context", () => ({ useAuth: () => auth }));
import { useCompetitionCourse } from "./use-competition-course";
const start = "2026-10-26T04:00:00Z", end = "2026-11-02T05:00:00Z";
function Probe({ enabled = true, from = start, to = end }: { enabled?: boolean; from?: string; to?: string }) { const result = useCompetitionCourse("running", from, to, false, enabled); return createElement("Probe", result); }
let renderer: ReactTestRenderer;
afterEach(async () => { if (renderer) await act(async () => renderer.unmount()); vi.useRealTimers(); vi.unstubAllGlobals(); auth.user.mode = "supabase"; });
it("uses the database assignment for live athletes and never substitutes a local route on failure", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const fetcher = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ name: "Server course", coordinates: [[0, 0], [.02, 0]], periodStart: start, periodEnd: end }))).mockRejectedValueOnce(new Error("offline"));
  vi.stubGlobal("fetch", fetcher);
  await act(async () => { renderer = create(createElement(Probe)); });
  expect(renderer.root.findByType("Probe" as never).props.course.name).toBe("Server course");
  await act(async () => renderer.root.findByType("Probe" as never).props.retry());
  expect(renderer.root.findByType("Probe" as never).props.course).toBeNull();
  expect(renderer.root.findByType("Probe" as never).props.error).toContain("unavailable");
  expect(fetcher).toHaveBeenCalledTimes(2);
});
it("uses the bundled preview only for demo accounts", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
  auth.user.mode = "demo";
  await act(async () => { renderer = create(createElement(Probe)); });
  expect(renderer.root.findByType("Probe" as never).props.course).toBe(DEMO_RACE_COURSE);
  expect(fetcher).not.toHaveBeenCalled();
});
it("defers the database read until 4D is selected", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ name: "Assigned", coordinates: [[0, 0], [.02, 0]], periodStart: start, periodEnd: end })));
  vi.stubGlobal("fetch", fetcher);
  await act(async () => { renderer = create(createElement(Probe, { enabled: false })); });
  expect(fetcher).not.toHaveBeenCalled();
  await act(async () => renderer.update(createElement(Probe, { enabled: true })));
  expect(renderer.root.findByType("Probe" as never).props.course.name).toBe("Assigned");
});
it("bounds a stalled read and exposes retry", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true); vi.useFakeTimers();
  const fetcher = vi.fn().mockImplementation(() => new Promise(() => {}));
  vi.stubGlobal("fetch", fetcher);
  await act(async () => { renderer = create(createElement(Probe)); });
  await act(async () => { vi.advanceTimersByTime(15_000); });
  expect(fetcher.mock.calls[0][1].signal.aborted).toBe(true);
  expect(renderer.root.findByType("Probe" as never).props.error).toContain("unavailable");
});
it("ignores a previous competition's late response", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  let finishOld!: (response: Response) => void;
  const nextStart = end, nextEnd = "2026-11-09T05:00:00Z";
  vi.stubGlobal("fetch", vi.fn().mockImplementationOnce(() => new Promise<Response>(resolve => { finishOld = resolve; }))
    .mockResolvedValueOnce(new Response(JSON.stringify({ name: "Next course", coordinates: [[0, 0], [.02, 0]], periodStart: nextStart, periodEnd: nextEnd }))));
  await act(async () => { renderer = create(createElement(Probe)); });
  await act(async () => renderer.update(createElement(Probe, { from: nextStart, to: nextEnd })));
  await act(async () => finishOld(new Response(JSON.stringify({ name: "Old course", coordinates: [[0, 0], [.02, 0]], periodStart: start, periodEnd: end }))));
  expect(renderer.root.findByType("Probe" as never).props.course.name).toBe("Next course");
});
