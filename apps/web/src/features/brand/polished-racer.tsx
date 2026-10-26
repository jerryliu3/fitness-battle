"use client";
import {memo,createElement,useEffect,useId,useState,type RefObject} from "react";
import {polishedCapsulePath,polishedCapsuleScene,polishedLaneScale,type CapsuleNode} from "@fitness-battle/shared";

import { LocalWake } from "./local-wake";

function draw(node:CapsuleNode,key:number):React.ReactNode{
  const {maskType,...attrs}=node.attrs;
  return createElement(node.tag,{...attrs,...(maskType?{style:{maskType}}:{}),key},node.children?.map(draw));
}
export const PolishedRacer = memo(function PolishedRacer({
  x, y, you, gold = you, time, active = false, showWake = true, wakeBottom, sizeScale, independentWake = false, animateWake = true,
}: {
  x: number;
  y: number;
  you: boolean;
  gold?: boolean;
  time?: number;
  active?: boolean;
  showWake?: boolean;
  independentWake?: boolean;
  animateWake?: boolean;
  /** Distance from the head to the field's lower wake boundary, in field pixels. */
  wakeBottom?: number;
  sizeScale?: number;
}) {
  const id = useId();
  const scale = sizeScale ?? polishedLaneScale(you);
  const [defs, wake, ...head] = polishedCapsuleScene(id, gold, time, false, showWake && !independentWake);
  return <g transform={`translate(${x} ${y}) scale(${scale})`} pointerEvents="none" data-polished-racer={gold ? "gold" : "platinum"}>
    {draw(defs, 0)}
    {showWake && <g clipPath={wakeBottom === undefined ? undefined : `url(#${id}-wake-clip)`}>
      {wakeBottom !== undefined && <defs>
        <clipPath id={`${id}-wake-clip`}>
          <rect x={-40} y={-35} width={80} height={Math.max(0, wakeBottom / scale + 35)} />
        </clipPath>
      </defs>}
      {independentWake ? <LocalWake gold={gold} animate={animateWake} /> : draw(wake, 1)}
    </g>}
    {head.map(draw)}
    {active && !you && <path d={polishedCapsulePath(-3)} fill="none" stroke="#282f2c" strokeWidth="1.5" />}
  </g>;
});

/** One clock for the field; pause for reduced motion, hidden tabs and offscreen fields. */
export function usePolishedWakeTime(host:RefObject<HTMLDivElement|null>, enabled = true){
  const [time,setTime]=useState<number|undefined>(undefined);
  useEffect(()=>{
    const media=window.matchMedia("(prefers-reduced-motion: reduce)");
    let raf=0,inView=true;
    const update=()=>{
      cancelAnimationFrame(raf);
      if(!enabled||media.matches||document.hidden||!inView){setTime(undefined);return;}
      const start=performance.now();let published=0;
      const tick=(now:number)=>{if(now-published>=1000/30){published=now;setTime((now-start)/1000);}raf=requestAnimationFrame(tick);};
      raf=requestAnimationFrame(tick);
    };
    const observer=typeof IntersectionObserver==="undefined"?null:new IntersectionObserver(entries=>{inView=entries[0]?.isIntersecting??true;update();});
    if(host.current)observer?.observe(host.current);
    media.addEventListener("change",update);document.addEventListener("visibilitychange",update);update();
    return ()=>{cancelAnimationFrame(raf);observer?.disconnect();media.removeEventListener("change",update);document.removeEventListener("visibilitychange",update);};
  },[host,enabled]);
  return time;
}
