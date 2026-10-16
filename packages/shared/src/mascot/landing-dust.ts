import type { EmberNode } from "./scene";

/** Small deterministic skid burst; age is 0–1, undefined means no impact. */
export function landingDustNodes(age?:number,origin:readonly [number,number]=[156,365]): EmberNode[] {
  if(age===undefined || !Number.isFinite(age) || age<=0 || age>=1)return [];
  const t=Math.max(0,Math.min(1,age)),alpha=Math.min(1,t*12)*(1-t)**2;
  const fill="#d7b995";
  const children:EmberNode[]=[
    {tag:"ellipse",attrs:{cx:156-36*t,cy:365-7*t,rx:4+24*t,ry:2+6*t,fill,opacity:.22}},
    {tag:"path",attrs:{d:`M ${155-65*t} 368 Q ${143-35*t} ${363-7*t} 165 366`,fill:"none",stroke:fill,strokeWidth:2,strokeLinecap:"round",opacity:.45}},
    ...[0,1,2,3,4].map(i=>({tag:"circle" as const,attrs:{cx:158-(26+i*16)*t,cy:365-(26+i*6)*t+43*t*t,r:1.4+(i%3)*.7,fill,opacity:.48}})),
    {tag:"circle",attrs:{cx:168+22*t,cy:365-23*t+33*t*t,r:1.5,fill,opacity:.35}},
  ];
  return [{tag:"g",attrs:{transform:`translate(${origin[0]-156} ${origin[1]-365})`,opacity:Number(alpha.toFixed(3))},children}];
}
