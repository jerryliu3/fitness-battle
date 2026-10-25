import { expect, it } from "vitest";
import { crewRelay, crewWeekRelay } from "./crew-relay";
it("keeps member identity and ribbon colors stable when API row order changes",()=>{
 const a={id:"a",name:"A",value:10,sessions:1},b={id:"b",name:"B",value:20,sessions:2};
 expect(crewRelay([b,a],100)).toEqual(crewRelay([a,b],100));
});
it("represents over-goal distance and zero contributors without overflow", () => {
  const relay = crewRelay(
    [
      { id: "a", name: "A", value: 80, sessions: 2 },
      { id: "b", name: "B", value: 40, sessions: 1 },
      { id: "c", name: "C", value: 0, sessions: 0 },
    ],
    100,
  );
  expect(relay.total).toBe(120);
  expect(relay.remaining).toBe(0);
  expect(relay.finish).toBeCloseTo(100 / 144);
  expect(relay.segments.map((s) => s.share)).toEqual([2 / 3, 1 / 3, 0]);
  expect(relay.segments.reduce((t, s) => t + s.fraction, 0)).toBeCloseTo(1 / 1.2);
});
it("keeps empty weeks finite and everyone inspectable", () => {
  const relay = crewRelay([{ id: "a", name: "A", value: 0, sessions: 0 }], 100);
  expect(relay.segments[0]!.share).toBe(0);
  expect(relay.segments).toHaveLength(1);
  expect(relay.finish).toBeCloseTo(1 / 1.2);
});

it("labels a configured volume goal separately from missing prior-week history",()=>{
 const result=crewWeekRelay({members:[{user_id:"a",display_name:"A"}],entries:[{user_id:"a",distance_m:120000,moving_sec:3600}],format:"volume",sport:"running",targetSessions:4,targetDistanceM:100000,previousDistanceM:null});
 expect(result.kind).toBe("distance");expect(result.target).toBe(100000);expect(result.model.finish).toBeLessThan(result.model.segments[0]!.fraction);
});
it("omits members with zero distance or sessions from the relay model",()=>{
 const result=crewWeekRelay({members:[{user_id:"a",display_name:"A"},{user_id:"b",display_name:"B"}],entries:[{user_id:"a",distance_m:5000,moving_sec:1200}],format:"volume",sport:"running",targetSessions:4,targetDistanceM:10000,previousDistanceM:null});
 expect(result.model.segments.map(s=>s.id)).toEqual(["a"]);
});
