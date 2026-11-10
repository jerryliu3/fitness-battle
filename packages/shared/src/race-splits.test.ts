import {describe,expect,it} from "vitest";
import {analyzeRaceSplits,compareRaceSplits,raceHalfCaption,racePaceLabel,type RaceTimingSplits} from "./race-splits";
const timings:RaceTimingSplits={clock:"chip",finishMs:3000000,sourceUrl:"https://example.test/results",checkpoints:[{distanceM:5000,elapsedMs:1400000}]};
function ready(input:RaceTimingSplits,distance="10k") {
  const result=analyzeRaceSplits(input,distance);
  if(result.status!=="ready") throw new Error("Expected valid splits");
  return result;
}
describe("recorded race splits",()=>{
  it("derives segment pace and halves from observations without modifying inputs",()=>{
    const before=JSON.stringify(timings);
    const result=ready(timings);
    expect(result.rows.map(row=>row.segmentMs)).toEqual([1400000,1600000]);
    expect(result.rows.map(row=>row.paceMsPerKm)).toEqual([280000,320000]);
    expect(result.halfDeltaMs).toBe(200000);
    expect(raceHalfCaption(result.halfDeltaMs!)).toBe("Second half 3:20 slower");
    expect(raceHalfCaption(-200000)).toBe("Second half 3:20 faster");
    expect(raceHalfCaption(0)).toBe("Even halves");
    expect(racePaceLabel(299700)).toBe("5:00/km");
    expect(JSON.stringify(timings)).toBe(before);
  });
  it("keeps missing observations and breaks adjacent segments",()=>{
    const result=ready({...timings,checkpoints:[{distanceM:2000,elapsedMs:600000},{distanceM:4000,elapsedMs:null},{distanceM:6000,elapsedMs:1800000},{distanceM:8000,elapsedMs:2400000}]});
    expect(result.rows.map(row=>row.segmentMs)).toEqual([600000,null,null,600000,600000]);
    expect(result.halfDeltaMs).toBeNull();
  });
  it("uses the recorded finish without inventing a halfway crossing",()=>{
    const result=ready({...timings,checkpoints:[{distanceM:10000,elapsedMs:null}]});
    expect(result.rows[0].elapsedMs).toBe(timings.finishMs);
    expect(result.halfDeltaMs).toBeNull();
    expect(ready({...timings,checkpoints:[{distanceM:10548.75,elapsedMs:1400000}]},"half_marathon").halfDeltaMs).toBe(200000);
  });
  it("withholds unavailable, inconsistent and non-monotone timing data",()=>{
    expect(analyzeRaceSplits(null,"10k").status).toBe("unavailable");
    for(const checkpoints of [[],[{distanceM:11000,elapsedMs:1000}],[{distanceM:0,elapsedMs:1000}],
      [{distanceM:5000,elapsedMs:3000000}],[{distanceM:10000,elapsedMs:2999000}],
      [{distanceM:5000,elapsedMs:NaN}],[{distanceM:5000,elapsedMs:1.5}],
      [{distanceM:5000,elapsedMs:1000},{distanceM:5000,elapsedMs:2000}],
      [{distanceM:2000,elapsedMs:2000},{distanceM:4000,elapsedMs:null},{distanceM:6000,elapsedMs:1000}]]) {
      expect(analyzeRaceSplits({...timings,checkpoints},"10k").status).toBe("invalid");
    }
  });
});

describe("checkpoint comparisons",()=>{
  const first={distance_slug:"10k",splits:timings};
  it("matches distances and preserves missing times",()=>{
    const comparison=compareRaceSplits(first,{...first,splits:{...timings,checkpoints:[{distanceM:5000,elapsedMs:null}]}});
    expect(comparison.rows.map(row=>row.deltaMs)).toEqual([null,0]);
    expect(compareRaceSplits(first,first).rows[0].deltaMs).toBe(0);
  });
  it("rejects incompatible distances and clocks",()=>{
    expect(compareRaceSplits(first,{...first,distance_slug:"marathon"}).reason).toBeTruthy();
    expect(compareRaceSplits(first,{...first,splits:{...timings,clock:"gun"}}).reason).toBeTruthy();
    expect(compareRaceSplits(first,{distance_slug:"10k"}).reason).toBeTruthy();
  });
});
