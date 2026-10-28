import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock("../lib/auth", () => ({ useAuth: () => ({ user: { id: "athlete", mode: "supabase" }, accessToken: "token", offlineMode: false }) }));
vi.mock("../lib/env", () => ({ mobileEnv: { apiUrl: "https://api.example.test" } }));
vi.mock("../lib/api", () => ({ requestApi: mock.request }));
import { useCompetitionCourse } from "./use-competition-course";
const start = "2026-10-26T04:00:00Z", end = "2026-11-02T05:00:00Z";
function Probe() { const result = useCompetitionCourse("running", start, end); return createElement("Probe", result); }
let renderer: ReactTestRenderer;
afterEach(async () => { if (renderer) await act(async () => renderer.unmount()); vi.unstubAllGlobals(); mock.request.mockReset(); });
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
