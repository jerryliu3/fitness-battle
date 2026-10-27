import { describe, expect, it } from "vitest";
import { logoRaceWords, staggeredLogoFrame, DEFAULT_BOOT_SPLASH_VARIANT, LOGO_RACE_DURATION_MS } from "./logo-race";

describe("production logo race", () => {
  it("defaults to the word race and preserves its three lead changes", () => {
    expect(LOGO_RACE_DURATION_MS).toBe(3780);
    expect(DEFAULT_BOOT_SPLASH_VARIANT).toBe("logo-race");
    expect(staggeredLogoFrame(.11).tx).toBeLessThan(0);
    expect(staggeredLogoFrame(.40).taekRight).toBeGreaterThan(staggeredLogoFrame(.40).overRight);
    expect(staggeredLogoFrame(.64).overRight).toBeGreaterThan(staggeredLogoFrame(.64).taekRight);
    const end = staggeredLogoFrame(1);
    expect(end.taekRight).toBeGreaterThan(end.overRight);
    expect(end.tx - end.ox).toBe(64);
    expect(end.layout.heightOverlap).toBe(.35);
  });
  it("uses the same final legible mark for reduced motion and normal completion", () => {
    expect(logoRaceWords(.2, true)).toEqual(logoRaceWords(1));
    const words = logoRaceWords(1).filter(word => !word.echo);
    expect(words.map(word => word.word)).toEqual(["over", "taek"]);
    expect(words.every(word => word.opacity === 1 && word.lean === 9)).toBe(true);
  });
  it("keeps every sampled word finite and opacity bounded, including out-of-range input", () => {
    for (const progress of [NaN, Infinity, -1, ...Array.from({ length: 501 }, (_, i) => i / 500), 2]) {
      for (const word of logoRaceWords(progress)) {
        expect([word.x, word.y, word.width, word.lean, word.opacity].every(Number.isFinite)).toBe(true);
        expect(word.opacity).toBeGreaterThanOrEqual(0);
        expect(word.opacity).toBeLessThanOrEqual(1);
      }
    }
  });
});
