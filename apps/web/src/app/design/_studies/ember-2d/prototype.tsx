"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { clamp, DURATION_MS, frameAt } from "../overtaek-lab/motion";
import { Mascot } from "./mascot";
import { flightPoseAt, poseLibrary, rigAt } from "./rig";
import styles from "./prototype.module.css";

type Controls = { toggle(): void; seek(p: number): void; slow(value: boolean): void };

function Animation({ closeup }: { closeup: boolean }) {
  const stageRef = useRef<HTMLDivElement>(null), wordRef = useRef<HTMLDivElement>(null);
  const slotRef = useRef<HTMLSpanElement>(null), letterRef = useRef<HTMLSpanElement>(null);
  const actorRef = useRef<HTMLDivElement>(null), sliderRef = useRef<HTMLInputElement>(null);
  const trailRefs = useRef<(HTMLSpanElement | null)[]>([]), controls = useRef<Controls | null>(null);
  const [playing, setPlaying] = useState(false), [slow, setSlow] = useState(false);
  const [phase, setPhase] = useState("Ready"), [reduced, setReduced] = useState(false);

  useEffect(() => {
    const stage = stageRef.current!, actor = actorRef.current!, letter = letterRef.current!;
    const body = actor.querySelector<SVGPathElement>("[data-body]")!;
    const puppet = actor.querySelector<SVGGElement>("[data-puppet]")!;
    const face = actor.querySelector<SVGGElement>("[data-face]")!;
    const farEye = actor.querySelector<SVGGElement>('[data-eye="far"]')!;
    const mouth = actor.querySelector<SVGPathElement>('[data-mouth]')!;
    const tongue = actor.querySelector<SVGPathElement>('[data-tongue]')!;
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    let disposed = false, running = false, raf = 0, p = 0, slowMotion = false, lastPhase = "";
    let origin = 0, started = 0, lastDraw = 0;
    let layout = { x: 0, y: 0, size: 100, distance: 50, slot: 60 };

    function draw(progress: number) {
      if (disposed || !sliderRef.current || !wordRef.current) return;
      p = clamp(progress);
      const f = frameAt(p), l = layout;
      const windup = p > .12 && p < .31 ? -.04 * Math.sin((p - .12) / .19 * Math.PI) : 0;
      const dx = l.distance * f.distance + l.size * (.11 * f.lift + windup + f.settle * .5);
      const lift = l.size * .31 * f.lift;
      const rotation = f.roll * 180 / Math.PI;
      actor.style.width = `${l.size}px`;
      actor.style.transform = `translate(${l.x + dx - l.size / 2}px,${l.y - lift - l.size / 2}px) rotate(${rotation}deg)`;
      const rig = rigAt(flightPoseAt(p));
      puppet.setAttribute("transform", rig.body);
      body.setAttribute("d", rig.path);
      face.setAttribute("transform", rig.face);
      farEye.setAttribute("transform", rig.farEye);
      mouth.setAttribute("d", rig.mouth);
      mouth.setAttribute("fill", rig.open > .25 ? "#713323" : "none");
      mouth.setAttribute("stroke", rig.open > .25 ? "none" : "#234739");
      tongue.setAttribute("opacity", rig.open > .25 ? "1" : "0");
      letter.style.transform = `translate(${-l.slot * f.eShift}px,${Math.sin(f.eShift * Math.PI) * 3}px)`;
      trailRefs.current.forEach((node, i) => {
        if (!node) return;
        const length = l.size * (.30 + .09 * i) * f.speed;
        node.style.width = `${length}px`;
        node.style.opacity = String(f.speed * (.75 - i * .15));
        node.style.transform = `translate(${l.x + dx - l.size * .4 - length}px,${l.y - lift + (i - 1) * l.size * .10}px)`;
      });
      sliderRef.current.value = String(Math.round(p * 1000));
      wordRef.current.setAttribute("aria-label", closeup ? `Star Ember: ${f.phase}` : p < .5 ? "OVERTAKE" : "OVERTAEK");
      stage.dataset.progress = p.toFixed(3);
      if (lastPhase !== f.phase) { lastPhase = f.phase; setPhase(f.phase); }
    }
    function pause() { cancelAnimationFrame(raf); running = false; if (!disposed) setPlaying(false); }
    function seek(next: number) { pause(); draw(next); }
    function toggle() {
      if (disposed || media.matches) return;
      if (running) { pause(); return; }
      if (p >= 1) p = 0;
      origin = p; started = performance.now(); lastDraw = 0; running = true; setPlaying(true);
      function tick(now: number) {
        if (disposed || !running) return;
        const next = clamp(origin + (now - started) / (DURATION_MS * (slowMotion ? 2.5 : 1)));
        if (now - lastDraw >= 1000 / 30 || next === 1) { draw(next); lastDraw = now; }
        if (next < 1) raf = requestAnimationFrame(tick); else pause();
      }
      raf = requestAnimationFrame(tick);
    }
    function measure() {
      if (disposed || !slotRef.current || !wordRef.current) return;
      const stageBox = stage.getBoundingClientRect(), slot = slotRef.current.getBoundingClientRect();
      const font = Number.parseFloat(getComputedStyle(wordRef.current).fontSize);
      layout = closeup
        ? { x: stageBox.width * .30, y: stageBox.height * .55, size: Math.min(210, stageBox.width * .46), distance: stageBox.width * .40, slot: slot.width }
        : { x: slot.left - stageBox.left + slot.width / 2, y: slot.top - stageBox.top + slot.height / 2, size: font * 1.33, distance: letter.getBoundingClientRect().width, slot: slot.width };
      draw(p);
    }
    function preferenceChanged() { pause(); setReduced(media.matches); measure(); draw(media.matches ? 1 : 0); }
    function visibilityChanged() { if (document.hidden) pause(); }
    controls.current = { toggle, seek, slow(value) { const was = running; pause(); slowMotion = value; if (was) toggle(); } };
    const resize = new ResizeObserver(measure); resize.observe(stage);
    const intersection = new IntersectionObserver(entries => { if (!entries[0].isIntersecting) pause(); }); intersection.observe(stage);
    media.addEventListener("change", preferenceChanged);
    document.addEventListener("visibilitychange", visibilityChanged);
    preferenceChanged(); void document.fonts.ready.then(() => { if (!disposed) measure(); });
    return () => {
      disposed = true; running = false; cancelAnimationFrame(raf); resize.disconnect(); intersection.disconnect();
      media.removeEventListener("change", preferenceChanged); document.removeEventListener("visibilitychange", visibilityChanged); controls.current = null;
    };
  }, [closeup]);

  return <>
    <div ref={stageRef} className={styles.stage} data-closeup={closeup}>
      <div className={styles.stageLabel}><span>Star Ember · reference rig</span><span>{closeup ? "Flight study" : "OVERTAKE → OVERTAEK"}</span></div>
      <div ref={wordRef} role="img" aria-label={closeup ? "Star Ember: Ready" : "OVERTAKE"} className={styles.word} style={{ opacity: closeup ? 0 : 1 }}>
        <span aria-hidden="true">OVERTA</span><span ref={slotRef} className={styles.slot} aria-hidden="true" /><span ref={letterRef} aria-hidden="true">E</span>
      </div>
      {[0, 1, 2].map(i => <span key={i} ref={node => { trailRefs.current[i] = node; }} className={styles.trail} aria-hidden="true" />)}
      <div ref={actorRef} className={styles.actor}><Mascot /></div>
      <div className={styles.track} aria-hidden="true"><span>SET</span><span>PASS</span><span>FINISH</span></div>
    </div>
    <div className={styles.controls}>
      <button className={styles.play} type="button" disabled={reduced} onClick={() => controls.current?.toggle()}>{playing ? "Pause" : phase === "OVERTAEK" ? "Replay" : "Play animation"}</button>
      <label className={styles.slow}><input type="checkbox" checked={slow} disabled={reduced} onChange={e => { setSlow(e.target.checked); controls.current?.slow(e.target.checked); }} /> Slow motion</label>
      <output aria-live="polite">{phase}</output>
      <label className={styles.scrub}><span>Scrub the motion</span><input ref={sliderRef} type="range" min="0" max="1000" defaultValue="0" disabled={reduced} onInput={e => controls.current?.seek(Number(e.currentTarget.value) / 1000)} /></label>
    </div>
    {reduced && <p className={styles.note} role="status">Reduced motion is on. Showing the finished pose.</p>}
  </>;
}

