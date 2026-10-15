"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { clamp, DURATION_MS, frameAt, smooth } from "../overtaek-lab/motion";
import { concepts, Mascot, silhouetteAt, type Concept } from "./mascot";
import styles from "./prototype.module.css";

type Controls = { toggle(): void; seek(p: number): void; slow(value: boolean): void };

function Animation({ concept, closeup }: { concept: Concept; closeup: boolean }) {
  const stageRef = useRef<HTMLDivElement>(null), wordRef = useRef<HTMLDivElement>(null);
  const slotRef = useRef<HTMLSpanElement>(null), letterRef = useRef<HTMLSpanElement>(null);
  const actorRef = useRef<HTMLDivElement>(null), sliderRef = useRef<HTMLInputElement>(null);
  const trailRefs = useRef<(HTMLSpanElement | null)[]>([]), controls = useRef<Controls | null>(null);
  const [playing, setPlaying] = useState(false), [slow, setSlow] = useState(false);
  const [phase, setPhase] = useState("Ready"), [reduced, setReduced] = useState(false);

  useEffect(() => {
    const stage = stageRef.current!, actor = actorRef.current!, letter = letterRef.current!;
    const paths = actor.querySelectorAll<SVGPathElement>("[data-contour]");
    const puppet = actor.querySelector<SVGGElement>("[data-puppet]")!;
    const face = actor.querySelector<SVGGElement>("[data-face]")!;
    const leftEye = actor.querySelector<SVGEllipseElement>('[data-eye="left"]')!;
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    let disposed = false, running = false, raf = 0, p = 0, slowMotion = false, lastPhase = "";
    let origin = 0, started = 0, lastDraw = 0;
    let layout = { x: 0, y: 0, size: 100, distance: 50, slot: 60 };

    function draw(progress: number) {
      if (disposed || !sliderRef.current || !wordRef.current) return;
      p = clamp(progress);
      const f = frameAt(p), l = layout;
      // A front pose, a compressed right-facing pose, then a front-facing finish.
      const turn = smooth((p - .10) / .18) * (1 - smooth((p - .73) / .20));
      const windup = p > .12 && p < .31 ? -.04 * Math.sin((p - .12) / .19 * Math.PI) : 0;
      const dx = l.distance * f.distance + l.size * (.11 * f.lift + windup + f.settle * .5);
      const lift = l.size * .31 * f.lift;
      const rotation = f.roll * 180 / Math.PI;
      actor.style.width = `${l.size}px`;
      actor.style.transform = `translate(${l.x + dx - l.size / 2}px,${l.y - lift - l.size / 2}px) rotate(${rotation}deg)`;
      puppet.setAttribute("transform", `translate(125 133) scale(${1 - turn * .16 + f.speed * .035} ${1 - f.speed * .04}) translate(-125 -133)`);
      const path = silhouetteAt(concept, f.tip, f.limb);
      paths.forEach(node => node.setAttribute("d", path));
      face.setAttribute("transform", `translate(${turn * 26} ${-turn * 2})`);
      leftEye.setAttribute("rx", String((concept === "puff" ? 7 : 6) * (1 - turn * .35)));
      letter.style.transform = `translate(${-l.slot * f.eShift}px,${Math.sin(f.eShift * Math.PI) * 3}px)`;
      trailRefs.current.forEach((node, i) => {
        if (!node) return;
        const length = l.size * (.30 + .09 * i) * f.speed;
        node.style.width = `${length}px`;
        node.style.opacity = String(f.speed * (.75 - i * .15));
        node.style.transform = `translate(${l.x + dx - l.size * .4 - length}px,${l.y - lift + (i - 1) * l.size * .10}px)`;
      });
      sliderRef.current.value = String(Math.round(p * 1000));
      wordRef.current.setAttribute("aria-label", p < .5 ? "OVERTAKE" : "OVERTAEK");
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
  }, [concept, closeup]);

  return <>
    <div ref={stageRef} className={styles.stage} data-closeup={closeup}>
      <div className={styles.stageLabel}><span>{concepts.find(c => c.id === concept)!.name}</span><span>{closeup ? "Character study" : "OVERTAKE → OVERTAEK"}</span></div>
      <div ref={wordRef} role="img" aria-label="OVERTAKE" className={styles.word} style={{ opacity: closeup ? 0 : 1 }}>
        <span aria-hidden="true">OVERTA</span><span ref={slotRef} className={styles.slot} aria-hidden="true" /><span ref={letterRef} aria-hidden="true">E</span>
      </div>
      {[0, 1, 2].map(i => <span key={i} ref={node => { trailRefs.current[i] = node; }} className={styles.trail} aria-hidden="true" />)}
      <div ref={actorRef} className={styles.actor}><Mascot concept={concept} /></div>
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
  const [concept, setConcept] = useState<Concept>("cel"), [closeup, setCloseup] = useState(false);
  return <main className={styles.page}>
    <header className={styles.header}><Link href="/design/overtaek">← Original animation</Link><span>OVERTAEK / CHARACTER LAB / 02</span></header>
    <div className={styles.intro}><p className={styles.eyebrow}>Same spark. A new dimension.</p><h1>A little flatter.<br />Just as alive.</h1><p>Three fully 2D takes on Star Ember. Same five points, same racing spirit. Pick a character, then watch it make the pass.</p></div>
    <div className={styles.cards} role="group" aria-label="Choose a mascot concept">
      {concepts.map(c => <button key={c.id} type="button" aria-pressed={concept === c.id} className={styles.card} onClick={() => setConcept(c.id)}>
        <div className={styles.cardTop}><span>{c.label}</span><span>{concept === c.id ? "SELECTED ●" : "TRY THIS ↗"}</span></div>
        <Mascot concept={c.id} className={styles.preview} />
        <h2>{c.name}</h2><p className={styles.tag}>{c.tag}</p><p>{c.description}</p>
      </button>)}
    </div>
    <section className={styles.player} aria-label="2D mascot animation prototype">
      <div className={styles.playerHeader}><div><p className={styles.eyebrow}>The overtaking test</p><h2>Ready. Set. Overtake.</h2></div><div className={styles.viewToggle} role="group" aria-label="Preview scene"><button type="button" aria-pressed={!closeup} onClick={() => setCloseup(false)}>Wordmark</button><button type="button" aria-pressed={closeup} onClick={() => setCloseup(true)}>Close-up</button></div></div>
      <Animation key={`${concept}-${closeup}`} concept={concept} closeup={closeup} />
    </section>
    <footer className={styles.footer}><p><strong>My first pick: Cel Ember.</strong> It keeps the warmth of the original and reads clearly at loading-screen size. Puff is more playful; Bolt brings the strongest sporting attitude.</p><p>Front → turn → accelerate → pass → brake → settle. Try slow motion to see the crest trail behind and spring back.</p></footer>
  </main>;
}
