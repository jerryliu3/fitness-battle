import { bootFrame, READY_END, FLIGHT_END, type BootLayout } from "../boot/motion";
import { normalizeEmberPose, type EmberPose } from "./model";
import type { EmberLaunchConcept } from "./launch-shape";

export const EMBER_LAUNCH_DURATION = 4800;
export const EMBER_BRAKE_START = .72;
export const EMBER_CONTACT = .745;
const clamp=(n:number)=>Number.isFinite(n)?Math.max(0,Math.min(1,n)):0;
const smooth=(n:number)=>{const t=clamp(n);return t*t*(3-2*t);};
const ease=(n:number)=>{const t=clamp(n);return t*t*t*(t*(t*6-15)+10);};
const hermite=(a:number,b:number,va:number,vb:number,t:number,span:number)=>(2*t**3-3*t*t+1)*a+(t**3-2*t*t+t)*span*va+(-2*t**3+3*t*t)*b+(t**3-t*t)*span*vb;
function orbitAt(travel:number,layout?:BootLayout) {
  // Invert the old clock, reusing its orbit geometry without its long end easing.
  let lo=0,hi=1;
  for(let i=0;i<28;i++){const mid=(lo+hi)/2;if(smooth(mid)<travel)lo=mid;else hi=mid;}
  return bootFrame(READY_END+(FLIGHT_END-READY_END)*(lo+hi)/2,layout);
}
export interface EmberLaunchFrame {
  x:number;y:number;scale:number;depth:number;facing:number;eShift:number;
  morph:number;flight:number;pose:EmberPose;landingDust?:number;
  phase:"Unfold"|"Set"|"Launch & orbit"|"Approach"|"Brake"|"Landed"|"Reform K";
}
/** New study only. Existing boot timing and the original morphs remain unchanged. */
export function sampleEmberLaunch(progress:number,concept:EmberLaunchConcept,options:{layout?:BootLayout;returnToK?:boolean;reducedMotion?:boolean}={}): EmberLaunchFrame {
  const p=options.reducedMotion?1:clamp(progress),font=options.layout?.font??1;
  const finalX=(options.layout?.eWidth??.55*font)-.055*font;
  const end=orbitAt(.66,options.layout),previous=orbitAt(.66-.00001,options.layout);
  const vx=(end.x-previous.x)/.00001*(.66/.36),vy=(end.y-previous.y)/.00001*(.66/.36);
  let x=0,y=0,depth=.2,scale=1,facing=1;
  if(p>=.24 && p<.60) {
    const t=(p-.24)/.36,frame=orbitAt(.66*t*t*(2-t),options.layout);
    ({x,y,depth,scale,facing}=frame);
  } else if(p>=.60 && p<EMBER_BRAKE_START) {
    const t=(p-.60)/.12;
    x=hermite(end.x,finalX-.18*font,vx,3*.18*font/.025,t,.12);
    y=hermite(end.y,-.035*font,vy,3*.035*font/.025,t,.12);
    depth=1;scale=end.scale+(1-end.scale)*smooth((p-.60)/.145);
  } else if(p>=EMBER_BRAKE_START && p<EMBER_CONTACT) {
    const t=(p-EMBER_BRAKE_START)/(EMBER_CONTACT-EMBER_BRAKE_START),brake=1-(1-t)**3;
    x=finalX-.18*font*(1-brake);y=-.035*font*(1-brake);
    depth=1;scale=end.scale+(1-end.scale)*smooth((p-.60)/.145);
  } else if(p>=EMBER_CONTACT) { x=finalX;depth=1; }
  const anticipation=p>=.18&&p<.24?Math.sin(Math.PI*(p-.18)/.06)**2:0;
  if(p<.24){x=-.07*font*anticipation;y=.025*font*anticipation;}
  const flight=smooth((p-.22)/.08)*(1-smooth((p-.70)/.045));
  const catchAge=(p-EMBER_CONTACT)/.075;
  const catchStrength=catchAge>0&&catchAge<1?Math.sin(Math.PI*catchAge)*Math.exp(-2*catchAge):0;
  const angle=12*smooth((p-.56)/.08);
  const pose=normalizeEmberPose({
    rotation:((concept==="crest-launch"?24:19)+angle*.18)*flight+5*catchStrength,
    crest:.8*flight,wind:.9*flight,depth:.75*flight+.15*catchStrength,
    yaw:.12*flight,legLeft:flight?-.2*flight:0,legRight:flight?-.3*flight:0,
    mouthOpen:.65*flight,trail:.7*flight,
    scaleX:1+.025*anticipation+.055*catchStrength,scaleY:1-.045*anticipation-.12*catchStrength,
    eyeLeft:1-.3*catchStrength,eyeRight:1-.3*catchStrength,
  });
  const morph=p<=.18?1-ease((p-.025)/.155):options.returnToK?ease((p-.87)/.11):0;
  const landingDust=p>EMBER_CONTACT&&p<.88&&!options.reducedMotion?(p-EMBER_CONTACT)/(.88-EMBER_CONTACT):undefined;
  const phase=p<.18?"Unfold":p<.24?"Set":p<.60?"Launch & orbit":p<.72?"Approach":p<EMBER_CONTACT?"Brake":p>=.87&&options.returnToK?"Reform K":"Landed";
  return {x,y,depth,scale,facing,eShift:smooth((p-.62)/.10),morph,flight,pose,landingDust,phase};
}
