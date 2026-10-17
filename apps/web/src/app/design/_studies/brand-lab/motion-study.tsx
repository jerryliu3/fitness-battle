"use client";
import { createElement, useEffect, useId, useRef, useState, type ComponentProps } from "react";
import Link from "next/link";
import { EMBER_LAUNCH_DURATION, EMBER_SKID_TOUCHDOWN, EMBER_MODEL, sampleEmberSkid, type EmberNode } from "@fitness-battle/shared/mascot";
import { BootSplash } from "@/shell/boot-splash";
import type { Ember } from "@/components/mascot/ember";
import { MOTION_STYLES, createStyledScene, type MotionStyle } from "./motion-art";
import styles from "./motion-study.module.css";

function nodeView(node: EmberNode, key: number): React.ReactNode {
  return createElement(node.tag, { ...node.attrs, key }, node.children?.map(nodeView));
}
function StudyEmber({ style, warm = false, ...props }: Omit<ComponentProps<typeof Ember>, "style"> & { style: MotionStyle; warm?: boolean }) {
  const id = useId();
  return <svg viewBox={EMBER_MODEL.viewBox} aria-hidden="true" focusable="false">{createStyledScene(style, { ...props, id }, warm).map(nodeView)}</svg>;
}
export function BrandMotionStudy() {
  const [progress, setProgress] = useState(.18), [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1), [warm, setWarm] = useState(true), [reduced, setReduced] = useState(false);
  const raf = useRef(0);
  const [focus, setFocus] = useState("all");
  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => { setReduced(media.matches); if (media.matches) { setPlaying(false); setProgress(1); } };
    const hide = () => { if (document.hidden) setPlaying(false); };
    update(); media.addEventListener("change", update); document.addEventListener("visibilitychange", hide);
    return () => { media.removeEventListener("change", update); document.removeEventListener("visibilitychange", hide); };
  }, []);
  useEffect(() => {
    if (!playing || reduced) return;
    let last: number | undefined;
    const tick = (now: number) => {
      const delta = last === undefined ? 0 : (now - last) * speed / EMBER_LAUNCH_DURATION;
      last = now;
      setProgress(value => Math.min(1, value + delta));
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [playing, speed, reduced]);
  useEffect(() => { if (progress >= 1) setPlaying(false); }, [progress]);
  const frame = sampleEmberSkid(progress, { returnToK: true });
  const seek = (p: number) => { setPlaying(false); setProgress(p); };
  return <main className={styles.page}>
    <header><Link href="/design/brand?concept=open-field&view=product">← Brand & Ember studio</Link><span>EMBER / MOTION PROOFS</span></header>
    <h1>Three looks. One overtake.</h1>
    <p className={styles.intro}>The production intro, with three deformable vector interpretations of your favorite Ember references. Shared timing makes differences in silhouette, rim and face easier to judge.</p>
    <section className={styles.controls} aria-label="Animation controls">
      <button disabled={reduced} onClick={() => { setProgress(0); setPlaying(true); }}>Replay all</button>
      <button disabled={reduced} onClick={() => { if (progress === 1) setProgress(0); setPlaying(v => !v); }}>{playing ? "Pause" : "Play"}</button>
      <label>Speed<select value={speed} onChange={e => setSpeed(Number(e.target.value))}><option value={1}>Normal</option><option value={.5}>Half speed</option><option value={.25}>Quarter speed</option></select></label>
      <label>View<select value={focus} onChange={e => setFocus(e.target.value)}><option value="all">All three</option>{MOTION_STYLES.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
      <label><input type="checkbox" checked={warm} onChange={e => setWarm(e.target.checked)} /> Warm Open Field background</label>
      <label className={styles.scrub}>Timeline · {Math.round(progress * 100)}%<input aria-label="Animation timeline" type="range" min="0" max="1" step=".001" value={progress} onChange={e => seek(Number(e.target.value))} /></label>
      <div className={styles.phases}>{[["Stance", .18], ["Flight", .46], ["Touchdown", EMBER_SKID_TOUCHDOWN], ["K endpoint", 1]].map(([name, p]) => <button key={name} onClick={() => seek(Number(p))}>{name}</button>)}</div>
      <output aria-live="off">{frame.phase}{playing ? " · Playing" : " · Paused"}</output>
      {reduced ? <p>Reduced motion is on. Automatic playback is disabled; the timeline remains available for manual inspection.</p> : null}
    </section>
    <div className={`${styles.grid} ${focus !== "all" ? styles.focus : ""}`}>
      {MOTION_STYLES.filter(s => focus === "all" || focus === s.id).map(s => <article key={s.id} className={styles.card} aria-label={`${s.name} animation study`}>
        <div className={styles.cardHeading}><h2>{s.name}</h2><p>{s.material}</p></div>
        <div className={`${styles.loader} ${warm ? styles.warm : ""}`}>
          <BootSplash progress={progress} onAnimationComplete={() => {}} renderCharacter={props => <StudyEmber {...props} style={s} warm={warm} />} />
        </div>
        <div className={styles.artPair}>
          <div><span>Deforming rig · close-up</span><StudyEmber style={s} warm pose={frame.pose} morph={frame.morph} morphConcept="crest-launch" launchFlight={frame.flight} launchCrouch={frame.crouch} launchSkid={frame.skid} shadow={false} /></div>
          <div><span>Original still reference</span>{/* Existing concept art; intentionally not animated. */}<img src={`/design/brand/ember-${s.reference}.webp`} alt={`${s.name} original sculpted concept reference`} /></div>
        </div>
        <p className={styles.note}>{s.note}</p>
      </article>)}
    </div>
    <p className={styles.limit}>Study, not a production replacement. These use real contour deformation, recolored surfaces and a clipped vector rim. They approximate the references; sculpted volume, glass refraction and full 3D turns are not implemented. The K endpoint and launch choreography are shared with the current loader.</p>
    <Link href="/design/mascot/skid">Compare the current production loader →</Link>
  </main>;
}
