"use client";

import {useEffect,useRef,useState} from "react";
import Link from "next/link";
import {EMBER_LAUNCH_DURATION,EMBER_BRAKE_START,sampleEmberLaunch,type EmberLaunchConcept} from "@fitness-battle/shared/mascot";
import {Ember} from "@/components/mascot/ember";
import {LaunchWordmark} from "./launch-wordmark";
import styles from "./launch-study.module.css";

const concept:EmberLaunchConcept="crest-launch";
function useLaunchClock() {
  const [progress,setProgress]=useState(.18),[playing,setPlaying]=useState(false),[reduced,setReduced]=useState(true);
  const frameRef=useRef(0),started=useRef(0),active=useRef(false);
  const publish=(value:number)=>{setProgress(value);};
  const stop=()=>{cancelAnimationFrame(frameRef.current);active.current=false;setPlaying(false);};
  const seek=(value:number)=>{stop();publish(value);};
  const play=()=>{
    stop();
    if(matchMedia("(prefers-reduced-motion: reduce)").matches){publish(1);return;}
    publish(0);started.current=performance.now();active.current=true;setPlaying(true);
    const tick=(now:number)=>{
      if(!active.current)return;
      const value=Math.min(1,(now-started.current)/EMBER_LAUNCH_DURATION);publish(value);
      if(value<1)frameRef.current=requestAnimationFrame(tick);else stop();
    };
    frameRef.current=requestAnimationFrame(tick);
  };
  useEffect(()=>{
    const media=matchMedia("(prefers-reduced-motion: reduce)");
    const preference=()=>{setReduced(media.matches);if(media.matches){stop();publish(1);}};
    const visibility=()=>{if(document.hidden)stop();};
    preference();media.addEventListener("change",preference);document.addEventListener("visibilitychange",visibility);
    return()=>{cancelAnimationFrame(frameRef.current);active.current=false;media.removeEventListener("change",preference);document.removeEventListener("visibilitychange",visibility);};
  },[]);
  return {progress,playing,reduced,play,seek};
}
function CharacterStage({concept,progress,reducedMotion}:{concept:EmberLaunchConcept;progress:number;reducedMotion:boolean}) {
  const frame=sampleEmberLaunch(progress,concept);
  return <div className={styles.characterStage} role="img" aria-label={`${concept==="crest-launch"?"Crest first":"Race start"}, ${frame.phase}`}>
    <div className={styles.character} style={{transform:`translate(calc(-50% + ${frame.x*12}px), ${frame.y*45-frame.flight*26}px) scale(${frame.scale*frame.facing},${frame.scale})`}}>
      <Ember pose={frame.pose} morph={frame.morph} morphConcept={concept} launchFlight={frame.flight} launchCrouch={frame.crouch} landingDust={reducedMotion?undefined:frame.landingDust} shadow={false}/>
    </div>
  </div>;
}
export function LaunchStudy() {
  const clock=useLaunchClock();
  const [returnToK,setReturnToK]=useState(true);
  const [compareOld,setCompareOld]=useState(false);
  const frame=sampleEmberLaunch(clock.progress,concept);
  return <main className={styles.page}>
    <header className={styles.top}><Link href="/design/mascot/motion">← Original morph study</Link><span>FOLLOW-UP / LAUNCH & LANDING</span></header>
    <p className={styles.eyebrow}>CREST FIRST / LOAD. LAUNCH. SKID.</p><h1>A little crouch.<br/>A lot of momentum.</h1>
    <p className={styles.intro}>Bend the knees, spring into flight, then accelerate across the word. Feet down at full speed. A hard skid, dust from both legs, and the same familiar stance.</p>
    <div className={styles.toolbar}><button onClick={clock.play}>Replay crest first · 4.8 s ↗</button><label>Sequence time<input type="range" aria-label="Launch sequence time" min="0" max="1" step="0.001" value={clock.progress} onChange={event=>clock.seek(Number(event.target.value))}/></label><output aria-live="off">{(clock.progress*4.8).toFixed(2)} s · {frame.phase}</output></div>
    <div className={styles.beats} aria-label="Sequence checkpoints">{[[0,"K"],[.18,"Launch stance"],[.232,"Crouch"],[.285,"Jump"],[.665,"Fast pass"],[EMBER_BRAKE_START+.015,"Skid"],[.85,"Landed"]].map(([p,label])=><button key={label} aria-pressed={Math.abs(clock.progress-Number(p))<.01} onClick={()=>clock.seek(Number(p))}>{label}</button>)}</div>
    <section className={styles.cards} aria-label="Crest first launch">
      <article className={styles.card}><span className={styles.number}>CREST FIRST / HELD STANCE</span><h2>Load. Launch. Skid.</h2><p>Feet planted for the crouch. A spring into the air. Keep flying until the feet hit, then brake.</p><CharacterStage concept={concept} progress={clock.progress} reducedMotion={clock.reduced}/><footer><span>{frame.phase}</span><b>Same pose before & after</b></footer></article>
    </section>
    <p className={styles.caption}>Ember finishes in the original crest-first launch stance. The wordmark below can then fold that stance directly back into the K.</p>
    <section className={styles.wordmark} aria-label="Launch and landing wordmark preview"><div className={styles.wordmarkHeading}><h2>In the wordmark.</h2><label className={styles.check}><input type="checkbox" checked={returnToK} onChange={e=>setReturnToK(e.target.checked)}/> Return to K</label></div><div className={styles.wordmarkStage}><LaunchWordmark progress={clock.progress} concept={concept} returnToK={returnToK} reducedMotion={clock.reduced}/></div><div className={styles.toolbar}><button onClick={clock.play}>Replay wordmark ↗</button><label>Wordmark sequence<input type="range" aria-label="Wordmark sequence time" min="0" max="1" step="0.001" value={clock.progress} onChange={e=>clock.seek(Number(e.target.value))}/></label></div></section>
    <section className={styles.reference}><button onClick={()=>setCompareOld(value=>!value)} aria-expanded={compareOld}> {compareOld?"Hide":"Show"} original neutral endpoint</button>{compareOld?<div className={styles.oldPoses}><div><Ember morph={0} morphConcept="crest-first" shadow={false}/><p>Crest first · original endpoint</p></div></div>:null}<p><Link href="/design/mascot/motion">The complete original study remains available →</Link></p></section>
    <p className={styles.caption}>Replay is finite and stops in the background. Reduced Motion skips automatic travel and dust; the scrubber remains available for inspecting individual poses.</p>
  </main>;
}
