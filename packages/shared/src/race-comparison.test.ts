import { describe, expect, it } from "vitest";
import { compareRaceResults, raceTimeGap, type SavedRaceResult } from "./race-rankings";
const first: SavedRaceResult = {id:1,athlete_name:"A",distance_slug:"marathon",rank_time_ms:12600000,rank_clock:"chip",event_name:"Race",edition_year:2025};
describe("recorded race comparisons", () => {
  it("preserves direction, ties and subsecond gaps", () => {
    expect(compareRaceResults(first,{...first,id:2,rank_time_ms:12600010}).deltaMs).toBe(10);
    expect(compareRaceResults(first,{...first,id:2}).deltaMs).toBe(0);
    expect(raceTimeGap(-10010)).toBe("0:10.01");
  });
  it("withholds gaps for different distances, clocks and duplicate results", () => {
    expect(compareRaceResults(first,{...first,id:2,distance_slug:"5k"}).deltaMs).toBeNull();
    expect(compareRaceResults(first,{...first,id:2,rank_clock:"gun"}).deltaMs).toBeNull();
    expect(compareRaceResults(first,first).deltaMs).toBeNull();
  });
});
