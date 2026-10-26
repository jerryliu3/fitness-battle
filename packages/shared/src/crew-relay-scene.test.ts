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

it("keeps every finish check in the block's top plane with poles on both edges", () => {
  const model = crewRelay([{ id: "a", name: "A", value: 80, sessions: 3 }], 100);
  for (const width of [248, 640]) {
    const scene = crewRelayScene(model, width, "plane");
    const length = width - 52;
    const checks = scene.finish.filter(node => node.tag === "path" && String(node.attrs.d).includes(" L"));
    expect(checks).toHaveLength(16);
    for (const check of checks) {
      const coords = String(check.attrs.d).match(/-?\d+(?:\.\d+)?/g)!.map(Number);
      for (let i = 0; i < coords.length; i += 2) {
        const x = coords[i]!, y = coords[i + 1]!;
        // Invert the top-plane projection, independently of checker subdivision.
        const depth = (174 - y - 30 * (x - 16) / length) / (46 - 720 / length);
        const fraction = (x - 16 - 24 * depth) / length;
        expect(depth).toBeGreaterThanOrEqual(-1e-6);
        expect(depth).toBeLessThanOrEqual(1 + 1e-6);
        expect(Math.abs(fraction - model.finish!) * length).toBeLessThanOrEqual(5.0001);
      }
    }
    const poles = scene.finish.filter(node => node.tag === "line");
    expect(poles).toHaveLength(2);
    expect(Number(poles[1]!.attrs.x1) - Number(poles[0]!.attrs.x1)).toBeCloseTo(24);
    expect(Number(poles[0]!.attrs.y1) - Number(poles[1]!.attrs.y1)).toBeCloseTo(46);
  }
});
