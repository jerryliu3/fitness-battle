import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, expect, it, vi } from "vitest";
import { weeklyRaceCourse } from "@fitness-battle/shared";
const auth = vi.hoisted(() => ({ user: { id: "athlete", mode: "supabase" }, offlineMode: false }));
vi.mock("@/components/auth-context", () => ({ useAuth: () => auth }));
import { useCompetitionCourse } from "./use-competition-course";
const start = "2026-10-26T04:00:00Z", end = "2026-11-02T05:00:00Z";
function Probe() { const result = useCompetitionCourse("running", start, end); return createElement("Probe", result); }
let renderer: ReactTestRenderer;
afterEach(async () => { if (renderer) await act(async () => renderer.unmount()); vi.unstubAllGlobals(); auth.user.mode = "supabase"; });
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
  expect(renderer.root.findByType("Probe" as never).props.course).toBe(weeklyRaceCourse(new Date(start)));
  expect(fetcher).not.toHaveBeenCalled();
});
