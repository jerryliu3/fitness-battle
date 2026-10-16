import {describe,it,expect} from "vitest";
import {EMBER_REST,emberDepthOffset,rotateEmberPoint} from "./model";
import {sampleEmberLaunch} from "./launch-motion";
import {sampleEmberSkid,emberSkidTravel,EMBER_SKID_TOUCHDOWN,EMBER_SKID_STOP,EMBER_SKID_SETTLED} from "./skid-motion";
import {emberSkidOffset} from "./skid-rig";
import {launchFootPoints} from "./launch-shape";
import {morphEmberContour} from "./morph";

function worldFeet(p:number) {
  const f=sampleEmberSkid(p),pose=f.pose,[dx,dy]=emberSkidOffset(pose,f.flight,f.crouch,f.skid);
  return launchFootPoints(pose,"crest-launch",f.flight,f.crouch,f.skid).map(([x,y])=>{
    const q=rotateEmberPoint(180+(x-180)*pose.scaleX*Math.cos(pose.yaw*1.12),235+(y-235)*pose.scaleY,[180,235],pose.rotation);
    return [(q[0]+pose.x+dx)*f.scale+f.x*360/.88,(q[1]+pose.y+dy)*f.scale+f.y*360/.88];
  });
}
describe("front-foot skid follow-up",()=>{
  it("preserves the earlier takeoff and original sampler",()=>{
    for(const p of [0,.15,.18,.232,.285,.45,.57]) {
      const {skid,...frame}=sampleEmberSkid(p);
      expect(skid).toBe(0);expect(frame).toEqual(sampleEmberLaunch(p,"crest-launch"));
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
      if(i<180)expect(f.landingDust).toBeGreaterThan(0);
    }
    expect(sampleEmberSkid(.83).x).toBe(end.x);
    const h=.00001,x=(p:number)=>sampleEmberSkid(p).x;
    for(const p of [.58,EMBER_SKID_TOUCHDOWN,EMBER_SKID_STOP])
      expect(Math.abs((x(p)-x(p-h))/h-(x(p+h)-x(p))/h)).toBeLessThan(.05);
    // Friction changes velocity slightly, without reversing the slide.
    expect(emberSkidTravel(.4)).not.toBeCloseTo(1-(1-.4)**3,5);
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
    for(let i=0;i<=160;i++) {
      const p=.64+.21*i/160,f=sampleEmberSkid(p);
      const d=morphEmberContour(f.pose,f.morph,"crest-launch",f.flight,f.crouch,f.skid);
      expect(d).not.toMatch(/NaN|Infinity/);
      const points=Array.from(d.matchAll(/([-\d.]+) ([-\d.]+)/g),m=>[+m[1],+m[2]]),n=points.length;
      const [ox,oy]=emberSkidOffset(f.pose,f.flight,f.crouch,f.skid),depth=emberDepthOffset(f.pose);
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
  });
});