export function Ember2DPrototype() {
  const [closeup, setCloseup] = useState(true);
  return <main className={styles.page}>
    <header className={styles.header}><Link href="/design/overtaek">← Original animation</Link><span>OVERTAEK / CHARACTER LAB / 02</span></header>
    <div className={styles.intro}><p className={styles.eyebrow}>Star Ember / Reference animation study</p><h1>Ember,<br />in motion.</h1><p>The supplied pose library, rebuilt in SVG. Balanced star points, a curved crest, and the same little face—ready to make the pass.</p></div>
    <section className={styles.poseStudy} aria-label="Reference pose library">
      <div className={styles.poseHeading}><p className={styles.eyebrow}>One character. Five poses.</p><h2>From ready to flying.</h2></div>
      <div className={styles.poses}>{poseLibrary.map(item => <figure key={item.name}><Mascot pose={item.pose} /><figcaption><strong>{item.name}</strong><span>{item.detail}</span></figcaption></figure>)}</div>
    </section>
    <section className={styles.player} aria-label="2D mascot animation prototype">
      <div className={styles.playerHeader}><div><p className={styles.eyebrow}>The overtaking test</p><h2>Ready. Set. Overtake.</h2></div><div className={styles.viewToggle} role="group" aria-label="Preview scene"><button type="button" aria-pressed={!closeup} onClick={() => setCloseup(false)}>Wordmark</button><button type="button" aria-pressed={closeup} onClick={() => setCloseup(true)}>Close-up</button></div></div>
      <Animation key={String(closeup)} closeup={closeup} />
    </section>
    <footer className={styles.footer}><p><strong>A flexible star, with a steady face.</strong> The points sweep independently from their roots. The crest trails behind, then springs forward as Ember brakes.</p><p>Wind up → turn 45° → accelerate → pass → brake → settle. Use slow motion or the scrubber to inspect the movement.</p></footer>
  </main>;
}
