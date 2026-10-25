"use client";

import { useEffect, useRef, useState } from "react";
import { EMBER_K_SIZE_EM, EMBER_LAUNCH_DURATION, emberSkidWordmarkLayout, sampleEmberSkid } from "@fitness-battle/shared/mascot";
import { Ember } from "@/components/mascot/ember";
import {
  clamp,
  type BootLayout,
} from "@fitness-battle/shared/boot";

import "./boot-splash.css";

type BootSplashProps = {
  /** True after the overtake animation finished but app data is still loading. */
  waiting?: boolean;
  onAnimationComplete: () => void;
  /** Authoring surface only; product callers leave this undefined. */
  progress?: number;
};

/**
 * Product boot splash: OVERTAKE → OVERTAEK.
 * A single K outline unfolds into Ember, flies the word and returns to K.
 */
export function EmberBootSplash({ waiting = false, onAnimationComplete, progress }: BootSplashProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const wordRef = useRef<HTMLDivElement>(null);
  const lettersRef = useRef<HTMLSpanElement>(null);
  const slotRef = useRef<HTMLSpanElement>(null);
  const eRef = useRef<HTMLSpanElement>(null);
  const baselineRef = useRef<HTMLSpanElement>(null);
  const emberHostRef = useRef<HTMLSpanElement>(null);

  const completed = useRef(false);
  const preview = useRef(progress);
  preview.current = progress;
  const drawRef = useRef<((p: number) => void) | null>(null);
  const onCompleteRef = useRef(onAnimationComplete);
  onCompleteRef.current = onAnimationComplete;
  const [character, setCharacter] = useState(() => sampleEmberSkid(0, {returnToK:true}));

  useEffect(() => {
    const stage = stageRef.current!;
    const letters = lettersRef.current!;
    const slot = slotRef.current!;
    const letter = eRef.current!;
    const emberHost = emberHostRef.current!;

    const media = matchMedia("(prefers-reduced-motion: reduce)");
    let disposed = false;
    let p = completed.current ? 1 : 0;
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
      const frame = sampleEmberSkid(p, {layout, returnToK:true, reducedMotion:media.matches && preview.current === undefined});
      const l = layout;
      letter.style.transform = `translate(${-emberSkidWordmarkLayout(l).eDistance * frame.eShift}px,0)`;
      const size = l.font * EMBER_K_SIZE_EM * frame.scale;
      emberHost.style.left = `${l.homeX + frame.x}px`;
      emberHost.style.bottom = `${l.homeY - frame.y}px`;
      emberHost.style.width = `${size}px`;
      emberHost.style.height = `${size * 485 / 360}px`;

      emberHost.style.visibility = "visible";
      emberHost.style.zIndex = frame.depth < 0 ? "1" : "3";
      emberHost.style.transform = `translate(-50%, 0) scale(${frame.facing}, 1)`;
      wordRef.current.setAttribute("aria-label", p >= .93 ? "OVERTAEK" : "OVERTAKE");
      if (publishPose) {
        setCharacter({...frame,spray:media.matches?undefined:frame.spray});
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
        // Glyph center includes the K's asymmetric side bearings.
        homeX: slotBox.left - stageBox.left + font * 0.4085,
        // Use the live alphabetic baseline and exact glyph cap height.
        homeY: stageBox.bottom - baselineRef.current!.getBoundingClientRect().top - font * EMBER_K_SIZE_EM * 55 / 360,
      };
      draw(p, true);
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
      if (preview.current !== undefined) { draw(preview.current, true); return; }
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
        const next = clamp(initial + (now - start) / EMBER_LAUNCH_DURATION);
        // Publish the rig and its host together on the same animation frame.
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
    drawRef.current = value => { pause(); draw(value, true); };
    observer.observe(stage);
    media.addEventListener("change", preferenceChanged);
    document.addEventListener("visibilitychange", visibilityChanged);
    measure();
    void document.fonts.ready.then(() => {
      if (!disposed) measure();
    });
    play();

    // Fallback: If page is opened in a background tab or emulation where document.hidden is true,
    // settle after the animation duration so the app is never blocked forever.
    const fallbackTimer = window.setTimeout(() => {
      if (!completed.current && !disposed) {
        settle();
        finish();
      }
    }, EMBER_LAUNCH_DURATION + 1000);

    return () => {
      disposed = true;
      drawRef.current = null;
      cancelAnimationFrame(raf);
      window.clearTimeout(fallbackTimer);
      running = false;
      observer.disconnect();
      media.removeEventListener("change", preferenceChanged);
      document.removeEventListener("visibilitychange", visibilityChanged);
    };
  }, []);

  useEffect(() => { if(progress !== undefined) drawRef.current?.(progress); }, [progress]);

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
          <span ref={baselineRef} style={{width:0,height:0,flex:"none"}} aria-hidden="true"/>
        </div>
        <span ref={emberHostRef} className="boot-splash-ember-fly" aria-hidden="true">
          <Ember pose={character.pose} morph={character.morph} morphConcept="crest-launch" launchFlight={character.flight} launchCrouch={character.crouch} launchSkid={character.skid} skidSpray={character.spray} shadow={false} />
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
