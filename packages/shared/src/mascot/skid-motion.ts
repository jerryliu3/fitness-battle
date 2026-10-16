import type { BootLayout } from "../boot/motion";
import { blendEmberPoses, normalizeEmberPose } from "./model";
import { EMBER_SKID_SPRAY_DURATION } from "./skid-spray";
import { sampleEmberLaunch, type EmberLaunchFrame } from "./launch-motion";
import { emberAirGroundY } from "./skid-rig";

export const EMBER_SKID_TOUCHDOWN = .685;
export const EMBER_SKID_STOP = .775;
export const EMBER_SKID_SETTLED = .84;
export const EMBER_SKID_FOLDED = .93;
/** Leave a small optical gap between A and the moved E; K travels with that gap. */
export const EMBER_SKID_LETTER_GAP = .14;
export function emberSkidWordmarkLayout(layout?:BootLayout) {
  const font=layout?.font??1;
  return {finalX:(layout?.eWidth??.55*font)-.055*font+EMBER_SKID_LETTER_GAP*font,
    eDistance:(layout?.slotWidth??.712*font)-EMBER_SKID_LETTER_GAP*font,
    passX:(layout?.slotWidth??.712*font)-(.4085+.055+.20)*font};
}
const clamp=(n:number)=>Number.isFinite(n)?Math.max(0,Math.min(1,n)):0;
const smooth=(n:number)=>{const t=clamp(n);return t*t*(3-2*t);};
const pulse=(n:number)=>{const t=clamp(n);return 16*t*t*(1-t)**2;};
const hermite=(a:number,b:number,va:number,t:number,span:number,vb=0)=>(2*t**3-3*t*t+1)*a+(t**3-2*t*t+t)*span*va+(-2*t**3+3*t*t)*b+(t**3-t*t)*span*vb;
/** Forward-only ground travel. Small force changes suggest stick/slip friction. */
export function emberSkidTravel(amount:number): number {
  const t=clamp(amount);
  return 1-(1-t)**3+.032*Math.sin(6*Math.PI*t)*Math.sin(Math.PI*t)**2*(1-t)**2;
}
export type EmberSkidFrame = EmberLaunchFrame & {skid:number;spray?:number};
/** The skid candidate uses a lower takeoff and one combined turn-to-K finish. */
type SkidOptions={layout?:BootLayout;returnToK?:boolean;reducedMotion?:boolean};
function skidFrame(progress:number,options:SkidOptions): EmberSkidFrame {
  const p=options.reducedMotion?1:clamp(progress),base=sampleEmberLaunch(p,"crest-launch",options);
  const font=options.layout?.font??1,{finalX,passX}=emberSkidWordmarkLayout(options.layout);
  const finish=options.returnToK?EMBER_SKID_FOLDED:EMBER_SKID_SETTLED;
  const spray=p>EMBER_SKID_TOUCHDOWN&&!options.reducedMotion?(p-EMBER_SKID_TOUCHDOWN)*4.8/EMBER_SKID_SPRAY_DURATION:undefined;
  const activeSpray=spray!==undefined&&spray<1?spray:undefined;
  if(p<.58) {
    const lead=.025*smooth((p-.215)/.02)*(1-smooth((p-.31)/.16));
    const travel=sampleEmberLaunch(p+lead,"crest-launch",options);
    const oldLoad=smooth((p+lead-.18)/.055)*(1-smooth((p+lead-.235)/.04));
    const heldLoad=smooth((p-.18)/.055)*(1-smooth((p-.30)/.10));
    // Remove the earlier tall jump and use a lower, shorter spring into the orbit.
    const y=travel.y+1.05*font*pulse((p+lead-.235)/.15)-.40*font*pulse((p-.235)/.12);
    return {...base,x:travel.x+.12*font*(oldLoad-heldLoad),y,scale:travel.scale,depth:travel.depth,facing:travel.facing,eShift:0,skid:0};
  }
  if(p>=finish)return {...base,x:finalX,eShift:1,morph:options.returnToK?1:base.morph,skid:0,landingDust:undefined,spray:activeSpray};
  const entry=sampleEmberLaunch(.58,"crest-launch",options),before=sampleEmberLaunch(.58-.00001,"crest-launch",options);
  const vx=(entry.x-before.x)/.00001,vy=(entry.y-before.y)/.00001;
  const airSpan=EMBER_SKID_TOUCHDOWN-.58,slideSpan=EMBER_SKID_STOP-EMBER_SKID_TOUCHDOWN;
  // Match air and ground velocity; the slide now covers about 1.2em over 432ms.
  const speed=(finalX-entry.x-vx*airSpan/2)/(airSpan/2+slideSpan/3);
  const distance=speed*slideSpan/3;
  const t=clamp((p-EMBER_SKID_TOUCHDOWN)/slideSpan);
  const recover=smooth((p-EMBER_SKID_STOP)/(finish-EMBER_SKID_STOP));
  const skid=smooth((p-.675)/.01),support=skid*(1-recover);
  const lean=smooth((p-EMBER_SKID_TOUCHDOWN)/.025);
  const chatter=Math.sin(8*Math.PI*t)*Math.sin(Math.PI*t)**2*(1-t);
  let x=finalX-distance*(1-emberSkidTravel(t)),y=0;
  if(p<EMBER_SKID_TOUCHDOWN) {
    const u=(p-.58)/airSpan;
    x=entry.x+vx*airSpan*u+(speed-vx)*airSpan*u*u/2;
    y=hermite(entry.y,0,vy,u,airSpan);
  }
  const flight=(1-.58*lean)*(1-recover);
  const impact=pulse((p-EMBER_SKID_TOUCHDOWN)/.045);
  const crouch=.18*support+.2*impact;
  const targetPose=normalizeEmberPose({
    rotation:((1-lean)*base.pose.rotation-6*lean+1.4*chatter)*(1-recover),
    crest:.8*flight,wind:.9*flight,depth:.75*flight,yaw:.1*flight,
    legLeft:support-.2*flight*(1-support),legRight:-.8*support-.3*flight*(1-support),
    mouthOpen:.55*flight,trail:.8*flight*(1-smooth((p-EMBER_SKID_TOUCHDOWN)/.02)),
    scaleX:1+.025*impact,scaleY:1-.06*impact-.012*chatter,
    eyeLeft:1-.12*impact,eyeRight:1-.12*impact,
  });
  const pose=blendEmberPoses(base.pose,targetPose,smooth((p-.64)/.045));
  const morph=options.returnToK?smooth((p-EMBER_SKID_STOP)/(finish-EMBER_SKID_STOP)):0;
  const eShift=smooth((x-passX)/(finalX-passX));
  const phase=p<EMBER_SKID_TOUCHDOWN?"Fast pass":p<EMBER_SKID_TOUCHDOWN+.018?"Touchdown":p<EMBER_SKID_STOP?"Slide":options.returnToK?"Reform K":"Settle";
  return {...base,x,y,scale:entry.scale+(1-entry.scale)*smooth((p-.58)/airSpan),depth:1,facing:1,flight,crouch,skid,pose,morph,eShift,landingDust:undefined,spray:activeSpray,phase};
}

