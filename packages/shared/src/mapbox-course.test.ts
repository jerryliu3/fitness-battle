import { afterEach, expect, it, vi } from "vitest";
import { parseCourseWaypoint, requestMapboxCourse } from "./mapbox-course";
afterEach(() => vi.unstubAllGlobals());
it("validates explicit coordinates without treating an empty component as zero", () => {
  expect(parseCourseWaypoint("-73.9,40.7")).toEqual([-73.9, 40.7]);
  for (const input of [",", "180,91", "1,NaN", "1", "Paris"]) expect(parseCourseWaypoint(input)).toBeNull();
});
it("requests real route geometry without activity writes", async () => {
  const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ code: "Ok", routes: [{ geometry: { coordinates: [[0, 0], [.01, 0]] } }] }) });
  vi.stubGlobal("fetch", fetcher);
  const course = await requestMapboxCourse("0,0", ".01,0", "walking", "public");
  expect(course.length).toBeGreaterThan(1000);
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(fetcher.mock.calls[0][0]).toContain("exclude=ferry");
  expect(fetcher.mock.calls[0][0]).toContain("mapbox/walking/0,0;0.01,0");
});
it("handles failed geocoding and no-route responses explicitly", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ features: [] }) }));
  await expect(requestMapboxCourse("Unknown city", "0,0", "walking", "public")).rejects.toThrow("No location");
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ code: "NoRoute", routes: [] }) }));
  await expect(requestMapboxCourse("0,0", ".01,0", "walking", "public")).rejects.toThrow("No continuous route");
});
