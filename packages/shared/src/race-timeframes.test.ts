import {describe,expect,it} from "vitest";
import {raceQuery,raceDateBounds,raceWindowCaption} from "./race-rankings";
const query=(value:string)=>raceQuery(new URLSearchParams(value));
describe("race calendar-date scopes",()=>{
  it("rejects impossible, missing and reversed custom dates",()=>{
    for(const value of ["from=2025-02-29&through=2025-03-01","from=2025-03-01&through=2025-02-28", "from=2025-02-28"])
      expect(query(`timeframe=custom&${value}`).dateError).not.toBeNull();
  });
  it("includes the entire chosen last day",()=>{
    expect(raceDateBounds(query("timeframe=custom&from=2024-02-29&through=2024-02-29"))).toEqual({from:"2024-02-29",until:"2024-03-01"});
  });
  it("uses UTC dates and clamps the leap-day anniversary",()=>{
    expect(raceDateBounds(query("timeframe=12m"),new Date("2024-02-29T23:59:59Z"))).toEqual({from:"2023-02-28",until:"2024-03-01"});
  });
  it("preserves legacy year links and leaves all-time unbounded",()=>{
    expect(query("year=2025").timeframe).toBe("year");
    expect(raceDateBounds(query("timeframe=all&year=2025"))).toEqual({from:null,until:null});
    expect(query("timeframe=all&year=2025").year).toBeNull();
  });
  it("shows an inclusive date caption",()=>{
    expect(raceWindowCaption({rows:[],total:0,cohortTotal:0,page:1,pageSize:50,windowFrom:"2025-01-01",windowUntil:"2026-01-01"})).toBe("Event dates: 2025-01-01 – 2025-12-31");
  });
});
