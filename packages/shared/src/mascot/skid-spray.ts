import type {EmberNode} from "./scene";

export const EMBER_SKID_SPRAY_EMIT = .432;
export const EMBER_SKID_SPRAY_DURATION = .852;
/** Continuous, deterministic toe spray, followed by the last grains dispersing. */
export function skidSprayNodes(phase:number|undefined,origin:readonly [number,number]): EmberNode[] {
  if(phase===undefined||!Number.isFinite(phase)||phase<=0||phase>=1)return [];
  const time=phase*EMBER_SKID_SPRAY_DURATION,fill="#f1dbb5",children:EmberNode[]=[];
  for(let i=0;i<20;i++) {
    const born=i*.022,age=time-born,life=.30+(i%4)*.04;
    if(age<0||age>=life)continue;
    const a=age/life,reach=1-(1-a)**4;
    const x=-[260,210,245,170,230,195][i%6]*reach;
    const y=-[16,24,40,10,30][i%5]*Math.sin(Math.PI*a*.8)+12*a*a;
    children.push({tag:"circle",attrs:{cx:x,cy:y,r:4.5+(i%3)*1.3,fill:i%4===0?"#d4b68c":fill,opacity:.95*(1-a)**.65}});
    if(i%2===0)children.push({tag:"circle",attrs:{cx:x-9,cy:y-12,r:2.2,fill,opacity:.75*(1-a)}});
  }
  // Lighter puffs and wisps keep the toe legible instead of coating it in dust.
  for(let i=0;i<4;i++) {
    const age=time-i*.13,t=age/.34;
    if(t<=0||t>=1)continue;
    children.push({tag:"ellipse",attrs:{cx:-20-195*t,cy:-8-25*t,rx:12+32*t,ry:5+14*t,fill,opacity:.42*Math.sin(Math.PI*t)}});
    children.push({tag:"path",attrs:{d:`M -2 1 Q ${-25-70*t} ${-5-12*t} ${-65-145*t} ${-8-25*t}`,fill:"none",stroke:fill,strokeWidth:2.6,strokeLinecap:"round",opacity:.55*(1-t)}});
  }
  const tail=Math.max(0,Math.min(1,(time-EMBER_SKID_SPRAY_EMIT)/.22));
  children.push({tag:"path",attrs:{d:`M ${-15-Math.min(95,time*250)} 4 L 7 4 M ${-5-Math.min(65,time*190)} 8 L -5 8`,fill:"none",stroke:fill,strokeWidth:2.5,strokeLinecap:"round",opacity:.6*Math.min(1,time/.035)*(1-tail)}});
  return [{tag:"g",attrs:{transform:`translate(${origin[0]} ${origin[1]})`},children}];
}
