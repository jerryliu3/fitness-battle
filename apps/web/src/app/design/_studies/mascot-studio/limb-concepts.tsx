"use client";

import { useEffect, useRef, useState } from "react";
import {
  EMBER_MODEL, EMBER_REST, EMBER_LIMB_PREVIEW_DURATION, emberLimbMarkers, sampleLimbMorphPreview,
  type EmberLimb, type EmberLimbConcept,
} from "@fitness-battle/shared/mascot";
import { Ember } from "@/components/mascot/ember";
import styles from "./limb-concepts.module.css";

const identity: Record<EmberLimb, { label: string; short: string; color: string }> = {
  crest: { label: "Hair", short: "H", color: "#ed89a9" },
  leftArm: { label: "Left arm", short: "LA", color: "#82b6ff" },
  leftLeg: { label: "Left leg", short: "LL", color: "#c3ef72" },
  rightLeg: { label: "Right leg", short: "RL", color: "#ffad71" },
  rightArm: { label: "Right arm", short: "RA", color: "#c6a2ff" },
};
const concepts: { id: EmberLimbConcept; title: string; note: string; branches: EmberLimb[][] }[] = [
  { id: "crest-first", title: "Crest first", note: "The right arm stays by the right leg, then swings free.", branches: [["crest"],["leftArm"],["rightArm","rightLeg"],["leftLeg"]] },
  { id: "race-start", title: "Race start", note: "The left arm and bent left leg gather, then open out.", branches: [["rightArm"],["crest"],["rightLeg"],["leftArm","leftLeg"]] },
];

function ConceptCard({ concept, compareRun, guides }: { concept: typeof concepts[number]; compareRun: number; guides: boolean }) {
  const [progress,setProgress] = useState(0);
  const [run,setRun] = useState(0);
  const [playing,setPlaying] = useState(false);
  const stopRef = useRef<() => void>(()=>{});
  useEffect(() => {
    if(compareRun===0 && run===0) return;
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    if(media.matches) { setProgress(1); setPlaying(false); return; }
    let raf=0;
    const start=performance.now();
    setPlaying(true);
    setProgress(0);
    const stop = () => { cancelAnimationFrame(raf); setPlaying(false); };
    stopRef.current = stop;
    const visibility = () => { if(document.hidden) stop(); };
    const preference = () => { if(media.matches) { stop(); setProgress(1); } };
    const tick = (now: number) => {
      setProgress(sampleLimbMorphPreview(now-start));
      if(now-start<EMBER_LIMB_PREVIEW_DURATION) raf=requestAnimationFrame(tick);
      else setPlaying(false);
    };
    raf=requestAnimationFrame(tick);
    document.addEventListener("visibilitychange",visibility);
    media.addEventListener("change",preference);
    return () => { cancelAnimationFrame(raf); stopRef.current=()=>{}; document.removeEventListener("visibilitychange",visibility); media.removeEventListener("change",preference); };
  },[compareRun,run]);
  const morph=1-progress;
  const markers=emberLimbMarkers({...EMBER_REST},morph,concept.id);
  return <article className={styles.card} aria-label={`${concept.title} morph concept`}>
    <header><div><span>CONCEPT {concept.id==="crest-first"?"01":"02"}</span><h3>{concept.title}</h3></div><button type="button" onClick={()=>setRun(value=>value+1)} aria-label={`Replay ${concept.title}`}>Replay ↗</button></header>
    <p className={styles.note}>{concept.note}</p>
    <div className={styles.stage} role="img" aria-label={`${concept.title}, ${Math.round(progress*100)}% unfolded`}>
      <Ember morph={morph} morphConcept={concept.id} shadow={false}/>
      {guides ? <svg className={styles.guides} viewBox={EMBER_MODEL.viewBox} aria-hidden="true">{markers.map(({limb,point:[x,y]})=>{
        const item=identity[limb], left=x<180;
        return <g key={limb}><circle cx={x} cy={y} r="5.5" fill={item.color} stroke="#24182f" strokeWidth="2"/><text x={x+(left?-12:12)} y={y+4} textAnchor={left?"end":"start"} fill={item.color}>{item.short}</text></g>;
      })}</svg> : null}
    </div>
    <label className={styles.scrub}><span>K <output aria-live="off">{playing?"Playing":`${Math.round(progress*100)}% unfolded`}</output> Ember</span><input type="range" min="0" max="1" step="0.001" aria-label={`Unfold ${concept.title}`} value={progress} onChange={event=>{stopRef.current();setProgress(Number(event.target.value));}}/></label>
    <div className={styles.branchMap}>{concept.branches.map((limbs,i)=><div key={i}><b>{["Top left","Top right","Bottom left","Bottom right"][i]}</b><span>{limbs.map((limb,j)=><span key={limb}>{j>0?" + ":""}<i style={{background:identity[limb].color}}/>{identity[limb].label}</span>)}</span></div>)}</div>
  </article>;
}

export function LimbConcepts() {
  const [compareRun,setCompareRun] = useState(0);
  const [guides,setGuides] = useState(true);
  return <section className={styles.section} id="limb-concepts" aria-label="Anatomical morph concepts">
    <div className={styles.heading}><div><p className={styles.eyebrow}>FOUR BRANCHES. ONE CHARACTER.</p><h2>Two ways to unfold.</h2><p>Corner names are from your view of the K. Left and right limbs are Ember’s.</p></div><div className={styles.actions}><button type="button" onClick={()=>setCompareRun(value=>value+1)}>Play both concepts ↗</button><label><input type="checkbox" checked={guides} onChange={event=>setGuides(event.target.checked)}/> Limb guides</label></div></div>
    <div className={styles.grid}>{concepts.map(concept=><ConceptCard key={concept.id} concept={concept} compareRun={compareRun} guides={guides}/>)}</div>
    <p className={styles.caption}>Each dot stays attached to the same limb. The paired limb emerges from the same lower K branch, stays tucked briefly, then releases. Try either in the loading preview below; the application keeps its current morph.</p>
  </section>;
}
