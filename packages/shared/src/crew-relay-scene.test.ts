import { expect, it } from "vitest";
import { crewRelay } from "./compete/crew-relay";
import { crewRelayScene } from "./crew-relay-scene";
it("keeps the dimensional finish at the real baseline after the crew exceeds it",()=>{
 const model=crewRelay([{id:"a",name:"A",value:80,sessions:3},{id:"b",name:"B",value:40,sessions:2},{id:"c",name:"C",value:0,sessions:0}],100);
 const scene=crewRelayScene(model,320,"crew");
 expect(scene.segments.map(s=>s.id)).toEqual(["a","b"]);expect(scene.finish.some(n=>n.tag==="line")).toBe(true);
 expect(JSON.stringify(scene)).not.toMatch(/NaN|Infinity|undefined/);
 expect(model.segments[2]!.value).toBe(0);
});
it("does not manufacture a finish line without previous-week distance",()=>{
 const model=crewRelay([{id:"a",name:"A",value:0,sessions:0}],null),scene=crewRelayScene(model,248,"empty");
 expect(scene.finish).toHaveLength(0);expect(scene.segments).toHaveLength(0);expect(scene.ground.length).toBeGreaterThan(0);
});

it("leaves visible unfilled runway before and beyond the true finish",()=>{
 for(const total of [0,40,100,140]){
  const model=crewRelay([{id:"a",name:"A",value:total,sessions:1}],100);
  expect(model.finish).toBeLessThan(1);
  expect(model.segments[0]!.start+model.segments[0]!.fraction).toBeLessThan(1);
  expect(total<100?model.segments[0]!.fraction<model.finish!:model.segments[0]!.fraction>=model.finish!).toBe(true);
  expect(crewRelayScene(model,320,"runway").finish.length).toBeGreaterThanOrEqual(6);
 }
});
