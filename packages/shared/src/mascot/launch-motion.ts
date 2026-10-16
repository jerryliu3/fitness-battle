import { bootFrame, READY_END, FLIGHT_END, type BootLayout } from "../boot/motion";
import { normalizeEmberPose, type EmberPose } from "./model";
import type { EmberLaunchConcept } from "./launch-shape";

export const EMBER_LAUNCH_DURATION = 4800;
/** Crest first: the feet touch down at full speed, then skid for 144ms. */
export const EMBER_BRAKE_START = .70;
export const EMBER_CONTACT = .73;
const clamp = (n:number) => Number.isFinite(n) ? Math.max(0,Math.min(1,n)) : 0;
const smooth = (n:number) => { const t=clamp(n);return t*t*(3-2*t); };
const ease = (n:number) => { const t=clamp(n);return t*t*t*(t*(t*6-15)+10); };
const pulse = (n:number) => { const t=clamp(n);return 16*t*t*(1-t)**2; };
const hermite = (a:number,b:number,va:number,vb:number,t:number,span:number) =>
  (2*t**3-3*t*t+1)*a+(t**3-2*t*t+t)*span*va+(-2*t**3+3*t*t)*b+(t**3-t*t)*span*vb;
function orbitAt(travel:number,layout?:BootLayout) {
  // Reuse the existing orbit geometry, without its clock's long end easing.
  let lo=0,hi=1;
  for(let i=0;i<28;i++) { const mid=(lo+hi)/2;if(smooth(mid)<travel)lo=mid;else hi=mid; }
  return bootFrame(READY_END+(FLIGHT_END-READY_END)*(lo+hi)/2,layout);
}
export interface EmberLaunchFrame {
  x:number;y:number;scale:number;depth:number;facing:number;eShift:number;
  morph:number;flight:number;crouch:number;pose:EmberPose;landingDust?:number;
  phase:"Unfold"|"Set"|"Crouch"|"Push off"|"Launch & orbit"|"Fast pass"|"Approach"|"Brake"|"Skid"|"Landed"|"Reform K";
}
/** Authoring study only. The product splash and original morphs are unchanged. */
export function sampleEmberLaunch(progress:number,concept:EmberLaunchConcept,options:{layout?:BootLayout;returnToK?:boolean;reducedMotion?:boolean}={}): EmberLaunchFrame {
  const p=options.reducedMotion?1:clamp(progress),font=options.layout?.font??1;
  const crest=concept==="crest-launch",finalX=(options.layout?.eWidth??.55*font)-.055*font;
  // Leave the older race-start choreography available, while refining crest first.
  const launch=crest?.26:.24,returnAt=crest?.58:.60,orbitEnd=crest?.56:.66;
  const brakeAt=crest?EMBER_BRAKE_START:.72,stopAt=crest?EMBER_CONTACT:.745;
  const loopSpan=returnAt-launch,returnSpan=brakeAt-returnAt,brakeSpan=stopAt-brakeAt;
  const end=orbitAt(orbitEnd,options.layout),previous=orbitAt(orbitEnd-.00001,options.layout);
  const vx=(end.x-previous.x)/.00001*(orbitEnd/loopSpan);
  const vy=(end.y-previous.y)/.00001*(orbitEnd/loopSpan);
  // Solve the acceleration and skid distance together: no approach ease-out.
  // The cubic skid's entry speed is 3*distance/duration, so velocity agrees
  // exactly at touchdown and reaches zero only at the final seat.
  const entrySpeed=crest?(finalX-end.x-vx*returnSpan/2)/(returnSpan/2+brakeSpan/3):3*.18*font/brakeSpan;
  const skidDistance=crest?entrySpeed*brakeSpan/3:.18*font;
  let x=0,y=0,depth=.2,scale=1,facing=1;
  if(p>=launch && p<returnAt) {
    const t=(p-launch)/loopSpan,travel=orbitEnd*t*t*(2-t),frame=orbitAt(travel,options.layout);
    ({x,y,depth,scale,facing}=frame);
    if(crest&&travel>.4)facing=-1+2*smooth((travel-.4)/.16);
  } else if(p>=returnAt && p<brakeAt) {
    const t=(p-returnAt)/returnSpan;
    x=crest
      ? end.x+vx*returnSpan*t+(entrySpeed-vx)*returnSpan*t*t/2
      : hermite(end.x,finalX-skidDistance,vx,entrySpeed,t,returnSpan);
    y=hermite(end.y,crest?0:-.035*font,vy,crest?0:3*.035*font/brakeSpan,t,returnSpan);
    depth=1;scale=end.scale+(1-end.scale)*smooth((p-returnAt)/(stopAt-returnAt));
  } else if(p>=brakeAt && p<stopAt) {
    const t=(p-brakeAt)/brakeSpan,remaining=(1-t)**3;
    x=finalX-skidDistance*remaining;y=crest?0:-.035*font*remaining;
    depth=1;scale=end.scale+(1-end.scale)*smooth((p-returnAt)/(stopAt-returnAt));
  } else if(p>=stopAt) { x=finalX;depth=1; }

  const anticipation=crest
    ? smooth((p-.18)/.055)*(1-smooth((p-.235)/.04))
    : p>=.18&&p<.24?Math.sin(Math.PI*(p-.18)/.06)**2:0;
  if(crest) {
    x-=.12*font*anticipation;
    // A separate launch arc carries the bent legs off the floor before cruising.
    y-=1.05*font*pulse((p-.235)/.15);
  } else if(p<.24) { x=-.07*font*anticipation;y=.025*font*anticipation; }
  const flight=crest
    ? smooth((p-.25)/.08)*(1-smooth((p-brakeAt)/.04))
    : smooth((p-.22)/.08)*(1-smooth((p-.70)/.045));
  const catchAge=(p-stopAt)/.075;
  const catchStrength=catchAge>0&&catchAge<1?Math.sin(Math.PI*catchAge)*Math.exp(-2*catchAge):0;
  const crouch=crest?clamp(anticipation+.55*pulse((p-brakeAt)/.12)):0;
  const push=crest?pulse((p-.235)/.05):0;
  const rush=crest?smooth((p-returnAt)/returnSpan):0;
  const angle=12*smooth((p-.56)/.08);
  const pose=normalizeEmberPose({
    rotation:((crest?24:19)+angle*.18+4*rush)*flight+5*catchStrength,
    crest:(.8+.18*rush)*flight,wind:(.9+.1*rush)*flight,depth:(.75+.25*rush)*flight+.15*catchStrength,
    yaw:.12*flight,legLeft:flight?-.2*flight:0,legRight:flight?-.3*flight:0,
    mouthOpen:.65*flight,trail:(.7+.3*rush)*flight,
    scaleX:1+(crest?-.035*push:.025*anticipation)+.055*catchStrength,
    scaleY:1+(crest?.07*push:-.045*anticipation)-(crest?.08:.12)*catchStrength,
    eyeLeft:1-(crest?.12*anticipation:0)-.3*catchStrength,eyeRight:1-(crest?.12*anticipation:0)-.3*catchStrength,
  });
  const morph=p<=.18?1-ease((p-.025)/.155):options.returnToK?ease((p-.87)/.11):0;
  const dustAt=crest?brakeAt:stopAt;
  const landingDust=p>dustAt&&p<.88&&!options.reducedMotion?(p-dustAt)/(.88-dustAt):undefined;
  const phase=p<.18?"Unfold":crest&&p<.235?"Crouch":crest&&p<.29?"Push off":p<launch?"Set":p<returnAt?"Launch & orbit":p<brakeAt?(crest?"Fast pass":"Approach"):p<stopAt?(crest?"Skid":"Brake"):p>=.87&&options.returnToK?"Reform K":"Landed";
  return {x,y,depth,scale,facing,eShift:smooth((p-.62)/(crest?.075:.10)),morph,flight,crouch,pose,landingDust,phase};
}
