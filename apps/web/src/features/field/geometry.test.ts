import { describe, expect, it } from "vitest";
import {
  placeAt,
  stableLanes,
  trackWindow,
  valueAt,
  worldZ,
  type SceneRunner,
} from "@fitness-battle/pursuit/geometry";

const you: SceneRunner = {
  id: "you",
  name: "You",
  initials: "JL",
  you: true,
  series: [0, 4, 8, 12],
};
const maya: SceneRunner = {
  id: "maya",
  name: "Maya",
  initials: "MC",
  series: [0, 6, 7, 10],
};

describe("field geometry", () => {
  it("starts at zero and keeps you in a stable middle lane", () => {
    expect(valueAt(you, 0)).toBe(0);
    expect(valueAt(you, 3)).toBe(12);
    expect(valueAt(you, 3, 2)).toBe(14);
    expect(you.series[3]).toBe(12);
    const lanes = stableLanes([maya, you, { ...maya, id: "leo", name: "Leo" }]);
    expect(lanes[1]?.id).toBe("you");
    expect(worldZ(0)).toBe(0);
    expect(worldZ(12)).toBeLessThan(0);
  });

  it("shares tied places and excludes the past-self comparison", () => {
    const tied = { ...maya, series: you.series };
    const ahead = { ...maya, id: "leader", series: [0, 15, 20, 30] };
    const ghost = { ...ahead, id: "past", ghost: true };
    const runners = [you, tied, ahead, ghost];
    expect(placeAt(runners, you.id, 3, 0)).toBe(2);
    expect(placeAt(runners, tied.id, 3, 0)).toBe(2);
    expect(placeAt(runners, ghost.id, 3, 0)).toBe(0);
  });

  it("ranks by value without moving lanes", () => {
    expect(placeAt([you, maya], "you", 1, 0)).toBe(2);
    expect(placeAt([you, maya], "you", 3, 0)).toBe(1);
    expect(trackWindow(12, 6, null).min).toBeGreaterThan(0);
    expect(trackWindow(12, 6, null, 12).min).toBe(0);
  });
});
