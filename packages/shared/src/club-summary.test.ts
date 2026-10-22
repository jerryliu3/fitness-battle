import { describe, expect, it } from "vitest";
import { freshState } from "./compete/engine";
import { clubDuration, clubWeekSummary } from "./club-summary";
import type { Activity } from "./compete/sports";
const now = new Date("2026-11-02T16:00:00Z");
const activity = (id:string, startedAt:string, extra:Partial<Activity>={}):Activity => ({id,startedAt,sport:"running",movingSec:1800,distanceM:5000,avgHr:null,source:"manual",verified:false,provenance:"recorded",...extra});
describe("club calendar summary",()=>{
  it("uses Eastern half-open weeks across DST and excludes ineligible and future rows",()=>{
    const state={...freshState(now),name:"Alex Park",activities:[activity("prior","2026-11-02T04:59:59Z"),activity("current","2026-11-02T05:00:00Z"),activity("future","2026-11-03T12:00:00Z"),activity("excluded","2026-11-02T12:00:00Z",{disposition:"excluded"}),activity("sample","2026-11-02T13:00:00Z",{provenance:"demo"})]};
    expect(clubWeekSummary(state,now)).toMatchObject({sessions:1,movingSec:1800,previousSec:1800,activeDays:1,firstName:"Alex"});
  });
  it("formats clear hours and minutes",()=>{expect(clubDuration(3720)).toBe("1h 2m");expect(clubDuration(0)).toBe("0m");});
});
