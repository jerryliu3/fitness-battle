import { describe, expect, it } from "vitest";
import { centeredLaneScroll, laneGeometry } from "./lane-geometry";

describe("lane viewport geometry", () => {
  it("fills wide windows without scaling text or shrinking crowded lane targets", () => {
    expect(laneGeometry(1200, 700, 5)).toEqual({ width: 1200, height: 700, laneWidth: 229.6, plotHeight: 560 });
    const crowded = laneGeometry(390, 400, 20);
    expect(crowded.width).toBe(1492);
    expect(crowded.laneWidth).toBe(72);
    expect(crowded.plotHeight).toBe(260);
  });

  it("centers the actual athlete rather than the drawing including its axis gutter", () => {
    const { width, laneWidth } = laneGeometry(390, 540, 20);
    const left = centeredLaneScroll(10, laneWidth, 390, width);
    expect(10 + 10.5 * laneWidth - left).toBe(195);
  });

  it("preserves the horizontal lane anchor as the window grows and shrinks", () => {
    const old = laneGeometry(390, 540, 20);
    const left = centeredLaneScroll(6, old.laneWidth, 390, old.width);
    const anchor = (left + 390 / 2 - 10) / old.laneWidth - 0.5;
    const expanded = laneGeometry(900, 650, 20);
    const next = centeredLaneScroll(anchor, expanded.laneWidth, 900, expanded.width);
    expect((next + 450 - 10) / expanded.laneWidth - 0.5).toBe(6);
    expect(centeredLaneScroll(anchor, old.laneWidth, 390, old.width)).toBe(left);
  });

  it("bounds the horizontal offset for edge lanes and short fields", () => {
    expect(centeredLaneScroll(0, 72, 390, 1492)).toBe(0);
    expect(centeredLaneScroll(19, 72, 390, 1492)).toBe(1102);
    expect(centeredLaneScroll(1, 200, 900, 900)).toBe(0);
    expect(laneGeometry(0, 0, 0).plotHeight).toBeGreaterThan(0);
  });
});
