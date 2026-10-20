import { useId } from "react";
import {mixColor} from "./finish-colors";
import {capsuleOutline,SatinWake,wakeOutline} from "./satin-wake";
import type { GlassConcept } from "./glass-concepts";

function outline(concept:GlassConcept,inset=0){
  if(concept.shape==="circle")return `M${23-inset} 0a${23-inset} ${23-inset} 0 1 0 ${-2*(23-inset)} 0a${23-inset} ${23-inset} 0 1 0 ${2*(23-inset)} 0Z`;
  return capsuleOutline(inset,concept.glass.tall);
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
    {g.rimStyle&&<GlassRim concept={concept} color={color} light={light}/>}
    {g.ring>0&&<path d={inner} fill="none" stroke={color} strokeWidth={edgeWidth*.7} strokeOpacity=".5"/>}
  </g>;
}

function GlassRim({concept,color,light}: {concept:GlassConcept;color:string;light:number}){
  const id=useId(),style=concept.glass.rimStyle;
  const width=style==="rolled"?2.8:style==="bevel"?2.1:3.4;
  return <g data-glass-rim={style}>
    <defs>
      <linearGradient id={`${id}-bevel`} x1={.12+light*.1} y1="0" x2=".84" y2="1">
        <stop stopColor="white" stopOpacity=".94"/><stop offset=".24" stopColor="white" stopOpacity={style==="rolled"?.56:.8}/>
        <stop offset=".48" stopColor={color} stopOpacity=".08"/><stop offset=".74" stopColor={mixColor(color,"#000000",.38)} stopOpacity=".44"/>
        <stop offset="1" stopColor="white" stopOpacity={style==="meniscus"?.8:.4}/>
      </linearGradient>
      <linearGradient id={`${id}-crest`} x1="0" y1="0" x2=".65" y2="1"><stop stopColor="white" stopOpacity=".95"/><stop offset=".4" stopColor="white" stopOpacity=".45"/><stop offset=".7" stopColor="white" stopOpacity="0"/><stop offset="1" stopColor="white" stopOpacity=".5"/></linearGradient>
    </defs>
    <path d={outline(concept,.25)} fill="none" stroke={color} strokeOpacity=".35" strokeWidth=".8"/>
    <path d={outline(concept,width/2+.2)} fill="none" stroke={`url(#${id}-bevel)`} strokeWidth={width}/>
    <path d={outline(concept,style==="bevel"?2:1)} fill="none" stroke={`url(#${id}-crest)`} strokeWidth={style==="rolled"?.65:.85}/>
    {style==="meniscus"&&<path d={outline(concept,3.5)} fill="none" stroke={color} strokeWidth=".6" strokeOpacity=".23"/>}
  </g>;
}

export function UniformGlassRacer({concept,x,y,radius=23,fast,dark=false,flow=false,light=0,edge,label}: {concept:GlassConcept;x:number;y:number;radius?:number;fast:boolean;dark?:boolean;flow?:boolean;light?:number;edge?:string|null;label?:string}){
  return <g transform={`translate(${x} ${y}) scale(${radius/23})`} data-material-racer={fast?"gold":"silver"}>
    <SatinWake color={fast?concept.glass.gold:concept.glass.silver} fast={fast} flow={flow} outline={wakeOutline(concept.shape,concept.glass.tall)} profile={concept.glass.wakeProfile}/>
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
