import { describe, expect, it } from "vitest";
import { allConcepts, passTimeline, runFrame, runMiles, startMiles, travelAt, type Outcome } from "./concepts";

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
});
