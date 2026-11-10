import {describe,expect,it} from "vitest";
import {compileReplayRunner,loadReplayField,replayCoordinate,replayDistance,replayFeatures,replayTimeline,validateReplayCourse,type ReplayCourse,type ReplayPage,type ReplayRunner} from "./race-replay";
const course:ReplayCourse={points:[[0,0,0],[.02,0,2000],[.04,0,4000],[.05,0,5000]],sourceUrl:"https://example.test/course",attribution:"Course"};
const runner:ReplayRunner={id:1,name:"Runner",startAt:null,splits:{clock:"chip",finishMs:1500000,sourceUrl:"https://example.test/results",checkpoints:[{distanceM:2000,elapsedMs:600000},{distanceM:4000,elapsedMs:1200000}]}};
const compiled=compileReplayRunner(runner,"5k")!;
describe("edition course replay",()=>{
  it("validates reviewed distance measures and bounds",()=>{
    expect(validateReplayCourse(course,"5k")).toBe(true);
    expect(validateReplayCourse(course,"10k")).toBe(false);
    expect(validateReplayCourse({...course,points:[[0,0,0],[1,1,0],[2,2,5000]]},"5k")).toBe(false);
    expect(replayCoordinate(course,3000)[0]).toBeCloseTo(.03);
    expect(replayCoordinate(course,999999)[0]).toBeCloseTo(.05);
    const loop={...course,points:[[0,0,0],[1,0,2500],[0,0,5000]] as [number,number,number][]};
    expect(replayCoordinate(loop,3750)[0]).toBeCloseTo(.5);
    expect(replayCoordinate({...course,points:[[179,0,0],[-179,0,5000]]},2500)[0]).toBe(-180);
  });
  it("interpolates only adjacent recorded checkpoints and holds the observed finish",()=>{
    expect(replayDistance(compiled,300000)).toBe(1000);
    expect(replayDistance(compiled,-1)).toBeNull();
    expect(replayDistance(compiled,9999999)).toBe(5000);
    const missing=compileReplayRunner({...runner,splits:{...runner.splits,checkpoints:[{distanceM:2000,elapsedMs:null},{distanceM:4000,elapsedMs:1200000}]}},"5k")!;
    expect(replayDistance(missing,600000)).toBeNull();
    expect(replayDistance(missing,1200000)).toBe(4000);
    expect(replayDistance(missing,1350000)).toBe(4500);
  });
  it("requires every actual start for race-day replay",()=>{
    expect(replayTimeline([compiled],true).wallAvailable).toBe(false);
    const first={...compiled,startAt:"2025-01-01T00:00:00Z",startMs:Date.parse("2025-01-01T00:00:00Z")};
    const second={...first,id:2,startMs:first.startMs+600000};
    const timeline=replayTimeline([first,second],true);
    expect(timeline.duration).toBe(2100000);
    expect(replayFeatures(course,[first,second],300000,timeline.origin).features).toHaveLength(1);
    expect(replayTimeline([first,compiled],true).origin).toBeNull();
  });
  it("handles a large field without per-runner DOM or argument-spread limits",()=>{
    const field=Array.from({length:50000},(_,id)=>({...compiled,id:id+1}));
    expect(replayTimeline(field,false).duration).toBe(1500000);
    expect(replayFeatures(course,field,300000).features).toHaveLength(50000);
  });
  it("pages every timing profile beyond 200 and rejects a changed course",async()=>{
    const fetchPage=async(after:number):Promise<ReplayPage>=>({version:"one",course:after===0 ? course : null,totalAvailable:2501,
      runners:Array.from({length:Math.min(1000,2501-after)},(_,i)=>({...runner,id:after+i+1})),next:after+1000<2501 ? after+1000 : null});
    expect((await loadReplayField(fetchPage,()=>false,()=>{})).runners).toHaveLength(2501);
    await expect(loadReplayField(async after=>({...await fetchPage(after),version:after ? "two" : "one"}),()=>false,()=>{})).rejects.toThrow("Course changed");
    await expect(loadReplayField(fetchPage,()=>true,()=>{})).rejects.toThrow("Cancelled");
  });
});
