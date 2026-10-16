import type { BootLayout } from "../boot/motion";
import { blendEmberPoses, normalizeEmberPose } from "./model";
import { sampleEmberLaunch, type EmberLaunchFrame } from "./launch-motion";

export const EMBER_SKID_TOUCHDOWN = .685;
export const EMBER_SKID_STOP = .775;
export const EMBER_SKID_SETTLED = .84;
const clamp=(n:number)=>Number.isFinite(n)?Math.max(0,Math.min(1,n)):0;
const smooth=(n:number)=>{const t=clamp(n);return t*t*(3-2*t);};
const pulse=(n:number)=>{const t=clamp(n);return 16*t*t*(1-t)**2;};
const hermite=(a:number,b:number,va:number,t:number,span:number)=>(2*t**3-3*t*t+1)*a+(t**3-2*t*t+t)*span*va+(-2*t**3+3*t*t)*b;
/** Forward-only ground travel. Small force changes suggest stick/slip friction. */
export function emberSkidTravel(amount:number): number {
  const t=clamp(amount);
  return 1-(1-t)**3+.025*Math.sin(6*Math.PI*t)*Math.sin(Math.PI*t)**2*(1-t)**2;
}
export type EmberSkidFrame = EmberLaunchFrame & {skid:number};
/** A separate candidate: preserve the #99 jump/orbit and change only its landing. */
export function sampleEmberSkid(progress:number,options:{layout?:BootLayout;returnToK?:boolean;reducedMotion?:boolean}={}): EmberSkidFrame {
  const p=options.reducedMotion?1:clamp(progress),base=sampleEmberLaunch(p,"crest-launch",options);
  if(p<.58||p>=EMBER_SKID_SETTLED)return {...base,skid:0};
  const font=options.layout?.font??1,finalX=(options.layout?.eWidth??.55*font)-.055*font;
  const entry=sampleEmberLaunch(.58,"crest-launch",options),before=sampleEmberLaunch(.58-.00001,"crest-launch",options);
  const vx=(entry.x-before.x)/.00001,vy=(entry.y-before.y)/.00001;
  const airSpan=EMBER_SKID_TOUCHDOWN-.58,slideSpan=EMBER_SKID_STOP-EMBER_SKID_TOUCHDOWN;
  // Match air and ground velocity; the slide now covers about 1.2em over 432ms.
  const speed=(finalX-entry.x-vx*airSpan/2)/(airSpan/2+slideSpan/3);
  const distance=speed*slideSpan/3;
  const t=clamp((p-EMBER_SKID_TOUCHDOWN)/slideSpan);
  const recover=smooth((p-EMBER_SKID_STOP)/(EMBER_SKID_SETTLED-EMBER_SKID_STOP));
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
    rotation:((1-lean)*base.pose.rotation-6*lean+1.1*chatter)*(1-recover),
    crest:.8*flight,wind:.9*flight,depth:.75*flight,yaw:.1*flight,
    legLeft:support-.2*flight*(1-support),legRight:-.8*support-.3*flight*(1-support),
    mouthOpen:.55*flight,trail:.8*flight*(1-smooth((p-EMBER_SKID_TOUCHDOWN)/.02)),
    scaleX:1+.025*impact,scaleY:1-.06*impact-.012*chatter,
    eyeLeft:1-.12*impact,eyeRight:1-.12*impact,
  });
  const pose=blendEmberPoses(base.pose,targetPose,smooth((p-.64)/.045));
  const landingDust=p>EMBER_SKID_TOUCHDOWN&&p<.88&&!options.reducedMotion
    ? p<EMBER_SKID_STOP?.08+.35*t:.43+.57*smooth((p-EMBER_SKID_STOP)/(.88-EMBER_SKID_STOP))
    : undefined;
  const phase=p<EMBER_SKID_TOUCHDOWN?"Fast pass":p<EMBER_SKID_TOUCHDOWN+.018?"Touchdown":p<EMBER_SKID_STOP?"Slide":"Settle";
  return {...base,x,y,scale:entry.scale+(1-entry.scale)*smooth((p-.58)/airSpan),depth:1,facing:1,flight,crouch,skid,pose,landingDust,phase};
}
