import { useId, type CSSProperties } from "react";
import type { MaterialConcept } from "./material-concepts";

function Form({ concept, ...paint }: { concept: MaterialConcept; fill?: string; stroke?: string; strokeWidth?: number; opacity?: number }) {
  if (concept.shape === "pill") return <rect x={-20} y={-29} width={40} height={58} rx={20} {...paint}/>;
  if (concept.shape === "squircle") return <path d="M0-24C18-24 24-18 24 0S18 24 0 24-24 18-24 0-18-24 0-24Z" {...paint}/>;
  if (concept.shape === "lozenge") return <path d="M-7-25Q0-32 7-25L25-7Q32 0 25 7L7 25Q0 32-7 25L-25 7Q-32 0-25-7Z" {...paint}/>;
  if (concept.shape === "drop") return <path d="M0-30C-5-24-23-10-23 5A23 23 0 0 0 23 5C23-10 5-24 0-30Z" {...paint}/>;
  return <circle r={23} {...paint}/>;
}

/** Study-only vector optics: shared by icon and lane, with no native-glass dependency. */
export function MaterialRacer({ concept, x, y, radius = 23, fast, dark = false, flow = false, light = 0, edge, label }: { concept: MaterialConcept; x: number; y: number; radius?: number; fast: boolean; dark?: boolean; flow?: boolean; light?: number; edge?: string | null; label?: string }) {
  const id = useId().replaceAll(":", "");
  const gold = fast;
  const color = gold ? "#dfad3c" : "#9fa5af";
  const hi = gold ? "#fff2ba" : "#f4f8ff";
  const low = gold ? "#886012" : "#4a5668";
  const bg = dark ? "#000000" : "#fff";
  const { id: material } = concept;
  const clear = material === "lucent" || material === "capsule";
  const solid = material === "alloy" || material === "ceramic" || material === "foil";
  const loop = material === "torus";
  const count = fast ? 6 : 4;
  const length = fast ? 117.55 : 65.55;
  const duration = fast ? 1.15 : 1.32;
  const stops = material === "frost" ? [[0,"#ffffff"],[.4,gold?"#fff4ce":"#f0f4f7"],[.8,gold?"#efdca4":"#cdd5dd"],[1,color]] : material === "alloy" ? [[0,low],[.24,color],[.44,hi],[.57,color],[.8,low],[1,color]] : material === "foil" ? [[0,low],[.28,color],[.46,hi],[.51,gold?"#fae8a3":"#d9e5ff"],[.57,gold?"#cb9ec2":"#a7d9d9"],[.64,color],[1,low]] : material === "ceramic" ? [[0,hi],[.22,color],[.72,color],[1,low]] : material === "opal" ? [[0,hi],[.32,gold?"#fff8e5":"#eff5ff"],[.55,gold?"#e6d4b8":"#ddd8ef"],[.75,hi],[1,color]] : [[0,hi],[.35,color],[.74,color],[1,low]];
  return <g transform={`translate(${x} ${y}) scale(${radius / 23})`} data-material-racer={fast ? "gold" : "silver"}>
    <defs>
      <linearGradient id={`${id}-body`} x1={-.5 + light * .2} y1="0" x2={.9 + light * .2} y2="1">{stops.map(([offset,paint],i)=><stop key={i} offset={offset} stopColor={paint as string} stopOpacity={clear ? ([.72,.42,.24,.65][i] ?? .4) : 1}/>)}</linearGradient>
      <linearGradient id={`${id}-rim`} x1="0" y1="0" x2="1" y2="1"><stop stopColor={hi}/><stop offset=".27" stopColor={color}/><stop offset=".5" stopColor={dark ? "#fff" : low}/><stop offset=".7" stopColor={color}/><stop offset="1" stopColor={hi}/></linearGradient>
      <linearGradient id={`${id}-shine`} gradientUnits="userSpaceOnUse" x1={-38+light*36} y1="-25" x2={25+light*36} y2="18"><stop stopColor="white" stopOpacity="0"/><stop offset=".36" stopColor="white" stopOpacity="0"/><stop offset=".48" stopColor="white" stopOpacity={material === "frost" ? .35 : .8}/><stop offset=".57" stopColor="white" stopOpacity="0"/><stop offset="1" stopColor="white" stopOpacity="0"/></linearGradient>
      <linearGradient id={`${id}-fade`} x1="0" y1="0" x2="0" y2="1"><stop stopColor="white"/><stop offset="1" stopColor="white" stopOpacity="0"/></linearGradient>
      <mask id={`${id}-wake`} maskUnits="userSpaceOnUse" x="-35" y="-35" width="70" height={length+75}><rect x="-35" y="-29" width="70" height={length+59} fill={`url(#${id}-fade)`}/></mask>
      <clipPath id={`${id}-clip`}><Form concept={concept}/></clipPath>
      <filter id={`${id}-shadow`} x="-50%" y="-50%" width="200%" height="220%"><feDropShadow dx="0" dy={solid ? 2.5 : 1.5} stdDeviation={solid ? 1.8 : 1.1} floodColor={low} floodOpacity={dark ? .4 : .18}/></filter>
      <pattern id={`${id}-grain`} width="3" height="3" patternUnits="userSpaceOnUse"><path d="M0 .4H3" stroke={hi} strokeOpacity=".22" strokeWidth=".35"/></pattern>
    </defs>
    <g mask={`url(#${id}-wake)`}>{Array.from({length:count},(_,i)=><g key={i} className={flow ? "pass-flow-echo" : undefined} style={{transform:`translateY(${length*(i+1)/count}px)`,opacity:.6*(1-i/(count+1)),"--echo-distance":`${length}px`,animationDuration:`${duration}s`,animationDelay:`${-duration*i/count}s`} as CSSProperties}>
      <Form concept={concept} fill={clear || material === "opal" || material === "frost" ? color : "none"} opacity={clear ? .24 : .55} stroke={color} strokeWidth={loop ? 2.8 : 1.2}/>
      {clear && <Form concept={concept} fill="none" stroke={hi} strokeWidth={.45} opacity={.6}/>}
    </g>)}</g>
    <g filter={`url(#${id}-shadow)`}>
      {loop ? <><circle r="23" fill={bg} fillOpacity=".8" stroke={`url(#${id}-body)`} strokeWidth="8"/><circle r="26.7" fill="none" stroke={`url(#${id}-rim)`} strokeWidth="1.1"/><circle r="19.3" fill="none" stroke={color} strokeWidth=".8"/><path d="M-22-7A23 23 0 0 1 5-22" fill="none" stroke={hi} strokeWidth="2" strokeLinecap="round" opacity=".9"/></> : <>
        <Form concept={concept} fill={`url(#${id}-body)`} stroke={`url(#${id}-rim)`} strokeWidth={solid ? 2 : 1.5}/>
        <g clipPath={`url(#${id}-clip)`}>
          {clear && <path d="M-32 11Q-3-3 31 8M-31 16Q-3 2 31 13" fill="none" stroke={color} strokeWidth="2" opacity=".28"/>}
          {material === "alloy" && <rect x="-35" y="-35" width="70" height="70" fill={`url(#${id}-grain)`}/>}
          {material === "foil" && <><path d="M-30-3 0-29 5 4Z" fill={hi} opacity=".35"/><path d="m5 4 25-5L0 30Z" fill={low} opacity=".3"/></>}
          {material === "opal" && <ellipse cx={-6+light*7} cy="-4" rx="14" ry="23" fill="white" opacity=".28"/>}
          {clear || material === "ceramic" || material === "frost" ? <ellipse cx={-10+light*13} cy="-14" rx={material === "frost" ? 18 : 12} ry={material === "frost" ? 12 : 18} fill="white" opacity={material === "frost" ? .32 : .28}/> : <rect x="-35" y="-35" width="70" height="70" fill={`url(#${id}-shine)`}/> }
          <path d="M-15-14Q-7-24 6-20" fill="none" stroke="white" strokeWidth={material === "frost" ? 3.5 : 1.6} strokeLinecap="round" opacity={material === "ceramic" ? .8 : .6}/>
          <path d="M-23 14Q0 35 24 12" fill="none" stroke={low} strokeWidth="3" opacity=".15"/>
        </g>
      </>}
    </g>
    {(edge || label) && <text x="0" y="3" textAnchor="middle" fill={solid ? (gold ? "#4a3308" : "#29313a") : dark ? "#f4f5f6" : "#343d40"} stroke={solid ? "none" : bg} strokeWidth={solid ? 0 : 1.8} paintOrder="stroke" fontSize="9" fontWeight="800">{edge || label}</text>}
  </g>;
}

export function MaterialIcon({concept,dark=false,size=256,light=0,flow=false,unmasked=false}: {concept:MaterialConcept;dark?:boolean;size?:number;light?:number;flow?:boolean;unmasked?:boolean}) {
  const id=useId();
  return <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 256 256" role="img" aria-label={`${concept.name} · ${dark ? "black" : "white"} app icon`}>
    <defs><clipPath id={`${id}-tile`}><rect width="256" height="256" rx="57"/></clipPath></defs><g clipPath={unmasked?undefined:`url(#${id}-tile)`}>
      <rect width="256" height="256" fill={dark?"#000000":"#ffffff"}/>
      <MaterialRacer concept={concept} x={74} y={145} radius={31.05} fast={false} dark={dark} light={light} flow={flow}/>
      <MaterialRacer concept={concept} x={182} y={93} radius={31.05} fast dark={dark} light={light} flow={flow}/>
    </g>
  </svg>;
}
