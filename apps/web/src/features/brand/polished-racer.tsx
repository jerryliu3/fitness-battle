"use client";
import {createElement,useEffect,useId,useState,type RefObject} from "react";
import {polishedCapsulePath,polishedCapsuleScene,polishedLaneScale,type CapsuleNode} from "@fitness-battle/shared";

function draw(node:CapsuleNode,key:number):React.ReactNode{
  const {maskType,...attrs}=node.attrs;
  return createElement(node.tag,{...attrs,...(maskType?{style:{maskType}}:{}),key},node.children?.map(draw));
}
export function PolishedRacer({x,y,you,time,active=false}: {x:number;y:number;you:boolean;time?:number;active?:boolean}){
  const id=useId();
  return <g transform={`translate(${x} ${y}) scale(${polishedLaneScale(you)})`} pointerEvents="none" data-polished-racer={you?"gold":"platinum"}>
    {polishedCapsuleScene(id,you,time).map(draw)}
    {active&&!you&&<path d={polishedCapsulePath(-3)} fill="none" stroke="#282f2c" strokeWidth="1.5"/>}
  </g>;
}

/** One clock for the field; pause for reduced motion, hidden tabs and offscreen fields. */
export function usePolishedWakeTime(host:RefObject<HTMLDivElement|null>){
  const [time,setTime]=useState<number|undefined>(undefined);
  useEffect(()=>{
    const media=window.matchMedia("(prefers-reduced-motion: reduce)");
    let raf=0,inView=true;
    const update=()=>{
      cancelAnimationFrame(raf);
      if(media.matches||document.hidden||!inView){setTime(undefined);return;}
      const start=performance.now();let published=0;
      const tick=(now:number)=>{if(now-published>=1000/30){published=now;setTime((now-start)/1000);}raf=requestAnimationFrame(tick);};
      raf=requestAnimationFrame(tick);
    };
    const observer=typeof IntersectionObserver==="undefined"?null:new IntersectionObserver(entries=>{inView=entries[0]?.isIntersecting??true;update();});
    if(host.current)observer?.observe(host.current);
    media.addEventListener("change",update);document.addEventListener("visibilitychange",update);update();
    return ()=>{cancelAnimationFrame(raf);observer?.disconnect();media.removeEventListener("change",update);document.removeEventListener("visibilitychange",update);};
  },[host]);
  return time;
}
