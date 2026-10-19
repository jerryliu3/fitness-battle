import { useId, type CSSProperties } from "react";
import type { GlassConcept } from "./glass-concepts";

function outline(concept:GlassConcept,inset=0){
  if(concept.shape==="circle")return `M${23-inset} 0a${23-inset} ${23-inset} 0 1 0 ${-2*(23-inset)} 0a${23-inset} ${23-inset} 0 1 0 ${2*(23-inset)} 0Z`;
  const w=(concept.glass.tall?18:20)-inset,h=(concept.glass.tall?33:29)-inset;
  return `M${-w} ${-h+w}a${w} ${w} 0 0 1 ${2*w} 0V${h-w}a${w} ${w} 0 0 1 ${-2*w} 0Z`;
}

/** A constant-opacity sheet. Only the narrow boundary is lit; the face has no texture or gradient. */
export function UniformGlassHead({concept,fast,light=0,echo=false}: {concept:GlassConcept;fast:boolean;light?:number;echo?:boolean}){
  const id=useId();const g=concept.glass;
  const color=fast?g.gold:g.silver;
  const outer=outline(concept),inner=g.ring?outline(concept,g.ring):"";
  const edgeWidth=echo?g.rim*.65:g.rim;
  return <g data-uniform-glass="true">
    <defs><linearGradient id={`${id}-edge`} x1={.05+light*.18} y1="0" x2={.9+light*.18} y2="1"><stop stopColor="white" stopOpacity={g.edge}/><stop offset=".38" stopColor="white" stopOpacity=".08"/><stop offset=".7" stopColor={color} stopOpacity=".4"/><stop offset="1" stopColor="white" stopOpacity={g.edge*.65}/></linearGradient></defs>
    <path d={`${outer}${inner}`} fill={color} fillOpacity={g.opacity} fillRule="evenodd" data-glass-face="uniform"/>
    <path d={outer} fill="none" stroke={color} strokeWidth={edgeWidth} strokeOpacity=".65"/>
    <path d={outline(concept,.7)} fill="none" stroke={`url(#${id}-edge)`} strokeWidth={edgeWidth} opacity={echo ? .45 : 1}/>
    {g.ring>0&&<path d={inner} fill="none" stroke={color} strokeWidth={edgeWidth*.7} strokeOpacity=".5"/>}
  </g>;
}

export function UniformGlassRacer({concept,x,y,radius=23,fast,dark=false,flow=false,light=0,edge,label}: {concept:GlassConcept;x:number;y:number;radius?:number;fast:boolean;dark?:boolean;flow?:boolean;light?:number;edge?:string|null;label?:string}){
  const count=fast?6:4,length=fast?117.55:65.55,duration=fast?1.15:1.32;
  return <g transform={`translate(${x} ${y}) scale(${radius/23})`} data-material-racer={fast?"gold":"silver"}>
    {Array.from({length:count},(_,i)=><g key={i} className={flow?"pass-flow-echo glass-flow-echo":undefined} style={{transform:`translateY(${length*(i+1)/count}px)`,opacity:concept.glass.echo*(1-i/(count+1)),"--echo-distance":`${length}px`,"--glass-opacity":concept.glass.echo,animationDuration:`${duration}s`,animationDelay:`${-duration*i/count}s`} as CSSProperties}><UniformGlassHead concept={concept} fast={fast} light={light} echo/></g>)}
    <UniformGlassHead concept={concept} fast={fast} light={light}/>
    {(edge||label)&&<text x="0" y="3" textAnchor="middle" fill={dark?"#f4f5f6":"#343d40"} stroke={dark?"#000":"#fff"} strokeWidth="1.8" paintOrder="stroke" fontSize="9" fontWeight="800">{edge||label}</text>}
  </g>;
}

export function GlassOverlap({concept,dark=false,overlap=1,light=0,size=260}: {concept:GlassConcept;dark?:boolean;overlap?:number;light?:number;size?:number}){
  const separation=96-68*overlap;
  return <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size*.62} viewBox="0 0 240 148" role="img" aria-label={`${concept.name}: two translucent pieces ${overlap>.5?"overlap":"separate"}`}>
    <rect width="240" height="148" rx="16" fill={dark?"#000":"#fff"}/>
    <g transform={`translate(${120-separation/2} 83) scale(1.5)`}><UniformGlassHead concept={concept} fast={false} light={light}/></g>
    <g transform={`translate(${120+separation/2} 65) scale(1.5)`}><UniformGlassHead concept={concept} fast light={light}/></g>
  </svg>;
}
