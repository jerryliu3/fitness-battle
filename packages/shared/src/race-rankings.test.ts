import { describe, expect, it } from "vitest";
import { raceQuery, raceClock, raceEditionOptions, raceEditionChart, type RaceEditionAnalytics, type RaceCoverage } from "./race-rankings";
describe("public race query", () => {
  it("rejects invalid scopes and bounds input", () => {
    expect(raceQuery(new URLSearchParams("sex=invalid&year=1&page=Infinity"))).toMatchObject({ sex: "female", year: null, page: 1, query: "", timeframe:"all",dateError:null });
    expect(raceQuery(new URLSearchParams("page=2147483648")).page).toBe(1);
    expect(raceQuery(new URLSearchParams("sex=other&year=2025&page=401&q=Runner"))).toMatchObject({ sex: "other", year: 2025, page: 401, query: "Runner",timeframe:"year",dateError:null });
  });
  it("formats observed clocks without scaling", () => {
    expect(raceClock(12601000)).toBe("3:30:01");
  });
});

describe("event edition scope", () => {
  it("preserves a precise edition with search and paging", () => {
    expect(raceQuery(new URLSearchParams("edition=42&page=5&q=Runner"))).toMatchObject({editionId:42,editionError:null,page:5,query:"Runner"});
    expect(raceQuery(new URLSearchParams())).toMatchObject({editionId:null,editionError:null});
    for (const edition of ["-1", "0", "1.5", "Infinity", "9007199254740992", "42x", " 42"]) {
      const query = raceQuery(new URLSearchParams({edition}));
      expect(query.editionId).toBeNull();
      expect(query.editionError).toBeTruthy();
    }
  });
  it("deduplicates categories without combining editions or distances", () => {
    const row: RaceCoverage = {edition_id:1,event_name:"Race",edition_year:2025,distance_slug:"marathon",sex:"female",published_count:10,undated_count:0,expected_eligible_count:null,reviewed_at:null,evidence_url:null,complete:false};
    const options = raceEditionOptions([row,{...row,sex:"male"},{...row,edition_id:2,edition_year:2026},{...row,edition_id:3,distance_slug:"10k"}],"marathon");
    expect(options.map(e=>e.edition_id)).toEqual([2,1]);
    expect(raceEditionOptions([],"marathon")).toEqual([]);
  });
});

describe("edition distribution presentation", () => {
  const analytics: RaceEditionAnalytics = {total:3,fastestMs:1000000,slowestMs:1002000,medianMs:1000000,minimumMs:1000000,binWidthMs:1000,chipCount:2,officialCount:1,bins:[{bucket:0,count:2},{bucket:2,count:1}]};
  it("preserves missing ranges and counts instead of smoothing the field", () => {
    const bins = raceEditionChart(analytics);
    expect(bins.map(b => b.count)).toEqual([2,0,1]);
    expect(bins.map(b => b.height)).toEqual([100,0,50]);
    expect(bins[0].label).toBe("16:40 – under 16:41");
    expect(bins.reduce((sum,b) => sum+b.count,0)).toBe(analytics.total);
  });
  it("handles identical finishes as one range", () => {
    expect(raceEditionChart({...analytics,bins:[{bucket:0,count:3}]})).toHaveLength(1);
  });
});
