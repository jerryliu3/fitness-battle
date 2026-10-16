"use client";

import { useEffect, useRef, useState } from "react";
import { sampleEmberLaunch, sampleEmberSkid, emberSkidWordmarkLayout, type EmberLaunchConcept } from "@fitness-battle/shared/mascot";
import type { BootLayout } from "@fitness-battle/shared/boot";
import { Ember } from "@/components/mascot/ember";
import "@/shell/boot-splash.css";

type Layout = BootLayout & {homeX:number;homeY:number};
/** A separate authoring copy: no changes to the current production splash. */
export function LaunchWordmark({progress,concept,returnToK,reducedMotion,sliding=false}:{progress:number;concept:EmberLaunchConcept;returnToK:boolean;reducedMotion:boolean;sliding?:boolean}) {
  const stage=useRef<HTMLDivElement>(null),word=useRef<HTMLDivElement>(null),letters=useRef<HTMLSpanElement>(null),slot=useRef<HTMLSpanElement>(null),e=useRef<HTMLSpanElement>(null);
  const [layout,setLayout]=useState<Layout|null>(null);
  useEffect(()=>{
    const measure=()=>{
      if(!stage.current||!word.current||!letters.current||!slot.current||!e.current)return;
      const font=parseFloat(getComputedStyle(word.current).fontSize),box=stage.current.getBoundingClientRect(),seat=slot.current.getBoundingClientRect();
      setLayout({font,overtaWidth:letters.current.getBoundingClientRect().width,slotWidth:seat.width,eWidth:e.current.getBoundingClientRect().width,homeX:seat.left-box.left+font*.4085,homeY:box.bottom-seat.bottom+font*(.171-.88*55/360)});
    };
    const observer=new ResizeObserver(measure);observer.observe(stage.current!);measure();
    let alive=true;void document.fonts.ready.then(()=>{if(alive)measure();});
    return()=>{alive=false;observer.disconnect();};
  },[]);
  const options={layout:layout??undefined,returnToK};
  const frame=sliding?sampleEmberSkid(progress,options):sampleEmberLaunch(progress,concept,options);
  const eDistance=sliding?emberSkidWordmarkLayout(layout??undefined).eDistance:(layout?.slotWidth??0);
  const size=(layout?.font??1)*.88*frame.scale;
  return <div className="boot-splash" role="img" aria-label={`${concept==="crest-launch"?"Crest first":"Race start"} loading study, ${frame.phase}`}>
    <div ref={stage} className="boot-splash-stage">
      <div ref={word} className="boot-splash-word" aria-hidden="true">
        <span ref={letters} className="boot-splash-letters">OVERTA</span><span ref={slot} className="boot-splash-slot"><span className="boot-splash-strut">A</span></span><span ref={e} className="boot-splash-e" style={{transform:`translateX(${-eDistance*frame.eShift}px)`}}>E</span>
      </div>
      <span className="boot-splash-ember-fly" style={{visibility:layout?"visible":"hidden",left:(layout?.homeX??0)+frame.x,bottom:(layout?.homeY??0)-frame.y,width:size,height:size*485/360,zIndex:frame.depth<0?1:3,transform:`translate(-50%,0) scale(${frame.facing},1)`}} aria-hidden="true">
        <Ember morph={frame.morph} morphConcept={concept} launchFlight={frame.flight} launchCrouch={frame.crouch} launchSkid={"skid" in frame?Number(frame.skid):0} pose={frame.pose} skidSpray={reducedMotion?undefined:("spray" in frame?frame.spray as number|undefined:undefined)} landingDust={reducedMotion?undefined:frame.landingDust} shadow={false}/>
      </span>
    </div>
  </div>;
}
