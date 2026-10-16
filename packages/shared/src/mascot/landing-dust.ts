import type { EmberNode } from "./scene";

/** A leg's deterministic skid plume; age is 0–1, undefined means no impact. */
export function landingDustNodes(age?:number,origin:readonly [number,number]=[156,365],spreadDirection:-1|1=-1): EmberNode[] {
  if(age===undefined || !Number.isFinite(age) || age<=0 || age>=1)return [];
  const t=Math.max(0,Math.min(1,age)),spread=1-(1-t)**3;
  const alpha=Math.min(1,t*20)*(1-t)**1.4,fill="#e4cba7";
  const children:EmberNode[]=[
    {tag:"ellipse",attrs:{cx:-34*spread,cy:-5*spread,rx:8+25*spread,ry:4+8*spread,fill,opacity:.45}},
    {tag:"ellipse",attrs:{cx:-14-48*spread,cy:-9-17*spread,rx:6+13*spread,ry:5+10*spread,fill,opacity:.3}},
    {tag:"path",attrs:{d:`M ${-96*spread} 4 Q ${-46*spread} ${-9*spread} 6 1`,fill:"none",stroke:fill,strokeWidth:3.5,strokeLinecap:"round",opacity:.8}},
    ...[0,1,2,3,4,5,6,7].map(i=>({tag:"circle" as const,attrs:{cx:-(30+i*13)*spread,cy:-(25+(i%4)*12)*spread+45*t*t,r:4+(i%3)*1.4,fill,opacity:.85}})),
    {tag:"circle",attrs:{cx:29*spread,cy:-34*spread+35*t*t,r:4.5,fill,opacity:.7}},
    {tag:"circle",attrs:{cx:48*spread,cy:-20*spread+28*t*t,r:3.5,fill,opacity:.6}},
  ];
  return [{tag:"g",attrs:{transform:`translate(${origin[0]} ${origin[1]}) scale(${-spreadDirection} 1)`,opacity:Number(alpha.toFixed(3))},children}];
}
