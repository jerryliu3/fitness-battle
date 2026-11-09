import {describe,expect,it} from "vitest";
import {parseUpdatedRaceSets,mergeRaceCandidates,parseDiscoveryState,updatedRaceSetsUrl} from "./discovery";
const row={race_id:1,event_id:2,individual_result_set_id:3,race_name:"Road race",individual_result_set_name:"Finishers",last_modified_ts:100};
describe("provider event discovery",()=>{
  it("uses the documented metadata shape and explicit window",()=>{
    const candidate=parseUpdatedRaceSets({result_sets:[row]})[0]!;
    expect(candidate.key).toBe("runsignup:1:2:3");
    const url=new URL(updatedRaceSetsUrl(10,200,2,1000));
    expect(url.searchParams.get("modified_until_timestamp")).toBe("200");
    expect(url.searchParams.get("page")).toBe("2");
  });
  it("does not confuse malformed data with an empty feed",()=>{
    expect(()=>parseUpdatedRaceSets({error:"denied"})).toThrow();
    expect(()=>parseUpdatedRaceSets({result_sets:[{...row,last_modified_ts:"100"}]})).toThrow();
    expect(()=>updatedRaceSetsUrl(200,100,1,1000)).toThrow();
  });
  it("deduplicates overlaps without rolling metadata backwards",()=>{
    const old=parseUpdatedRaceSets({result_sets:[row]});
    const next=parseUpdatedRaceSets({result_sets:[{...row,last_modified_ts:101},{...row,event_id:9}]});
    const merged=mergeRaceCandidates(mergeRaceCandidates(old,next),old);
    expect(merged).toHaveLength(2);
    expect(merged.find(r=>r.key==="runsignup:1:2:3")?.modifiedAt).toBe(101);
  });
  it("rejects a corrupted checkpoint instead of restarting from zero",()=>{
    const candidates=parseUpdatedRaceSets({result_sets:[row]});
    expect(parseDiscoveryState({version:1,cursorUntil:100,candidates}).candidates).toEqual(candidates);
    expect(()=>parseDiscoveryState({version:1,cursorUntil:100,candidates:[{...candidates[0],key:"wrong"}]})).toThrow();
  });
});
