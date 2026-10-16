import {describe,it,expect} from "vitest";
import {EMBER_REST,emberDepthOffset,rotateEmberPoint} from "./model";
import {sampleEmberLaunch} from "./launch-motion";
import {sampleEmberSkid,emberSkidTravel,emberSkidWordmarkLayout,EMBER_SKID_TOUCHDOWN,EMBER_SKID_STOP,EMBER_SKID_SETTLED,EMBER_SKID_FOLDED} from "./skid-motion";
import {skidSprayNodes,EMBER_SKID_SPRAY_DURATION} from "./skid-spray";
import {emberSkidOffset} from "./skid-rig";
import {launchFootPoints} from "./launch-shape";
import {morphEmberContour} from "./morph";
import {EMBER_K_SIZE_EM} from "./k-outline";

function worldFeet(p:number) {
  const f=sampleEmberSkid(p),pose=f.pose,[dx,dy]=emberSkidOffset(pose,f.flight,f.crouch,f.skid);
  return launchFootPoints(pose,"crest-launch",f.flight,f.crouch,f.skid).map(([x,y])=>{
    const q=rotateEmberPoint(180+(x-180)*pose.scaleX*Math.cos(pose.yaw*1.12),235+(y-235)*pose.scaleY,[180,235],pose.rotation);
    return [(q[0]+pose.x+dx-180)*f.scale+180+f.x*360/EMBER_K_SIZE_EM,(q[1]+pose.y+dy-400)*f.scale+400+f.y*360/EMBER_K_SIZE_EM];
  });
}
describe("front-foot skid follow-up",()=>{
  it("preserves the K and orbit, but makes the hop lower and moves backward earlier",()=>{
    for(const p of [0,.15,.18,.20]) {
      const {skid,...frame}=sampleEmberSkid(p);
      expect(skid).toBe(0);expect(frame).toEqual(sampleEmberLaunch(p,"crest-launch"));
    }
    const hop=sampleEmberSkid(.285),oldHop=sampleEmberLaunch(.285,"crest-launch");
    expect(Math.abs(hop.y)).toBeLessThan(Math.abs(oldHop.y)*.6);
    expect(sampleEmberSkid(.255).x).toBeLessThan(sampleEmberLaunch(.255,"crest-launch").x);
  });
  it("descends throughout the return and reaches the ground only at touchdown",()=>{
    const rail=worldFeet(EMBER_SKID_TOUCHDOWN)[1][1];
    let lastY=-Infinity,lastSole=-Infinity;
    for(let i=0;i<=740;i++) {
      const p=.5+(EMBER_SKID_TOUCHDOWN-.5)*i/740,f=sampleEmberSkid(p);
      const sole=Math.max(...worldFeet(p).map(q=>q[1]));
      expect(f.y,`host reversal at ${p}`).toBeGreaterThanOrEqual(lastY-1e-8);
      expect(sole,`sole reversal at ${p}`).toBeGreaterThanOrEqual(lastSole-1e-8);
      if(i<740)expect(sole,`premature contact at ${p}`).toBeLessThan(rail);
      lastY=f.y;lastSole=sole;
    }
    expect(lastSole).toBeCloseTo(rail,6);
    // The new aerial turn joins continuously, rather than hiding a height cut.
    const h=.000001,y=(p:number)=>sampleEmberSkid(p).y;
    for(const p of [.42,.5,.58])expect(Math.abs((y(p)-y(p-h))/h-(y(p+h)-y(p))/h)).toBeLessThan(.01);
    for(const font of [40,108]) {
      const layout={font,overtaWidth:3.6*font,slotWidth:.712*font,eWidth:.55*font};
      expect(sampleEmberSkid(.62,{layout}).y).toBeCloseTo(sampleEmberSkid(.62).y*font,6);
    }
  });
  it("lands before the seat, slides forward with friction, then stays still",()=>{
    const at=sampleEmberSkid(EMBER_SKID_TOUCHDOWN),end=sampleEmberSkid(EMBER_SKID_STOP);
    expect(end.x-at.x).toBeGreaterThan(1.1);
    expect(at.y).toBe(0);expect(end.y).toBe(0);
    let last=at.x;
    for(let i=1;i<=180;i++) {
      const p=EMBER_SKID_TOUCHDOWN+(EMBER_SKID_STOP-EMBER_SKID_TOUCHDOWN)*i/180,f=sampleEmberSkid(p);
      expect(f.x).toBeGreaterThanOrEqual(last-1e-10);expect(f.y).toBe(0);last=f.x;
      if(i<180)expect(f.spray).toBeGreaterThan(0);
    }
    expect(sampleEmberSkid(.83).x).toBe(end.x);
    const h=.00001,x=(p:number)=>sampleEmberSkid(p).x;
    for(const p of [.58,EMBER_SKID_TOUCHDOWN,EMBER_SKID_STOP])
      expect(Math.abs((x(p)-x(p-h))/h-(x(p+h)-x(p))/h)).toBeLessThan(.05);
    // Friction changes velocity slightly, without reversing the slide.
    expect(emberSkidTravel(.4)).not.toBeCloseTo(1-(1-.4)**3,5);
  });
  it("waits for the actual pass before moving E and leaves room after A",()=>{
    for(const font of [40,80,108]) {
      const layout={font,slotWidth:.712*font,eWidth:.55*font,overtaWidth:3.6*font};
      for(const p of [.6,.64,.67,EMBER_SKID_TOUCHDOWN])expect(sampleEmberSkid(p,{layout}).eShift).toBe(0);
      expect(sampleEmberSkid(.73,{layout}).eShift).toBeGreaterThan(.5);
      expect(sampleEmberSkid(EMBER_SKID_STOP,{layout}).eShift).toBe(1);
      const word=emberSkidWordmarkLayout(layout);
      expect(layout.slotWidth-word.eDistance).toBeCloseTo(.14*font);
      expect(sampleEmberSkid(1,{layout}).x).toBe(word.finalX);
    }
  });
  it("emits fresh dust throughout the slide, then disperses the last grains",()=>{
    for(const seconds of [.06,.16,.28,.40]) {
      const frame=sampleEmberSkid(EMBER_SKID_TOUCHDOWN+seconds/4.8);
      const plumes=skidSprayNodes(frame.spray,[272,328]);
      const grains=plumes[0].children!.filter(n=>n.tag==="circle");
      expect(grains.length).toBeGreaterThanOrEqual(3);
      expect(grains.some(n=>Number(n.attrs.opacity)>.7)).toBe(true);
      expect(plumes).toEqual(skidSprayNodes(frame.spray,[272,328]));
    }
    expect(skidSprayNodes(1,[272,328])).toEqual([]);
    expect(sampleEmberSkid(EMBER_SKID_TOUCHDOWN+EMBER_SKID_SPRAY_DURATION/4.8+.001).spray).toBeUndefined();
  });
  it("starts the K morph with the recovery rotation, without standing first",()=>{
    const start=sampleEmberSkid(EMBER_SKID_STOP,{returnToK:true});
    const turning=sampleEmberSkid(.81,{returnToK:true}),end=sampleEmberSkid(EMBER_SKID_FOLDED,{returnToK:true});
    expect(start.morph).toBe(0);expect(turning.morph).toBeGreaterThan(0);
    expect(turning.morph).toBeLessThan(1);expect(turning.pose.rotation).toBeLessThan(-3);
    expect(turning.flight).toBeGreaterThan(0);expect(end.morph).toBe(1);
    expect(end.pose).toEqual(EMBER_REST);expect(end.skid).toBe(0);
  });
  it("keeps the left/front sole on the ground rail while leaning and recovering",()=>{
    const target=worldFeet(EMBER_SKID_SETTLED)[1],start=worldFeet(EMBER_SKID_TOUCHDOWN)[1];
    for(let i=0;i<100;i++) {
      const p=EMBER_SKID_TOUCHDOWN+(EMBER_SKID_SETTLED-EMBER_SKID_TOUCHDOWN)*i/100;
      const sole=worldFeet(p)[1];expect(sole[1]).toBeCloseTo(target[1],6);
      expect(sole[0]).toBeGreaterThanOrEqual(start[0]-1e-7);
    }
    const middle=sampleEmberSkid(.73),settled=sampleEmberSkid(EMBER_SKID_SETTLED);
    expect(middle.pose.rotation).toBeLessThan(-4);expect(middle.pose.legLeft).toBeGreaterThan(.9);
    const feet=worldFeet(.73);expect(feet[0][1]).toBeLessThan(feet[1][1]-5);
    expect(middle.skid).toBe(1);expect(settled.pose).toEqual(EMBER_REST);expect(settled.flight).toBe(0);
  });
  it("keeps the silhouette simple through the weight shift and arm recovery",()=>{
    const cross=(a:number[],b:number[],c:number[])=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
    for(const returnToK of [false,true])for(let i=0;i<=200;i++) {
      const p=.64+.30*i/200,f=sampleEmberSkid(p,{returnToK}),rig=f.skid*(1-f.morph);
      const d=morphEmberContour(f.pose,f.morph,"crest-launch",f.flight,f.crouch,rig);
      expect(d).not.toMatch(/NaN|Infinity/);
      const points=Array.from(d.matchAll(/([-\d.]+) ([-\d.]+)/g),m=>[+m[1],+m[2]]),n=points.length;
      const [ox,oy]=emberSkidOffset(f.pose,f.flight,f.crouch,rig),depth=emberDepthOffset(f.pose).map(v=>v*(1-f.morph));
      const rendered=points.flatMap(([x,y])=>[[x,y],[x+depth[0],y+depth[1]]]).map(([x,y])=>{
        const q=rotateEmberPoint(180+(x-180)*f.pose.scaleX*Math.cos(f.pose.yaw*1.12),235+(y-235)*f.pose.scaleY,[180,235],f.pose.rotation);
        return [q[0]+f.pose.x+ox,q[1]+f.pose.y+oy];
      });
      expect(Math.min(...rendered.map(q=>q[0])),`left viewport edge ${p}`).toBeGreaterThanOrEqual(0);
      expect(Math.max(...rendered.map(q=>q[0])),`right viewport edge ${p}`).toBeLessThanOrEqual(360);
      expect(Math.min(...rendered.map(q=>q[1]))).toBeGreaterThanOrEqual(-85);
      expect(Math.max(...rendered.map(q=>q[1]))).toBeLessThanOrEqual(400);
      let crossing:number[]|undefined;
      for(let a=0;a<n&&!crossing;a++)for(let b=a+2;b<n;b++) {
        if(a===0&&b===n-1)continue;
        const v=points[a],w=points[(a+1)%n],x=points[b],y=points[(b+1)%n];
        if(cross(v,w,x)*cross(v,w,y)<-1e-7&&cross(x,y,v)*cross(x,y,w)<-1e-7){crossing=[a,b];break;}
      }
      expect(crossing,`skid pose ${p}`).toBeUndefined();
    }
  });
  it("settles without dust or chatter under Reduced Motion",()=>{
    const f=sampleEmberSkid(.73,{returnToK:true,reducedMotion:true});
    expect(f.morph).toBe(1);expect(f.pose).toEqual(EMBER_REST);expect(f.skid).toBe(0);expect(f.landingDust).toBeUndefined();
    expect(f.spray).toBeUndefined();
  });
});
