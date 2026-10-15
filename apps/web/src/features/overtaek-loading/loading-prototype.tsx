"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { clamp, DURATION_MS, frameAt } from "./motion";
import { createEmberRenderer, type EmberRenderer } from "./renderer";
import styles from "./loading-prototype.module.css";

interface Controls { play(): void; seek(p: number): void; slow(value: boolean): void }

/** Standalone prototype. Does not delay navigation or change app startup. */
export function LoadingPrototype() {
  const stageRef = useRef<HTMLDivElement>(null), canvasRef = useRef<HTMLCanvasElement>(null);
  const wordRef = useRef<HTMLDivElement>(null), slotRef = useRef<HTMLSpanElement>(null), eRef = useRef<HTMLSpanElement>(null);
  const fallbackRef = useRef<HTMLSpanElement>(null), sliderRef = useRef<HTMLInputElement>(null);
  const trailRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const controls = useRef<Controls | null>(null);
  const [mode, setMode] = useState<"loading" | "animated" | "static">("loading");
  const [playing, setPlaying] = useState(false), [slow, setSlow] = useState(false);
  const [phase, setPhase] = useState("Ready"), [notice, setNotice] = useState("");

  useEffect(() => {
    const stage = stageRef.current!, canvas = canvasRef.current!, slot = slotRef.current!, letter = eRef.current!;
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    let renderer: EmberRenderer | null = null, abort: AbortController | null = null;
    let disposed = false, visible = true, p = 0, running = false, slowMotion = false, raf = 0, lastDraw = 0;
    let start = 0, initial = 0, lastPhase = "";
    let layout = { width: 1, height: 1, initialX: 0, centerY: 0, slotWidth: 1, eWidth: 1, unit: 1, font: 1 };

    function draw(progress: number) {
      p = clamp(progress);
      const frame = frameAt(p), l = layout;
      const pass = frame.distance;
      const overshoot = l.font * .23 * Math.sin(pass * Math.PI);
      const windup = p > .12 && p < .31 ? -l.font * .045 * Math.sin((p - .12) / .19 * Math.PI) : 0;
      const dx = l.eWidth * pass + overshoot + windup + frame.settle * l.font;
      const lift = l.font * .40 * frame.lift;
      const centerX = l.initialX + dx, centerY = l.centerY - lift;
      letter.style.transform = `translate(${-l.slotWidth * frame.eShift}px,${Math.sin(frame.eShift * Math.PI) * l.font * .045}px)`;
      fallbackRef.current!.style.transform = `translate(${dx}px,${-lift}px)`;
      if (renderer && visible) renderer.draw({
        x: (centerX - l.width / 2) / l.unit, y: (l.height / 2 - centerY) / l.unit,
        halfWidth: l.width / (2 * l.unit), halfHeight: l.height / (2 * l.unit),
        yaw: frame.yaw, roll: frame.roll, tip: frame.tip, limb: frame.limb,
      });
      trailRefs.current.forEach((trail, i) => {
        if (!trail) return;
        const length = l.font * (.34 + i * .1) * frame.speed;
        trail.style.width = `${length}px`;
        trail.style.transform = `translate(${centerX - l.font * .55 - length - i * 3}px,${centerY + (i - 1) * l.font * .12}px)`;
        trail.style.opacity = String(frame.speed * (.7 - i * .14));
      });
      sliderRef.current!.value = String(Math.round(p * 1000));
      wordRef.current!.setAttribute("aria-label", p < .5 ? "OVERTAKE" : "OVERTAEK");
      stage.dataset.progress = p.toFixed(3);
      if (frame.phase !== lastPhase) { lastPhase = frame.phase; setPhase(frame.phase); }
    }
    function measure() {
      const outer = stage.getBoundingClientRect(), rect = slot.getBoundingClientRect();
      const font = Number.parseFloat(getComputedStyle(wordRef.current!).fontSize), unit = font / 3.515;
      layout = { width: outer.width, height: outer.height, initialX: rect.left - outer.left + rect.width / 2,
        centerY: rect.top - outer.top + rect.height / 2 + .255 * unit,
        slotWidth: rect.width, eWidth: letter.getBoundingClientRect().width, unit, font };
      renderer?.resize(outer.width, outer.height); draw(p);
    }
    function pause() { cancelAnimationFrame(raf); running = false; setPlaying(false); }
    function seek(progress: number) { pause(); draw(progress); }
    function play() {
      if (!renderer || media.matches) { seek(1); return; }
      if (running) { pause(); return; }
      if (p >= 1) p = 0;
      initial = p; start = performance.now(); lastDraw = 0; running = true; setPlaying(true);
      function tick(now: number) {
        if (!running || disposed) return;
        const next = clamp(initial + (now - start) / (DURATION_MS * (slowMotion ? 2.5 : 1)));
        if (now - lastDraw >= 1000 / 24 || next === 1) { draw(next); lastDraw = now; }
        if (next < 1) raf = requestAnimationFrame(tick); else pause();
      }
      raf = requestAnimationFrame(tick);
    }
    function staticPreview(message: string) {
      pause(); abort?.abort(); renderer?.destroy(); renderer = null;
      setMode("static"); setNotice(message); seek(1);
    }
    async function initialize() {
      if (media.matches) { staticPreview("Reduced motion: showing the finished wordmark."); return; }
      abort?.abort(); const request = new AbortController(); abort = request;
      setMode("loading"); setNotice("");
      try {
        const next = await createEmberRenderer(canvas, request.signal, () => {
          if (!disposed) staticPreview("Graphics preview unavailable: showing the finished wordmark.");
        });
        if (disposed || request.signal.aborted) { next.destroy(); return; }
        renderer = next; setMode("animated"); measure();
      } catch {
        if (!disposed && !request.signal.aborted) staticPreview("Static preview on this device.");
      }
    }
    function preferenceChanged() { pause(); renderer?.destroy(); renderer = null; void initialize(); }
    function visibilityChanged() { if (document.hidden) pause(); else draw(p); }
    controls.current = { play, seek, slow(value) { const was = running; pause(); slowMotion = value; if (was) play(); } };
    const observer = new ResizeObserver(measure); observer.observe(stage);
    const intersection = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; if (!visible) pause(); else draw(p); }); intersection.observe(stage);
    media.addEventListener("change", preferenceChanged); document.addEventListener("visibilitychange", visibilityChanged);
    measure(); void document.fonts.ready.then(() => { if (!disposed) measure(); }); void initialize();
    return () => {
      disposed = true; cancelAnimationFrame(raf); running = false; abort?.abort(); renderer?.destroy();
      observer.disconnect(); intersection.disconnect(); media.removeEventListener("change", preferenceChanged);
      document.removeEventListener("visibilitychange", visibilityChanged); controls.current = null;
    };
  }, []);

  return (
    <section className={styles.prototype} aria-label="Overtaek loading animation prototype">
      <div ref={stageRef} className={styles.stage}>
        <div ref={wordRef} className={styles.word} role="img" aria-label="OVERTAKE">
          <span aria-hidden="true">OVERTA</span>
          <span ref={slotRef} className={styles.slot} aria-hidden="true">
            <span ref={fallbackRef} className={styles.fallback} hidden={mode === "animated"}>
              <Image src="/brand/mascots/star-ember.webp" width={480} height={480} alt="" unoptimized />
            </span>
          </span>
          <span ref={eRef} className={styles.e} aria-hidden="true">E</span>
        </div>
        <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" hidden={mode === "static"} />
        {[0, 1, 2].map(i => <span key={i} ref={node => { trailRefs.current[i] = node; }} className={styles.trail} aria-hidden="true" />)}
      </div>
      <div className={styles.controls}>
        <button type="button" onClick={() => controls.current?.play()} disabled={mode !== "animated"}>{playing ? "Pause" : phase === "OVERTAEK" ? "Replay" : "Play"}</button>
        <label className={styles.slow}><input type="checkbox" checked={slow} disabled={mode !== "animated"} onChange={event => { setSlow(event.target.checked); controls.current?.slow(event.target.checked); }} /> Slow motion</label>
        <label className={styles.scrub}>Animation position<input ref={sliderRef} type="range" min="0" max="1000" defaultValue="0" disabled={mode !== "animated"} onInput={event => controls.current?.seek(Number(event.currentTarget.value) / 1000)} /></label>
        <output aria-live="polite" className={styles.phase}>{phase}</output>
      </div>
      {notice && <p className={styles.notice} role="status">{notice}</p>}
      {mode === "loading" && <p className={styles.notice} role="status">Preparing Ember…</p>}
    </section>
  );
}
