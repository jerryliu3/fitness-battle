import { describe, expect, it } from "vitest";
import { EMBER_MODEL, EMBER_REST, emberContour } from "./model";
import { morphEmberContour } from "./morph";
import { emberLimbMarkers, sampleLimbMorphPreview, type EmberLimbConcept } from "./limb-morph";

const points = (path: string) => Array.from(path.matchAll(/([-\d.]+) ([-\d.]+)/g), m => [Number(m[1]), Number(m[2])]);
const cross = (a: number[], b: number[], c: number[]) => (b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);

describe("anatomical K concepts", () => {
  for(const concept of ["crest-first", "race-start"] as EmberLimbConcept[]) {
    it(`${concept} stays a simple clockwise surface through the tucked-limb release`, () => {
      expect(morphEmberContour({...EMBER_REST},0,concept)).toBe(emberContour({...EMBER_REST}));
      for(let step=1;step<=100;step++) {
        const path=morphEmberContour({...EMBER_REST},step/100,concept);
        expect(path).not.toMatch(/NaN|Infinity/);
        const p=points(path), n=p.length;
        const area=p.reduce((sum,a,i)=>{const b=p[(i+1)%n];return sum+a[0]*b[1]-b[0]*a[1];},0);
        expect(area).toBeGreaterThan(0);
        let crossing: number[]|undefined;
        for(let i=0;i<n&&!crossing;i++) for(let j=i+2;j<n;j++) {
          if(i===0&&j===n-1)continue;
          const a=p[i],b=p[(i+1)%n],c=p[j],d=p[(j+1)%n];
          if(cross(a,b,c)*cross(a,b,d)<-1e-7 && cross(c,d,a)*cross(c,d,b)<-1e-7) { crossing=[i,j];break; }
        }
        expect(crossing,`fold at ${concept} ${step/100}`).toBeUndefined();
      }
    });
  }
  it("preserves the requested branch identities, including the corrected second mapping", () => {
    const a=Object.fromEntries(emberLimbMarkers({...EMBER_REST},1,"crest-first").map(m=>[m.limb,m.point]));
    expect(a.crest[0]).toBeLessThan(120); expect(a.crest[1]).toBe(57);
    expect(a.leftArm[0]).toBeGreaterThan(250); expect(a.leftArm[1]).toBe(57);
    expect(a.rightArm[0]).toBeLessThan(120); expect(a.rightArm[1]).toBeGreaterThan(280);
    expect(a.rightLeg[0]).toBeLessThan(120); expect(a.rightLeg[1]).toBe(345);
    expect(a.leftLeg[0]).toBeGreaterThan(250); expect(a.leftLeg[1]).toBe(345);
    const b=Object.fromEntries(emberLimbMarkers({...EMBER_REST},1,"race-start").map(m=>[m.limb,m.point]));
    expect(b.rightArm[0]).toBeLessThan(120); expect(b.rightArm[1]).toBe(57);
    expect(b.crest[0]).toBeGreaterThan(250); expect(b.crest[1]).toBe(57);
    expect(b.rightLeg[0]).toBeLessThan(120); expect(b.rightLeg[1]).toBe(345);
    expect(b.leftArm[0]).toBeGreaterThan(250); expect(b.leftArm[1]).toBeGreaterThan(300);
    expect(b.leftLeg[0]).toBeGreaterThan(220); expect(b.leftLeg[1]).toBeGreaterThan(330);
  });
  it("holds the paired arm alongside the leg before releasing it", () => {
    const a=emberLimbMarkers({...EMBER_REST},.2,"crest-first").find(m=>m.limb==="rightArm")!;
    const b=emberLimbMarkers({...EMBER_REST},.2,"race-start").find(m=>m.limb==="leftArm")!;
    expect(a.point[1]).toBeGreaterThan(230);
    expect(b.point[1]).toBeGreaterThan(230);
  });
  it("moves the source wrists and foot along joint arcs instead of shrinking their reach", () => {
    const cases = [
      ["crest-first","rightArm",EMBER_MODEL.joints.armLeft],
      ["race-start","leftArm",EMBER_MODEL.joints.armRight],
      ["race-start","leftLeg",EMBER_MODEL.joints.legRight],
    ] as const;
    for(const [concept,limb,joint] of cases) {
      const tip=(amount:number)=>emberLimbMarkers({...EMBER_REST},amount,concept).find(m=>m.limb===limb)!.point;
      const rest=tip(0), k=tip(1), radius=Math.hypot(rest[0]-joint[0],rest[1]-joint[1]);
      for(const amount of [.05,.1,.2,.3,.4,.6]) {
        const p=tip(amount).map((v,i)=>(v-k[i]*amount)/(1-amount));
        expect(Math.abs(Math.hypot(p[0]-joint[0],p[1]-joint[1])-radius)).toBeLessThan(1);
      }
    }
  });
  it("previews a bounded reversible morph with readable endpoint holds", () => {
    expect(sampleLimbMorphPreview(0)).toBe(0);
    expect(sampleLimbMorphPreview(1750)).toBe(1);
    expect(sampleLimbMorphPreview(2200)).toBe(1);
    expect(sampleLimbMorphPreview(4200)).toBe(0);
    expect(sampleLimbMorphPreview(Infinity)).toBe(0);
    expect(sampleLimbMorphPreview(1000)).toBeCloseTo(sampleLimbMorphPreview(3200),6);
  });
});
