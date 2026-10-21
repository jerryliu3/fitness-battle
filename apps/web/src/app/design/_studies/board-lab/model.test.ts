import { describe, expect, it } from "vitest";
import { boardFraction, boardTicks, defaultBoardView, fieldSamples, fieldZoom, fitBoardView, overviewWindow, progressClearance, visibleSessions } from "./model";
import { isBackgroundId, isProgressId, isZoomId } from "./field-directions";
import { boardFixture } from "./fixtures";
import { isTrailMaterialId } from "./trail-materials";

describe("board presentation geometry", () => {
  it("keeps absolute marks while the camera moves", () => {
    const a = { center: 19.2, span: 6 }, b = { center: 20.2, span: 6 };
    expect(boardTicks(a).values).toContain(20);
    expect(boardTicks(b).values).toContain(20);
    expect(boardFraction(20, a) - boardFraction(20, b)).toBeCloseTo(1 / 6);
  });
  it("uses equivalent physical spans for km/mi and real points for effort", () => {
    expect(defaultBoardView(19.2, "km").span).toBeCloseTo(defaultBoardView(19.2 / 1.609344, "mi").span * 1.609344);
    expect(defaultBoardView(64, "pts")).toEqual({ center: 64, span: 20 });
    expect(boardTicks({ center: 0, span: 5000 }).values.length).toBeLessThan(80);
  });
  it("clips an authentic session to replay progress without inventing intervals", () => {
    const data = boardFixture(false, "km"), you = data.lanes.find(l => l.you)!;
    expect(visibleSessions(data.sessions, { ...you, value: 14 }).at(-1)?.end).toBe(14);
    expect(visibleSessions([], you)).toEqual([]);
    expect(visibleSessions(data.sessions, { ...you, value: 0 })).toEqual([]);
  });
  it("fits true outliers, excludes ghosts, and preserves positive zero-origin context", () => {
    const data = boardFixture(false, "km");
    const lanes = [...data.lanes, { id: "outlier", name: "Far", initials: "F", value: 180 }, { id: "old", name: "Past", initials: "P", value: 900, ghost: true }];
    const view = fitBoardView(lanes, "km");
    expect(boardFraction(180, view)).toBeLessThan(1);
    expect(view.span).toBeLessThan(250);
    expect(boardFraction(0, defaultBoardView(0, "km"))).toBeGreaterThanOrEqual(0);
  });
  it("keeps fixture session contributions equal to totals in every unit", () => {
    for (const data of [boardFixture(false, "km"), boardFixture(false, "mi"), boardFixture(true, "km")]) {
      for (const lane of data.lanes.filter(l => !l.ghost)) expect(visibleSessions(data.sessions, lane).at(-1)?.end).toBeCloseTo(lane.value);
      expect(data.gps).toBe(data.unit !== "pts");
    }
  });
  it("never subdivides the new kilometer axis below one kilometer", () => {
    for (const span of [2, 3, 6, 8.4, 28, 120]) {
      const ticks = boardTicks({ center: 19.2, span }, 6, 1);
      expect(ticks.step).toBeGreaterThanOrEqual(1);
      expect(ticks.values.every(Number.isInteger)).toBe(true);
    }
  });
  it("zooms the world in both axes and gives Atlas a readable marker minimum", () => {
    const close = fieldZoom(6, "map"), far = fieldZoom(12, "map");
    expect(far.worldScale / close.worldScale).toBe(.5);
    expect(far.markerScale).toBe(.5);
    expect(fieldZoom(60, "atlas").markerScale).toBeGreaterThan(fieldZoom(60, "atlas").worldScale);
    expect(fieldZoom(12, "distance").worldScale).toBe(1);
    expect(progressClearance(far.markerScale) / progressClearance(close.markerScale)).toBe(.5);
  });
  it("keeps scenery samples anchored and bounds their detail for wide views", () => {
    const a = fieldSamples({ center: 19.2, span: 6 }, .5), b = fieldSamples({ center: 20.2, span: 6 }, .5);
    expect(a).toContain(20); expect(b).toContain(20);
    expect(fieldSamples({ center: 2500, span: 5000 }, .5).length).toBeLessThan(83);
  });
  it("rejects prototype keys in restorable design choices", () => {
    expect(isBackgroundId("parkland")).toBe(true); expect(isProgressId("dots")).toBe(true); expect(isZoomId("map")).toBe(true);
    expect(isTrailMaterialId("glass")).toBe(true);
    for (const key of ["__proto__", "constructor", "toString", "missing"]) {
      expect(isBackgroundId(key)).toBe(false); expect(isProgressId(key)).toBe(false); expect(isZoomId(key)).toBe(false);
      expect(isTrailMaterialId(key)).toBe(false);
    }
  });
  it("keeps the bottom map window inside the true field when panned past either end", () => {
    expect(overviewWindow({ center: 80, span: 6 }, 25.2)).toEqual({ left: 100, width: 0 });
    const all = overviewWindow({ center: 12, span: 40 }, 25.2);
    expect(all.left).toBe(0); expect(all.width).toBe(100);
    const part = overviewWindow({ center: 19.2, span: 6 }, 25.2);
    expect(part.left).toBeGreaterThan(0); expect(part.left + part.width).toBeLessThanOrEqual(100);
  });
});
