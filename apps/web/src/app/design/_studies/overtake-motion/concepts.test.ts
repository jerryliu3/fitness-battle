import { describe, expect, it } from "vitest";
import { allConcepts, concepts, passTimeline, runFrame, runMiles, staggeredLogoFrame, startMiles, travelAt, type Outcome } from "./concepts";

describe("overtake study fixtures", () => {
  for (const concept of allConcepts.overtake) {
    it(`${concept.id} moves forward monotonically and holds the run's exact final distance`, () => {
      let previous = 0;
      for (let i = 0; i <= 1000; i++) {
        const travel = travelAt(i / 1000, concept.id);
        expect(travel).toBeGreaterThanOrEqual(previous);
        previous = travel;
      }
      for (const outcome of [0, 1, 2] as Outcome[]) {
        const start = runFrame(0, concept.id, outcome);
        expect(start.rank).toBe(4);
        expect(start.passed).toHaveLength(0);
        const end = runFrame(1, concept.id, outcome);
        expect(end.miles).toBeCloseTo(startMiles + runMiles[outcome]);
        expect(end.rank).toBe(4 - outcome);
        expect(end.passed).toHaveLength(outcome);
      }
    });
    it(`${concept.id} does not announce a pass in the no-pass run`, () => {
      for (let i = 0; i <= 100; i++) {
        expect(runFrame(i / 100, concept.id, 0).passed).toHaveLength(0);
      }
    });
  }

  it("gives every crossed athlete a five-times-slower window, including the second pass", () => {
    for (const outcome of [1, 2] as Outcome[]) {
      const beats = passTimeline(outcome);
      const velocities = beats.slice(1).map((beat, i) => ({ slow: beat.slow, speed: (beat.travel - beats[i].travel) / (beat.at - beats[i].at) }));
      const slow = velocities.filter(v => v.slow);
      const fast = velocities.find(v => !v.slow)!;
      expect(slow).toHaveLength(outcome * 2);
      for (const segment of slow) expect(fast.speed / segment.speed).toBeCloseTo(5);
      expect(beats[0].travel).toBe(0);
      expect(beats.at(-1)!.travel).toBe(1);
    }
  });

  it("uses a direct progress-only timeline when nobody is passed", () => {
    expect(passTimeline(0)).toEqual([{ at: .22, travel: 0, slow: false }, { at: .84, travel: 1, slow: false }]);
  });

  for (const concept of concepts.logo) {
    it(`${concept.id} runs a continuous 3-stage lead swap without mid-race pauses or end consolidation`, () => {
      const start = staggeredLogoFrame(0, concept.id);
      const stage1 = staggeredLogoFrame(.32, concept.id);
      const stage2 = staggeredLogoFrame(.58, concept.id);
      const end = staggeredLogoFrame(1, concept.id);

      // Start: taek trails behind over.
      expect(start.tx).toBeLessThan(start.ox);
      // Stage 1: taek edges past over by a tiny bit.
      expect(stage1.tx).toBeGreaterThan(stage1.ox);
      expect(stage1.taekRight).toBeGreaterThan(stage1.overRight);
      // Stage 2: over passes taek back by a little bit and goes in front again.
      expect(stage2.ox).toBeGreaterThan(stage2.tx);
      expect(stage2.overRight).toBeGreaterThan(stage2.taekRight);
      // Stage 3: taek pulls away into the final 3-letter, 50-60% height overlap without consolidating back.
      expect(end.tx - end.ox).toBeGreaterThanOrEqual(60);
      expect(end.tx - end.ox).toBeLessThanOrEqual(68);
      expect(end.layout.heightOverlap).toBeGreaterThanOrEqual(.5);
      expect(end.layout.heightOverlap).toBeLessThanOrEqual(.6);

      let prevOx = start.ox;
      let prevTx = start.tx;
      let prevLead = stage2.tx - stage2.ox;
      for (let i = 1; i <= 500; i++) {
        const p = i / 500;
        const frame = staggeredLogoFrame(p, concept.id);
        expect(frame.ox).toBeGreaterThanOrEqual(prevOx - 1e-6);
        expect(frame.tx).toBeGreaterThanOrEqual(prevTx - 1e-6);
        if (p >= .05 && p <= .85) {
          expect(frame.overSpeed).toBeGreaterThan(0);
          expect(frame.taekSpeed).toBeGreaterThan(0);
        }
        if (p >= .58) {
          const lead = frame.tx - frame.ox;
          expect(lead).toBeGreaterThanOrEqual(prevLead - 1e-6);
          prevLead = lead;
        }
        prevOx = frame.ox;
        prevTx = frame.tx;
      }
    });
  }
});
