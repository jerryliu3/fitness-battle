"use client";

import { useEffect, useRef, useState } from "react";
import { type EmberPose } from "@fitness-battle/shared/mascot";
import { Ember } from "@/components/mascot/ember";
import { BOOT_DURATION_MS, bootEmberPose, bootFrame, clamp } from "@fitness-battle/shared/boot";

import "./boot-splash.css";

type BootSplashProps = {
  /** True after the overtake animation finished but app data is still loading. */
  waiting?: boolean;
  onAnimationComplete: () => void;
};

/**
 * Product boot splash: OVERTAKE → OVERTAEK with the shared vector Ember.
 * Slow ready morphs Ember into a K; the letter jump is a short, sharp pass.
 */
export function BootSplash({ waiting = false, onAnimationComplete }: BootSplashProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const wordRef = useRef<HTMLDivElement>(null);
  const slotRef = useRef<HTMLSpanElement>(null);
  const eRef = useRef<HTMLSpanElement>(null);
  const emberHostRef = useRef<HTMLSpanElement>(null);
  const completed = useRef(false);
  const onCompleteRef = useRef(onAnimationComplete);
  onCompleteRef.current = onAnimationComplete;
  const [pose, setPose] = useState<EmberPose>(() => bootEmberPose(0));

  useEffect(() => {
    const stage = stageRef.current!;
    const slot = slotRef.current!;
    const letter = eRef.current!;
    const emberHost = emberHostRef.current!;
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    let disposed = false;
    let p = 0;
    let running = false;
    let raf = 0;
    let lastPublish = 0;
    let start = 0;
    let initial = 0;
    let layout = { slotWidth: 1, eWidth: 1, font: 1 };

    function finish() {
      if (completed.current || disposed) return;
      completed.current = true;
      onCompleteRef.current();
    }

    function draw(progress: number, publishPose: boolean) {
      if (disposed || !wordRef.current) return;
      p = clamp(progress);
      const frame = bootFrame(p);
      const l = layout;
      const dx = l.eWidth * frame.travel + l.font * 0.05 * frame.windup;
      const lift = l.font * 0.14 * frame.lift;
      letter.style.transform = `translate(${-l.slotWidth * frame.eShift}px,0)`;
      emberHost.style.transform = `translate(${dx}px,${-lift}px)`;
      wordRef.current.setAttribute("aria-label", frame.phase === "OVERTAEK" ? "OVERTAEK" : "OVERTAKE");
      if (publishPose) {
        setPose(bootEmberPose(p, { reducedMotion: media.matches }));
      }
    }

    function measure() {
      if (disposed || !wordRef.current) return;
      const font = Number.parseFloat(getComputedStyle(wordRef.current).fontSize);
      if (!Number.isFinite(font) || font <= 0) return;
      layout = {
        slotWidth: slot.getBoundingClientRect().width,
        eWidth: letter.getBoundingClientRect().width,
        font,
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
      lastPublish = 0;
      running = true;
      function tick(now: number) {
        if (!running || disposed) return;
        const next = clamp(initial + (now - start) / BOOT_DURATION_MS);
        const publish = now - lastPublish >= 1000 / 30 || next === 1;
        if (publish) lastPublish = now;
        draw(next, publish);
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
  }, []);

  return (
    <div className="boot-splash" role="status" aria-live="polite" aria-busy="true">
      <div ref={stageRef} className="boot-splash-stage">
        <div ref={wordRef} className="boot-splash-word" role="img" aria-label="OVERTAKE">
          <span className="boot-splash-letters" aria-hidden="true">
            OVERTA
          </span>
          <span ref={slotRef} className="boot-splash-slot" aria-hidden="true">
            <span className="boot-splash-strut">A</span>
            <span ref={emberHostRef} className="boot-splash-ember">
              <span className="boot-splash-ember-align">
                <Ember pose={pose} shadow={false} />
              </span>
            </span>
          </span>
          <span ref={eRef} className="boot-splash-e" aria-hidden="true">
            E
          </span>
        </div>
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
