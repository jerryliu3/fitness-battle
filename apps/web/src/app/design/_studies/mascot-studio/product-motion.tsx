"use client";
import { useState } from "react";
import Link from "next/link";
import { BootSplash } from "./legacy-boot-splash";
import { Ember } from "@/components/mascot/ember";
import { BOOT_DURATION_MS } from "@fitness-battle/shared/boot";
import type { EmberMorphConcept } from "@fitness-battle/shared/mascot";
import { FieldRoster } from "@/features/split/components/field-roster";
import { LaneTrack } from "@/features/field/components/lane-track";
import { valueAt, type SceneRunner } from "@/features/field/geometry";
import "@/features/split/split.css";
import "@/features/field/field.css";
import styles from "./product-motion.module.css";
import { LimbConcepts } from "./limb-concepts";

const runners: SceneRunner[] = [
  { id: "preview-mira", name: "Mira", initials: "MI", series: [0, 2, 4, 4, 6, 7] },
  { id: "preview-you", name: "You", initials: "YO", you: true, series: [0, 0, 3, 5, 7, 9] },
  { id: "preview-noor", name: "Noor", initials: "NO", series: [0, 1, 2, 4, 4, 6] },
];

export function ProductMotionStudy() {
  const [progress,setProgress]=useState<number|undefined>(0);
  const [replay,setReplay]=useState(0);
  const [bootConcept,setBootConcept]=useState<EmberMorphConcept>("baseline");
  const [friday,setFriday]=useState(false);
  const [selected,setSelected]=useState("preview-you");
  const time=friday?5:2;
  const rows=runners.map(runner=>({ id:runner.id, name:runner.name, you:Boolean(runner.you), effort:valueAt(runner,time), distanceM:valueAt(runner,time)*1000, movingSec:0, elo:1200, place:0 }))
    .sort((a,b)=>b.effort-a.effort).map((row,index)=>({...row,place:index+1}));
  return <main className={styles.page}>
    <header><Link href="/design/mascot">← Character studio</Link><span>PRODUCT MOTION / 01</span></header>
    <p className={styles.eyebrow}>ONE OUTLINE. EVERY MOVE.</p>
    <h1>A little spark.<br/>A familiar signature.</h1>
    <p className={styles.intro}>Carry the K’s branches into Ember’s limbs. Compare two anatomical mappings, then review the loading sequence and field motion below.</p>
    <p><Link href="/design/mascot/launch">New follow-up: held launch poses & sharp landing →</Link></p>
    <LimbConcepts/>
    <div className={styles.loadingHeading}><h2>Try it in the loading sequence.</h2><label>Loading morph<select aria-label="Loading morph concept" value={bootConcept} onChange={event=>{setBootConcept(event.target.value as EmberMorphConcept);setProgress(0);}}><option value="baseline">Current baseline</option><option value="crest-first">01 · Crest first</option><option value="race-start">02 · Race start</option></select></label></div>
    <section className={styles.preview} aria-label="Production loading animation review">
      <BootSplash key={`${replay}-${bootConcept}`} morphConcept={bootConcept} progress={progress} onAnimationComplete={()=>setProgress(1)} />
    </section>
    <div className={styles.controls}>
      <button onClick={()=>{setProgress(undefined);setReplay(v=>v+1);}}>Replay loading sequence ↗</button>
      <label>Scrub the sequence<input type="range" aria-label="Loading animation time" min="0" max="1" step="0.001" value={progress??0} onChange={e=>setProgress(Number(e.target.value))}/></label>
      <output aria-live="off">{progress===undefined?"Playing":`${(progress*BOOT_DURATION_MS/1000).toFixed(2)} / ${(BOOT_DURATION_MS/1000).toFixed(1)} s`}</output>
    </div>
    <div className={styles.steps}>{[1,.75,.5,.25,0].map(morph=><div key={morph}><Ember morph={morph} shadow={false}/><span>{morph===1?"The K":morph===0?"Ember":`${Math.round((1-morph)*100)}% unfolded`}</span></div>)}</div>
    <section className={`${styles.field} sp-shell`} aria-label="Field motion preview">
      <h2>Keep your place. See what changed.</h2>
      <p>Preview data · production lane and leaderboard components. Runners keep their lanes while the ranking changes.</p>
      <button className={styles.advance} onClick={()=>setFriday(value=>!value)}>{friday?"Rewind to Tuesday":"Advance to Friday"}</button>
      <div className={styles.fieldGrid}>
        <LaneTrack runners={runners} ghost={null} time={time} extra={0} selected={selected} showGhost={false} unit="km" onSelect={setSelected}/>
        <FieldRoster rows={rows} selectedId={selected} onSelect={setSelected} detail="distance" unit="km"/>
      </div>
    </section>
    <footer><Link href="/today">Try Today’s checkpoint →</Link><Link href="/arena">Explore the lanes →</Link><p>Reduced Motion keeps the finished wordmark still. Product feedback plays once in response to an action.</p></footer>
  </main>;
}