/** Keep the return airborne until the single front-foot contact. The old orbit's
 * low dip and subsequent climb remain available in the original launch study.
 */
export function sampleEmberSkid(progress:number,options:SkidOptions={}): EmberSkidFrame {
  const p=options.reducedMotion?1:clamp(progress),frame=skidFrame(p,options);
  if(p<=.42||p>=EMBER_SKID_TOUCHDOWN)return frame;
  const font=options.layout?.font??1,h=.00001,apex=skidFrame(.5,options);
  const scaleVelocity=(apex.scale-skidFrame(.5-h,options).scale)/h;
  // Perspective also joins continuously; a sudden scale-velocity change reads
  // as a vertical bump when the host is anchored at the bottom of the SVG.
  const airFrame=(time:number)=>({...skidFrame(time,options),scale:hermite(apex.scale,1,scaleVelocity,(time-.5)/(EMBER_SKID_TOUCHDOWN-.5),EMBER_SKID_TOUCHDOWN-.5)});
  const descent=(time:number,f:EmberSkidFrame)=>font*(emberAirGroundY(f.pose,f.flight,f.crouch,f.skid,f.scale)-.85*(EMBER_SKID_TOUCHDOWN-time)/(EMBER_SKID_TOUCHDOWN-.5));
  if(p>=.5){const air=airFrame(p);return {...air,y:descent(p,air)};}
  // Turn above O before the halfway mark; join the slower descent with the
  // same vertical velocity, without changing the forward acceleration.
  const start=skidFrame(.42,options),before=skidFrame(.42-h,options);
  const endY=descent(.5,apex),endVelocity=(descent(.5+h,airFrame(.5+h))-endY)/h;
  return {...frame,y:hermite(start.y,endY,(start.y-before.y)/h,(p-.42)/.08,.08,endVelocity)};
}
