"use client";

import { useEffect, useRef, useState } from "react";
import { type EmberKConcept, type EmberPose } from "@fitness-battle/shared/mascot";
import { Ember } from "@/components/mascot/ember";
import {
  BOOT_DURATION_MS,
  bootEmberPose,
  bootFrame,
  clamp,
  type BootFlightStyle,
  type BootLayout,
} from "@fitness-battle/shared/boot";

import "./boot-splash.css";

type BootSplashProps = {
  /** True after the overtake animation finished but app data is still loading. */
  waiting?: boolean;
  /** Anatomical K ↔ Ember morph concept ("tucked" Concept 1 vs "skater" Concept 2). */
  concept?: EmberKConcept;
  /** Flight trajectory style ("orbit" | "figure8" | "sprint"). */
  flightStyle?: BootFlightStyle;
  onAnimationComplete: () => void;
};

/**
 * Product boot splash: OVERTAKE → OVERTAEK.
 * The literal K in OVERTAKE topologically un-morphs into 3D Star Ember, banks
 * smoothly behind OVERTA and around the O, slingshots across the foreground to
 * overtake E, and topologically morphs its limbs back into the final K of OVERTAEK.
 */
export function BootSplash({
  waiting = false,
  concept: conceptProp,
  flightStyle: styleProp,
  onAnimationComplete,
}: BootSplashProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const wordRef = useRef<HTMLDivElement>(null);
  const lettersRef = useRef<HTMLSpanElement>(null);
  const slotRef = useRef<HTMLSpanElement>(null);
  const eRef = useRef<HTMLSpanElement>(null);
  const emberHostRef = useRef<HTMLSpanElement>(null);
  const kHostRef = useRef<HTMLSpanElement>(null);
  const completed = useRef(false);
  const onCompleteRef = useRef(onAnimationComplete);
  onCompleteRef.current = onAnimationComplete;

  const [concept, setConcept] = useState<EmberKConcept>(conceptProp ?? "tucked");
  const [flightStyle, setFlightStyle] = useState<BootFlightStyle>(styleProp ?? "orbit");
  const [pose, setPose] = useState<EmberPose>(() =>
    bootEmberPose(0, { concept: conceptProp ?? "tucked", style: styleProp ?? "orbit" }),
  );
  const [kMorph, setKMorph] = useState<number>(() => bootFrame(0).kMorph);

  useEffect(() => {
    if (conceptProp) {
      setConcept(conceptProp);
      return;
    }
    try {
      const saved = window.localStorage.getItem("overtaek-k-concept");
      if (saved === "tucked" || saved === "skater") setConcept(saved);
    } catch {
      // ignore storage errors
    }
  }, [conceptProp]);

  useEffect(() => {
    if (styleProp) {
      setFlightStyle(styleProp);
      return;
    }
    try {
      const saved = window.localStorage.getItem("overtaek-flight-style");
      if (saved === "orbit" || saved === "figure8" || saved === "sprint") setFlightStyle(saved);
    } catch {
      // ignore storage errors
    }
  }, [styleProp]);

  useEffect(() => {
    const stage = stageRef.current!;
    const letters = lettersRef.current!;
    const slot = slotRef.current!;
    const letter = eRef.current!;
    const emberHost = emberHostRef.current!;
    const kHost = kHostRef.current!;
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    let disposed = false;
    let p = 0;
    let running = false;
    let raf = 0;
    let start = 0;
    let initial = 0;
    let layout: BootLayout & { homeX: number; homeY: number } = {
      overtaWidth: 1,
      slotWidth: 1,
      eWidth: 1,
      font: 1,
      homeX: 0,
      homeY: 0,
    };

    function finish() {
      if (completed.current || disposed) return;
      completed.current = true;
      onCompleteRef.current();
    }

    function draw(progress: number, publishPose: boolean) {
      if (disposed || !wordRef.current) return;
      p = clamp(progress);
      const frame = bootFrame(p, layout, flightStyle);
      const l = layout;
      letter.style.transform = `translate(${-l.slotWidth * frame.eShift}px, ${-frame.eLift}px)`;
      const size = l.font * 1.16 * frame.scale;
      emberHost.style.left = `${l.homeX + frame.x}px`;
      emberHost.style.bottom = `${l.homeY - frame.y}px`;
      emberHost.style.width = `${size}px`;
      emberHost.style.height = `${size}px`;
      // Vector Ember morphs directly from K (kMorph=1) -> Star (kMorph=0) -> K (kMorph=1)
      emberHost.style.opacity = "1";
      emberHost.style.zIndex = frame.depth < 0 ? "1" : "3";
      emberHost.style.transform = "translate(-50%, 5%)";
      kHost.style.left = `${l.homeX + bootFrame(1, layout, flightStyle).x}px`;
      kHost.style.bottom = `${l.homeY}px`;
      kHost.style.fontSize = `${l.font}px`;
      kHost.style.opacity = "0";
      kHost.style.zIndex = "3";
      wordRef.current.setAttribute("aria-label", frame.phase === "OVERTAEK" ? "OVERTAEK" : "OVERTAKE");
      if (publishPose) {
        setKMorph(frame.kMorph);
        setPose(
          bootEmberPose(p, {
            reducedMotion: media.matches,
            concept,
            style: flightStyle,
          }),
        );
      }
    }

    function measure() {
      if (disposed || !wordRef.current) return;
      const font = Number.parseFloat(getComputedStyle(wordRef.current).fontSize);
      if (!Number.isFinite(font) || font <= 0) return;
      const stageBox = stage.getBoundingClientRect();
      const slotBox = slot.getBoundingClientRect();
      layout = {
        overtaWidth: letters.getBoundingClientRect().width,
        slotWidth: slotBox.width,
        eWidth: letter.getBoundingClientRect().width,
        font,
        homeX: slotBox.left - stageBox.left + slotBox.width / 2,
        homeY: stageBox.bottom - slotBox.bottom,
      };
      draw(p, false);
    }

    function pause() {
      cancelAnimationFrame(raf);
      running = false;
    }

    function settle() {
      pause();
      draw(1, true);
    }

    function play() {
      if (disposed || running || completed.current) return;
      if (media.matches) {
        settle();
        finish();
        return;
      }
      if (document.hidden) return;
      if (p >= 1) {
        settle();
        finish();
        return;
      }
      initial = p;
      start = performance.now();
      running = true;
      function tick(now: number) {
        if (!running || disposed) return;
        const next = clamp(initial + (now - start) / BOOT_DURATION_MS);
        draw(next, true);
        if (next < 1) raf = requestAnimationFrame(tick);
        else {
          settle();
          finish();
        }
      }
      raf = requestAnimationFrame(tick);
    }

    function visibilityChanged() {
      if (document.hidden) {
        pause();
        return;
      }
      if (completed.current || disposed) {
        draw(p, true);
        return;
      }
      play();
    }

    function preferenceChanged() {
      if (!media.matches) return;
      settle();
      finish();
    }

    const observer = new ResizeObserver(measure);
    observer.observe(stage);
    media.addEventListener("change", preferenceChanged);
    document.addEventListener("visibilitychange", visibilityChanged);
    measure();
    void document.fonts.ready.then(() => {
      if (!disposed) measure();
    });
    play();

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      running = false;
      observer.disconnect();
      media.removeEventListener("change", preferenceChanged);
      document.removeEventListener("visibilitychange", visibilityChanged);
    };
  }, [concept, flightStyle]);

  return (
    <div className="boot-splash" role="status" aria-live="polite" aria-busy="true">
      <div ref={stageRef} className="boot-splash-stage">
        <div ref={wordRef} className="boot-splash-word" role="img" aria-label="OVERTAKE">
          <span ref={lettersRef} className="boot-splash-letters" aria-hidden="true">
            OVERTA
          </span>
          <span ref={slotRef} className="boot-splash-slot" aria-hidden="true">
            <span className="boot-splash-strut">A</span>
          </span>
          <span ref={eRef} className="boot-splash-e" aria-hidden="true">
            E
          </span>
        </div>
        <span ref={emberHostRef} className="boot-splash-ember-fly" aria-hidden="true">
          <Ember pose={pose} kMorph={kMorph} kConcept={concept} shadow={false} />
        </span>
        <span ref={kHostRef} className="boot-splash-k" aria-hidden="true">
          K
        </span>
      </div>
      {waiting ? (
        <div className="boot-splash-wait">
          <span className="boot-splash-spinner" aria-hidden="true" />
          <span className="boot-splash-wait-label">Loading…</span>
        </div>
      ) : (
        <span className="boot-splash-spacer" aria-hidden="true" />
      )}
    </div>
  );
}
