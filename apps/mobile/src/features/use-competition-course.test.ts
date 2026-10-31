import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock("../lib/auth", () => ({ useAuth: () => ({ user: { id: "athlete", mode: "supabase" }, accessToken: "token", offlineMode: false }) }));
vi.mock("../lib/env", () => ({ mobileEnv: { apiUrl: "https://api.example.test" } }));
vi.mock("../lib/api", () => ({ requestApi: mock.request }));
import { useCompetitionCourse, clearCourseCache } from "./use-competition-course";
const start = "2026-10-26T04:00:00Z", end = "2026-11-02T05:00:00Z";
function Probe({ from = start, to = end }: { from?: string; to?: string }) { const result = useCompetitionCourse("running", from, to); return createElement("Probe", result); }
let renderer: ReactTestRenderer;
afterEach(async () => { if (renderer) await act(async () => renderer.unmount()); vi.unstubAllGlobals(); mock.request.mockReset(); clearCourseCache(); });
it("reads the assigned route with the native bearer request and fails closed", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  mock.request.mockResolvedValueOnce({ name: "Server course", coordinates: [[0, 0], [.02, 0]], periodStart: start, periodEnd: end }).mockRejectedValueOnce(new Error("offline"));
  await act(async () => { renderer = create(createElement(Probe)); });
  expect(renderer.root.findByType("Probe" as never).props.course.name).toBe("Server course");
  expect(mock.request.mock.calls[0]).toEqual(["https://api.example.test", "token", expect.stringContaining("/api/compete/course?")]);
  await act(async () => renderer.root.findByType("Probe" as never).props.retry());
  expect(renderer.root.findByType("Probe" as never).props.course).toBeNull();
  expect(renderer.root.findByType("Probe" as never).props.error).toContain("unavailable");
});
it("ignores a late response after the competition changes", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  let finishOld!: (value: unknown) => void;
  const nextEnd = "2026-11-09T05:00:00Z";
  mock.request.mockImplementationOnce(() => new Promise(resolve => { finishOld = resolve; }))
    .mockResolvedValueOnce({ name: "Next course", coordinates: [[0, 0], [.02, 0]], periodStart: end, periodEnd: nextEnd });
  await act(async () => { renderer = create(createElement(Probe)); });
  await act(async () => renderer.update(createElement(Probe, { from: end, to: nextEnd })));
  await act(async () => finishOld({ name: "Old course", coordinates: [[0, 0], [.02, 0]], periodStart: start, periodEnd: end }));
  expect(renderer.root.findByType("Probe" as never).props.course.name).toBe("Next course");
});
