import {useId, type CSSProperties} from "react";

export type WakeProfile={goldCount:number;silverCount:number;goldLength:number;silverLength:number};

/** Capsule geometry shared by the glass face and the wake exclusion boundary. */
export function capsuleOutline(inset=0,tall=false){
  const w=(tall?18:20)-inset,h=(tall?33:29)-inset;
  return `M${-w} ${-h+w}a${w} ${w} 0 0 1 ${2*w} 0V${h-w}a${w} ${w} 0 0 1 ${-2*w} 0Z`;
}
export function wakeOutline(shape:string,tall=false){
  if(shape==="pill")return capsuleOutline(0,tall);
  if(shape==="squircle")return "M0-24C18-24 24-18 24 0S18 24 0 24-24 18-24 0-18-24 0-24Z";
  if(shape==="lozenge")return "M-7-25Q0-32 7-25L25-7Q32 0 25 7L7 25Q0 32-7 25L-25 7Q-32 0-25-7Z";
  if(shape==="drop")return "M0-30C-5-24-23-10-23 5A23 23 0 0 0 23 5C23-10 5-24 0-30Z";
  return "M23 0a23 23 0 1 0 -46 0a23 23 0 1 0 46 0Z";
}
/** One satin wake for every finish. The stationary mask follows the live curved outline,
 * including its rim, while the echoes flow underneath it. */
export function SatinWake({color,fast,flow=false,outline,profile}: {color:string;fast:boolean;flow?:boolean;outline:string;profile?:WakeProfile}){
  const id=useId(),count=profile?(fast?profile.goldCount:profile.silverCount):fast?6:4,length=profile?(fast?profile.goldLength:profile.silverLength):fast?117.55:65.55,duration=fast?1.15:1.32;
  return <g data-satin-wake={fast?"gold":"silver"}>
    <defs>
      <linearGradient id={`${id}-fade`} x1="0" y1="0" x2="0" y2="1"><stop stopColor="white"/><stop offset="1" stopColor="white" stopOpacity={profile ? .35 : 0}/></linearGradient>
      <mask id={`${id}-outside`} maskUnits="userSpaceOnUse" x="-40" y="-40" width="80" height={length+90} style={{maskType:"luminance"}}>
        <rect x="-40" y="-40" width="80" height={length+90} fill="white"/>
        <path d={outline} fill="black" stroke="black" strokeWidth="2.2"/>
      </mask>
      <mask id={`${id}-fade-mask`} maskUnits="userSpaceOnUse" x="-35" y="-35" width="70" height={length+75}><rect x="-35" y="-29" width="70" height={length+59} fill={`url(#${id}-fade)`}/></mask>
    </defs>
    <g mask={`url(#${id}-outside)`} data-wake-exclusion="curved-silhouette"><g mask={`url(#${id}-fade-mask)`}>{Array.from({length:count},(_,i)=><g key={i} className={flow?"pass-flow-echo":undefined} style={{transform:`translateY(${length*(i+1)/count}px)`,opacity:.6*(1-i/(count+1)),"--echo-distance":`${length}px`,animationDuration:`${duration}s`,animationDelay:`${-duration*i/count}s`} as CSSProperties}>
      <path d={outline} fill={color} opacity=".55" stroke={color} strokeWidth="1.2"/>
    </g>)}</g></g>
  </g>;
}
