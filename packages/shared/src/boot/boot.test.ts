import { describe, expect, it } from "vitest";
import {
  BOOT_DURATION_MS,
  FLIGHT_END,
  READY_END,
  bootEmberPose,
  bootFlightT,
  bootFrame,
  bootKCrossfade,
  bootKMorph,
  isCompeteDataReady,
  shouldShowBootSplash,
} from "./index";

const layout = { overtaWidth: 180, slotWidth: 45, eWidth: 28, font: 50 };

describe("boot gate", () => {
  it("treats loading with no state as not ready", () => {
    expect(isCompeteDataReady("loading", null)).toBe(false);
    expect(isCompeteDataReady("ready", null)).toBe(true);
    expect(isCompeteDataReady("loading", {})).toBe(true);
  });

  it("holds the splash until animation and data are both done", () => {
    expect(shouldShowBootSplash(true, false)).toBe(true);
    expect(shouldShowBootSplash(false, true)).toBe(true);
    expect(shouldShowBootSplash(true, true)).toBe(false);
  });
});

describe("boot flight path", () => {
  it("holds at the slot through ready, then flies a long loop before settle", () => {
    expect(BOOT_DURATION_MS).toBeGreaterThanOrEqual(2800);
    expect(READY_END).toBeLessThan(0.3);
    expect(FLIGHT_END - READY_END).toBeGreaterThan(0.5);

    const ready = bootFrame(READY_END * 0.5, layout);
    expect(ready.phase).toBe("Ready");
    expect(ready.travel).toBe(0);
    expect(Math.abs(ready.x)).toBeLessThan(layout.font * 0.15);

    const behind = bootFrame(READY_END + (FLIGHT_END - READY_END) * 0.3, layout);
    expect(behind.phase).toBe("Flight");
    expect(behind.x).toBeLessThan(-layout.overtaWidth * 0.4);
    expect(behind.depth).toBeLessThan(0);

    const aroundO = bootFrame(READY_END + (FLIGHT_END - READY_END) * 0.48, layout);
    expect(aroundO.x).toBeLessThan(-layout.overtaWidth * 0.7);

    const front = bootFrame(READY_END + (FLIGHT_END - READY_END) * 0.7, layout);
    expect(front.depth).toBeGreaterThan(0.5);
    expect(front.facing).toBe(1);

    const end = bootFrame(1, layout);
    expect(end.phase).toBe("OVERTAEK");
    expect(end.x).toBeCloseTo(layout.eWidth - layout.font * 0.055, 3);
    expect(end.morph).toBe(1);
    expect(end.eShift).toBe(1);
  });

  it("keeps the legacy final-morph alias after the flight lands", () => {
    expect(bootKCrossfade(FLIGHT_END)).toBe(0);
    expect(bootKCrossfade((FLIGHT_END + 1) / 2)).toBeGreaterThan(0.2);
    expect(bootKCrossfade(1)).toBe(1);
    expect(bootFlightT(READY_END)).toBe(0);
    expect(bootFlightT(FLIGHT_END)).toBe(1);
  });

  it("unfolds the K into Ember before launch, then reforms the K", () => {
    expect(bootKMorph(0)).toBe(1);
    expect(bootKMorph(READY_END)).toBe(0);
    const start = bootEmberPose(0);
    expect(start.armLeft).toBeCloseTo(0);
    expect(start.armRight).toBeCloseTo(0);
    const ready = bootEmberPose(READY_END);
    expect(ready.armLeft).toBeCloseTo(0);
    expect(ready.armRight).toBeCloseTo(0);
    const midFlight = bootEmberPose(READY_END + (FLIGHT_END - READY_END) * 0.5);
    expect(midFlight.trail).toBeGreaterThan(0.3);
    expect(bootKMorph(1)).toBe(1);
  });

  it("keeps translation velocity continuous at every flight knot in measured pixel space", () => {
    const progressAt = (travel: number) => {
      let lo=READY_END, hi=FLIGHT_END;
      for(let i=0;i<40;i++) { const mid=(lo+hi)/2; if(bootFlightT(mid)<travel) lo=mid; else hi=mid; }
      return (lo+hi)/2;
    };
    for(const t of [.1,.28,.4,.48,.56,.66,.8,.9]) {
      const p=progressAt(t), h=1e-6;
      const a=bootFrame(p-h,layout), b=bootFrame(p,layout), c=bootFrame(p+h,layout);
      expect(Math.abs((b.x-a.x)/h-(c.x-b.x)/h)).toBeLessThan(.2);
      expect(Math.abs((b.y-a.y)/h-(c.y-b.y)/h)).toBeLessThan(.2);
    }
  });

  it("turns continuously, settles without a scale jump and drives deformation from the measured path", () => {
    let previous=bootFrame(0,layout);
    for(let i=1;i<=1000;i++) {
      const frame=bootFrame(i/1000,layout);
      expect(Math.abs(frame.facing-previous.facing)).toBeLessThan(.1);
      expect(Math.abs(frame.scale-previous.scale)).toBeLessThan(.02);
      previous=frame;
    }
    const p=.6, frame=bootFrame(p,layout);
    expect(bootEmberPose(p,{frame}).rotation).not.toBe(bootEmberPose(p,{frame:{...frame,angle:0}}).rotation);
    expect(bootEmberPose(p,{reducedMotion:true})).toEqual(bootEmberPose(0));
  });
});
