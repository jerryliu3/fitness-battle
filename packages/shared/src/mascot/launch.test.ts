import {describe,it,expect} from "vitest";
import {EMBER_REST,normalizeEmberPose} from "./model";
import {morphEmberContour} from "./morph";
import {sampleEmberLaunch,EMBER_BRAKE_START,EMBER_CONTACT} from "./launch-motion";
import {launchFootPoints,launchSourcePoint,type EmberLaunchConcept} from "./launch-shape";
import {landingDustNodes} from "./landing-dust";
import {createEmberScene} from "./scene";
const points=(d:string)=>Array.from(d.matchAll(/([-\d.]+) ([-\d.]+)/g),m=>[+m[1],+m[2]]);
const cross=(a:number[],b:number[],c:number[])=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
function simple(path:string,where:string) {
  expect(path).not.toMatch(/NaN|Infinity/);
  const p=points(path),n=p.length;
  expect(p.reduce((sum,a,i)=>{const b=p[(i+1)%n];return sum+a[0]*b[1]-a[1]*b[0];},0),where).toBeGreaterThan(0);
  let crossing:number[]|undefined;
  for(let i=0;i<n&&!crossing;i++)for(let j=i+2;j<n;j++){
    if(i===0&&j===n-1)continue;
    const a=p[i],b=p[(i+1)%n],c=p[j],d=p[(j+1)%n];
    if(cross(a,b,c)*cross(a,b,d)<-1e-7&&cross(c,d,a)*cross(c,d,b)<-1e-7){crossing=[i,j];break;}
  }
  expect(crossing,where).toBeUndefined();
}
describe("held launch studies",()=>{
  for(const concept of ["crest-launch","race-launch"] as EmberLaunchConcept[]) {
    it(`${concept} keeps a simple outline through the held-pose morph and flight transition`,()=>{
      for(let i=0;i<=100;i++)simple(morphEmberContour({...EMBER_REST},i/100,concept,0),`${concept} morph ${i/100}`);
      for(let i=0;i<=240;i++){
        const p=i/240,frame=sampleEmberLaunch(p,concept,{returnToK:true});
        simple(morphEmberContour(frame.pose,frame.morph,concept,frame.flight,frame.crouch),`${concept} sequence ${p}`);
      }
    });
    it(`${concept} returns directly to the same held stance before folding`,()=>{
      const start=sampleEmberLaunch(.18,concept),end=sampleEmberLaunch(.85,concept);
      expect(start.flight).toBe(0);expect(end.flight).toBe(0);
      expect(start.morph).toBe(0);expect(end.morph).toBe(0);
      expect(start.pose).toEqual(end.pose);
      expect(morphEmberContour(start.pose,0,concept,0)).toBe(morphEmberContour(end.pose,0,concept,0));
      expect(sampleEmberLaunch(1,concept,{returnToK:true}).morph).toBe(1);
      expect(sampleEmberLaunch(1,concept).morph).toBe(0);
    });
  }
  it("accelerates across the word, touches down at speed, then skids to a fixed seat",()=>{
    const x=(p:number)=>sampleEmberLaunch(p,"crest-launch").x;
    const h=.00001;
    const speed=(p:number)=>(x(p+h)-x(p-h))/(2*h);
    const entry=speed(.5801);
    let previous=entry;
    for(let p=.59;p<EMBER_BRAKE_START;p+=.01){
      const current=speed(p);expect(current).toBeGreaterThan(previous);previous=current;
      expect(sampleEmberLaunch(p,"crest-launch").flight).toBe(1);
    }
    expect(speed(EMBER_BRAKE_START-.0001)).toBeGreaterThan(entry*1.8);
    expect(speed(EMBER_CONTACT-.004)).toBeLessThan(entry*.05);
    expect(x(EMBER_CONTACT)-x(EMBER_BRAKE_START)).toBeGreaterThan(.4);
    expect(x(EMBER_CONTACT)).toBe(x(.86));
    for(const p of [.58,EMBER_BRAKE_START,EMBER_CONTACT]){
      expect(Math.abs((x(p)-x(p-h))/h-(x(p+h)-x(p))/h)).toBeLessThan(.05);
    }
    expect(sampleEmberLaunch(EMBER_BRAKE_START-.001,"crest-launch").landingDust).toBeUndefined();
    expect(sampleEmberLaunch(EMBER_BRAKE_START+.001,"crest-launch").landingDust).toBeGreaterThan(0);
  });
  it("bends the knees with planted soles and pushes off into a separate jump arc",()=>{
    const rest={...EMBER_REST};
    expect(launchFootPoints(rest,"crest-launch",0,1)).toEqual(launchFootPoints(rest,"crest-launch",0,0));
    const high=launchSourcePoint(180,235,rest,"crest-launch",0,0),low=launchSourcePoint(180,235,rest,"crest-launch",0,1);
    expect(low[1]-high[1]).toBeGreaterThan(29);
    const crouch=sampleEmberLaunch(.232,"crest-launch"),jump=sampleEmberLaunch(.285,"crest-launch");
    expect(crouch.crouch).toBeGreaterThan(.98);expect(crouch.y).toBe(0);
    expect(jump.crouch).toBe(0);expect(jump.y).toBeLessThan(-.8);
    for(let i=0;i<=20;i++)simple(morphEmberContour(rest,0,"crest-launch",0,i/20),`knee bend ${i/20}`);
  });
  it("emits separate, visible plumes from both animated feet during the skid",()=>{
    const frame=sampleEmberLaunch(.715,"crest-launch");
    const scene=createEmberScene({id:"skid",pose:frame.pose,morphConcept:"crest-launch",launchFlight:frame.flight,launchCrouch:frame.crouch,landingDust:frame.landingDust});
    const plumes=scene.filter(n=>n.children?.some(child=>child.tag==="circle"&&child.attrs.fill==="#e4cba7"));
    expect(plumes).toHaveLength(2);
    const origins=plumes.map(n=>String(n.attrs.transform).match(/[-\d.]+/g)!.map(Number));
    expect(Math.abs(origins[0][0]-origins[1][0])).toBeGreaterThan(60);
    for(const plume of plumes) {
      expect(Number(plume.attrs.opacity)).toBeGreaterThan(.8);
      expect(plume.children!.filter(n=>n.tag==="circle").every(n=>Number(n.attrs.r)>=3.5)).toBe(true);
    }
  });
  it("gates deterministic dust to a single contact event and honors Reduced Motion",()=>{
    expect(sampleEmberLaunch(.70,"race-launch").landingDust).toBeUndefined();
    expect(sampleEmberLaunch(.78,"race-launch").landingDust).toBeGreaterThan(0);
    expect(sampleEmberLaunch(.95,"race-launch").landingDust).toBeUndefined();
    const reduced=sampleEmberLaunch(.5,"race-launch",{reducedMotion:true,returnToK:true});
    expect(reduced.morph).toBe(1);expect(reduced.flight).toBe(0);expect(reduced.landingDust).toBeUndefined();
    expect(landingDustNodes(.3)).toEqual(landingDustNodes(.3));expect(landingDustNodes(1)).toEqual([]);
    expect(normalizeEmberPose(reduced.pose)).toEqual(EMBER_REST);
  });
});
