import { EMBER_MODEL, deformEmberPoint, normalizeEmberPose, rotateEmberPoint, type EmberPose } from "./model";
import { EMBER_K_OUTLINE } from "./k-outline";

type Point = readonly [number,number];
type Cubic = readonly [number,number,number,number,number,number];
export type EmberLaunchConcept = "crest-launch" | "race-launch";
const clamp = (n:number) => Number.isFinite(n) ? Math.max(0,Math.min(1,n)) : 0;
const knots: Record<EmberLaunchConcept, readonly number[]> = {
  "crest-launch": [26,39,56,74,94,112,125,128,132,140,149,154],
  "race-launch": [56,74,88,94,98,112,125,128,154,167,174,184],
};
// Separate shape keys preserve the v1 experiments. Race's external arm retracts
// into the shoulder silhouette; the same arm then lies in front of the face.
const held: Record<EmberLaunchConcept, Partial<Record<number,Cubic>>> = {
  "crest-launch": {7:[93,260,85,309,73,309],8:[52,316,68,201,126,149]},
  "race-launch": {
    1:[240,168,251,188,257,210],2:[263,220,264,232,261,238],
    3:[255,250,311,299,289,311],4:[275,326,196,290,182,289],
  },
};
export function launchLean(concept: EmberLaunchConcept, flight=0): number {
  return (concept === "crest-launch" ? -9 : 22)*(1-clamp(flight));
}
function sourcePose(pose: EmberPose, concept: EmberLaunchConcept, flight:number): EmberPose {
  const ready=1-clamp(flight);
  return normalizeEmberPose({...pose,
    armRight:pose.armRight+(concept==="crest-launch"?.95:0)*ready,
    legLeft:pose.legLeft+.15*ready,legRight:pose.legRight+.15*ready,
  });
}
export function launchSourcePoint(x:number,y:number,pose:EmberPose,concept:EmberLaunchConcept,flight=0): Point {
  const p=deformEmberPoint(x,y,sourcePose(pose,concept,flight));
  return rotateEmberPoint(p[0],p[1],[180,235],launchLean(concept,flight));
}
function curves(pose: EmberPose, concept: EmberLaunchConcept, flight:number) {
  const ready=1-clamp(flight);
  const body=EMBER_MODEL.body.map((segment,index)=>segment.map((v,k)=>{
    const target=held[concept][index]; return target ? v+(target[k]-v)*ready : v;
  }));
  // Keep the side-tucked wrist and crouched foot on a joint arc during release.
  const tipJoints=concept==="crest-launch" ? [[7,EMBER_MODEL.joints.armLeft] as const] : [[3,EMBER_MODEL.joints.legRight] as const];
  for(const [index,joint] of tipJoints) {
    const a=EMBER_MODEL.body[index],b=held[concept][index]!;
    const ax=a[4]-joint[0],ay=a[5]-joint[1],bx=b[4]-joint[0],by=b[5]-joint[1];
    const angle=Math.atan2(ay,ax),delta=Math.atan2(Math.sin(Math.atan2(by,bx)-angle),Math.cos(Math.atan2(by,bx)-angle));
    const radius=Math.hypot(ax,ay)+(Math.hypot(bx,by)-Math.hypot(ax,ay))*ready;
    const dx=joint[0]+Math.cos(angle+delta*ready)*radius-body[index][4],dy=joint[1]+Math.sin(angle+delta*ready)*radius-body[index][5];
    body[index][2]+=dx;body[index][3]+=dy;body[index][4]+=dx;body[index][5]+=dy;
    body[index+1][0]+=dx;body[index+1][1]+=dy;
  }
  const starts=[EMBER_MODEL.start,...body.slice(0,-1).map(s=>[s[4],s[5]])];
  return body.map((s,i)=>[starts[i],[s[0],s[1]],[s[2],s[3]],[s[4],s[5]]].map(([x,y])=>launchSourcePoint(x,y,pose,concept,flight)));
}
function glyph(index:number): Point {
  const n=EMBER_K_OUTLINE.length,i=Math.floor(index),t=index-i,a=EMBER_K_OUTLINE[i%n],b=EMBER_K_OUTLINE[(i+1)%n];
  return [a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];
}
export function launchMorphPoints(pose:EmberPose,amount:number,concept:EmberLaunchConcept,flight=0): Point[] {
  const morph=clamp(amount),k=knots[concept];
  return curves(pose,concept,flight).flatMap((curve,i)=>{
    const a=k[i],b=k[i+1],samples=new Set<number>();
    for(let j=a;j<b;j++)samples.add(j);
    for(let j=0;j<20;j++)samples.add(a+(b-a)*j/20);
    return [...samples].sort((a,b)=>a-b).map(index=>{
      const t=(index-a)/(b-a),u=1-t,w=[u**3,3*u*u*t,3*u*t*t,t**3],target=glyph(index);
      const source=[0,1].map(axis=>curve.reduce((sum,p,j)=>sum+p[axis]*w[j],0));
      return [source[0]+(target[0]-source[0])*morph,source[1]+(target[1]-source[1])*morph] as Point;
    });
  });
}
export function launchCrescent(pose:EmberPose,amount:number,concept:EmberLaunchConcept,flight=0): string {
  const k=knots[concept],tip=glyph(k[0]),neck=glyph(k[9]);
  const sourceTip=launchSourcePoint(140,57,pose,concept,flight),sourceNeck=launchSourcePoint(126,149,pose,concept,flight);
  const point=(x:number,y:number)=>{
    const p=launchSourcePoint(x,y,pose,concept,flight),w=Math.max(0,Math.min(1,(y-57)/92));
    return `${(p[0]+amount*((tip[0]-sourceTip[0])*(1-w)+(neck[0]-sourceNeck[0])*w)).toFixed(3)} ${(p[1]+amount*((tip[1]-sourceTip[1])*(1-w)+(neck[1]-sourceNeck[1])*w)).toFixed(3)}`;
  };
  return `M ${point(...EMBER_MODEL.crescentStart)} ${EMBER_MODEL.crescent.map(s=>`C ${point(s[0],s[1])} ${point(s[2],s[3])} ${point(s[4],s[5])}`).join(" ")} Z`;
}
/** Foreground left arm, attached at the right shoulder in screen space. */
export function launchForearm(pose:EmberPose,amount:number,flight=0,crease=false): string {
  const concept="race-launch",target=glyph(knots[concept][2]);
  const point=(x:number,y:number)=>{
    const swung=rotateEmberPoint(x,y,EMBER_MODEL.joints.armRight,135*clamp(flight));
    const p=launchSourcePoint(swung[0],swung[1],pose,concept,flight);
    return `${(p[0]+(target[0]-p[0])*amount).toFixed(3)} ${(p[1]+(target[1]-p[1])*amount).toFixed(3)}`;
  };
  return crease
    ? `M ${point(210,200)} C ${point(216,207)} ${point(226,210)} ${point(233,220)} C ${point(237,227)} ${point(247,234)} ${point(253,236)}`
    : `M ${point(253,236)} C ${point(260,229)} ${point(269,218)} ${point(263,206)} C ${point(259,194)} ${point(244,184)} ${point(219,184)} C ${point(211,184)} ${point(205,192)} ${point(210,200)} C ${point(216,207)} ${point(226,210)} ${point(233,220)} C ${point(237,227)} ${point(247,234)} ${point(253,236)} Z`;
}
