import { expect, it } from "vitest";
import { crewRelay } from "./compete/crew-relay";
import { crewRelayScene } from "./crew-relay-scene";
it("keeps the dimensional finish at the real baseline after the crew exceeds it",()=>{
 const model=crewRelay([{id:"a",name:"A",value:80,sessions:3},{id:"b",name:"B",value:40,sessions:2},{id:"c",name:"C",value:0,sessions:0}],100);
 const scene=crewRelayScene(model,320,"crew");
 expect(scene.segments.map(s=>s.id)).toEqual(["a","b"]);expect(scene.finish[0]!.attrs.x1).toBeCloseTo(16+(320-52)*100/120);
 expect(JSON.stringify(scene)).not.toMatch(/NaN|Infinity|undefined/);
 expect(model.segments[2]!.value).toBe(0);
});
it("does not manufacture a finish line without previous-week distance",()=>{
 const model=crewRelay([{id:"a",name:"A",value:0,sessions:0}],null),scene=crewRelayScene(model,248,"empty");
 expect(scene.finish).toHaveLength(0);expect(scene.segments).toHaveLength(0);expect(scene.ground.length).toBeGreaterThan(0);
});
