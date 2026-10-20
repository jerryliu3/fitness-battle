import { describe, expect, it } from "vitest";
import { expandedFieldScale } from "./expanded-field-geometry";

describe("expanded field scale", () => {
  it("uses spare room beyond the former 20 percent cap", () => {
    const scale = expandedFieldScale(830, 743, 1920, 1200);
    expect(scale).toBeGreaterThan(1.2);
    expect(743 * scale).toBeLessThanOrEqual(1112);
    expect(830 * scale).toBeLessThanOrEqual(1888);
  });
  it("preserves readable intrinsic size when there is no extra room", () => {
    expect(expandedFieldScale(830, 743, 1280, 720)).toBe(1);
    expect(expandedFieldScale(0, 0, 1280, 720)).toBe(1);
  });
  it("still fits horizontally if the window narrows while expanded", () => {
    const scale = expandedFieldScale(830, 743, 390, 800);
    expect(830 * scale).toBeLessThanOrEqual(358);
  });
});
