import {describe,expect,it} from "vitest";
import {raceFasterThan,racePercentLabel,type RaceResultReport} from "./race-rankings";
const report: RaceResultReport={result:{id:1,athlete_name:"Runner",sex:"female",distance_slug:"10k",rank_time_ms:3000000,rank_clock:"chip",age_years:null,result_date:null,event_name:"Race",edition_year:2025,attribution:"Race",source_url:"",bib:null},total:10,place:2,slower:7,medianMs:3000000,minimumMs:2900000,binWidthMs:10000,bins:[],neighbors:[]};
const coverage={edition_id:1,event_name:"Race",edition_year:2025,distance_slug:"10k",sex:"female",published_count:10,undated_count:0,expected_eligible_count:10,reviewed_at:"2026-11-09",evidence_url:"https://example.test",complete:true};
describe("reviewed field percentages",()=>{
  it("does not round a near-perfect percentile to 100%",()=>{expect(racePercentLabel(99.999)).toBe(">99.9%");expect(racePercentLabel(0.001)).toBe("<0.1%");});
  it("withholds unreviewed, stale and mismatched denominators",()=>{
    expect(raceFasterThan(report)).toBeNull();
    expect(raceFasterThan({...report,coverage:{...coverage,complete:false}})).toBeNull();
    expect(raceFasterThan({...report,coverage:{...coverage,published_count:9}})).toBeNull();
  });
  it("uses strictly slower results including neither ties nor faster finishes",()=>{
    expect(raceFasterThan({...report,coverage})).toBe(70);
  });
});
