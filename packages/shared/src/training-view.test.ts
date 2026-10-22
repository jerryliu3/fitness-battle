import { describe, expect, it } from "vitest";
import { freshState, reduceCompete } from "./compete/engine";
import { dayKey } from "./period";
import { effortPointProgress, sessionStageModel, trainingAtlas, trainingBuckets, trainingComparison } from "./training-view";
import type { Activity } from "./compete/sports";
const activity=(id:string,startedAt:string,extra:Partial<Activity>={}):Activity=>({id,startedAt,sport:"running",distanceM:1609.344,movingSec:1800,avgHr:null,source:"strava",verified:true,provenance:"recorded",disposition:"counted",...extra});
describe("training calendar presentation",()=>{
 it("uses Eastern days across the fall DST repeat, including both occurrences exactly once",()=>{
  const now=new Date("2026-11-02T04:59:00Z"), rows=[activity("a","2026-11-01T05:30:00Z"),activity("b","2026-11-01T06:30:00Z")];
  const weeks=trainingBuckets(rows,"all","week",now,now);
  expect(weeks).toHaveLength(7);expect(weeks[6]!.sessions).toBe(2);expect(Date.parse(weeks[6]!.end)-Date.parse(weeks[6]!.start)).toBe(25*3600000);
  const sunday=trainingAtlas(rows,"all",now,now).find(d=>d.day==="2026-11-01")!;
  expect(sunday.movingSec).toBe(3600);expect(sunday.activityIds).toEqual(["a","b"]);
 });
 it("clips month weeks at month boundaries and groups years into twelve real months",()=>{
  const now=new Date("2026-10-21T12:00:00Z"), rows=[activity("before","2026-10-01T03:59:59Z"),activity("inside","2026-10-01T04:00:00Z"),activity("end","2026-11-01T03:59:59Z")];
  const month=trainingBuckets(rows,"running","month",now,new Date("2026-11-03T12:00:00Z"));
  expect(month[0]!.start).toBe("2026-10-01T04:00:00.000Z");expect(month.at(-1)!.end).toBe("2026-11-01T04:00:00.000Z");expect(month.reduce((sum,b)=>sum+b.sessions,0)).toBe(2);
  const year=trainingBuckets(rows,"all","year",now,new Date("2026-11-03T12:00:00Z"));expect(year).toHaveLength(12);expect(year[9]!.sessions).toBe(2);expect(year[8]!.sessions).toBe(1);
 });
 it("excludes sample, future, pending and excluded rows and preserves sport and track eligibility",()=>{
  const now=new Date("2026-10-21T12:00:00Z"), at="2026-10-20T12:00:00Z";
  const rows=[activity("real",at),activity("manual",at,{source:"manual",provenance:"manual",verified:false}),activity("strength",at,{sport:"strength"}),activity("excluded",at,{disposition:"excluded"}),activity("sample",at,{provenance:"demo"}),activity("pending",at,{disposition:"pending"}),activity("future","2026-10-22T12:00:00Z")];
  const total=(sport:"running"|"all",track:"open"|"verified")=>trainingBuckets(rows,sport,"week",now,now,track).reduce((sum,b)=>sum+b.sessions,0);
  expect(total("all","open")).toBe(3);expect(total("running","open")).toBe(2);expect(total("running","verified")).toBe(1);
 });
 it("pads a Monday-first month without making future days look completed",()=>{
  const now=new Date("2026-10-21T12:00:00Z"), cells=trainingAtlas([],"all",now,now);
  expect(cells.length%7).toBe(0);expect(cells[0]!.day).toBe("2026-09-28");expect(cells.find(d=>d.day==="2026-10-22")!.future).toBe(true);expect(cells.every(d=>d.intensity===0)).toBe(true);
 });
 it("totals hours across unlike sports without summing their distance into the session hero",()=>{
  const model=sessionStageModel([activity("ride","2026-10-21T10:00:00Z",{sport:"cycling",movingSec:3600}),activity("run","2026-10-21T09:00:00Z")]);
  expect(model.movingSec).toBe(5400);expect(model.sessions).toBe(2);expect(model.rows[0]!.id).toBe("run");
 });
});
describe("next Effort Score point",()=>{
 const now=new Date("2026-10-21T12:00:00Z");
 const joined=()=>reduceCompete(freshState(now),{type:"opt-in",sport:"running",now:now.toISOString()});
 it("uses the round receipt price and keeps Open independent from GPS",()=>{
  let state=joined();state=reduceCompete(state,{type:"log-manual",sport:"running",movingSec:3600,distanceM:7.3*1609.344,activityId:"today",now:now.toISOString()});
  const model=effortPointProgress(state,"running","open",now)!;
  expect(model.earned).toBe(3);expect(model.step).toBeCloseTo(2*1609.344);expect(model.remaining).toBeCloseTo(.7*1609.344);expect(model.fraction).toBeCloseTo(.65);
  expect(effortPointProgress(state,"running","verified",now)?.earned).toBe(0);
 });
 it("honors durable high-water receipts after activity removal instead of re-awarding a point",()=>{
  const state=reduceCompete(joined(),{type:"log-manual",sport:"running",movingSec:3600,distanceM:7.3*1609.344,activityId:"today",now:now.toISOString()});
  const removed=reduceCompete(state,{type:"set-disposition",activityId:"today",disposition:"excluded",now:now.toISOString()});
  const model=effortPointProgress(removed,"running","open",now)!;expect(model.earned).toBe(3);expect(model.fraction).toBe(0);expect(model.remaining).toBeCloseTo(8*1609.344);
 });
 it("does not display an earning target for inactive, future or ended rounds",()=>{
  expect(effortPointProgress(freshState(now),"running","open",now)).toBeNull();
  const state=joined();expect(effortPointProgress(state,"running","open",new Date(state.enrollments[0]!.weekEnd))).toBeNull();
  expect(effortPointProgress(state,"running","open",new Date("2026-10-18T12:00:00Z"))).toBeNull();
 });
});

it("labels partial comparisons against full prior periods and never invents a zero baseline percentage",()=>{
 const now=new Date("2026-10-22T12:00:00Z");
 expect(trainingComparison([],"all","week",now,now).percent).toBeNull();
 expect(trainingComparison([],"all","week",now,now).label).toBe("No activity in previous week");
});

it("compares actual eligible hours and keeps the selected sport and prior timeframe",()=>{
 const now=new Date("2026-10-22T12:00:00Z");
 const rows=[activity("current","2026-10-20T12:00:00Z",{movingSec:3600}),activity("prior","2026-10-18T12:00:00Z"),activity("sample","2026-10-20T12:00:00Z",{provenance:"demo"}),activity("future","2026-10-25T12:00:00Z")];
 const comparison=trainingComparison(rows,"running","week",now,now);
 expect(comparison.total).toBe(3600);expect(comparison.prior).toBe(1800);expect(comparison.percent).toBe(100);expect(comparison.label).toBe("↑ 100% vs all of previous week");
 expect(trainingComparison(rows,"cycling","week",now,now).percent).toBeNull();
});
