import { describe, expect, it } from "vitest";
import { fieldFlightDuration, fieldFlightEase, fieldZoomSpan, pinchFieldView } from "./field-navigation";

describe("field navigation", () => {
  it("preserves the distance beneath a moving pinch midpoint", () => {
    const from = { center: 12, span: 6 };
    const next = pinchFieldView(from, 3, .2, .35);
    expect(next.center + (.5 - .35) * next.span).toBeCloseTo(from.center + (.5 - .2) * from.span);
    expect(pinchFieldView(from, 6, .2, .4).center).toBeCloseTo(13.2);
  });
  it("ramps camera speed up and down and lengthens distant flights without unbounded travel time", () => {
    const near = fieldFlightDuration({ center: 10, span: 2 }, { center: 11, span: 2 });
    const far = fieldFlightDuration({ center: 10, span: 2 }, { center: 110, span: 2 });
    expect(far).toBeGreaterThan(near);
    expect(far).toBeLessThanOrEqual(1250);
    expect(fieldFlightEase(.1)).toBeLessThan(.1);
    expect(fieldFlightEase(.9)).toBeGreaterThan(.9);
    expect(fieldFlightEase(.5)).toBeCloseTo(.5);
    expect(fieldFlightEase(-1)).toBe(0);
    expect(fieldFlightEase(2)).toBe(1);
    expect(fieldFlightDuration({ center: 10, span: 2 }, { center: 11, span: 2 })).toBe(fieldFlightDuration({ center: 100, span: 20 }, { center: 110, span: 20 }));
  });
  it("uses the same zoom limits for touch and controls", () => {
    expect(fieldZoomSpan(.01, "mi")).toBe(.5);
    expect(fieldZoomSpan(1000, "km")).toBe(40);
    expect(fieldZoomSpan(.01, "pts")).toBe(2);
    expect(fieldZoomSpan(1000, "pts")).toBe(100);
  });
});
