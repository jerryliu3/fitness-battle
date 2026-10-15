"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { clamp, DURATION_MS, frameAt } from "@/features/overtaek/motion";
import { createEmberRenderer, type EmberRenderer } from "@/features/overtaek/renderer";
import "./boot-splash.css";

type BootSplashProps = {
  /** True after the overtake animation finished but app data is still loading. */
  waiting?: boolean;
  onAnimationComplete: () => void;
};

/**
 * Product boot splash: OVERTAKE → OVERTAEK with Star Ember.
 * Plays once to completion even if the app is already ready; callers gate dismiss
 * on both animationComplete and data readiness.
 */
export function BootSplash({ waiting = false, onAnimationComplete }: BootSplashProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wordRef = useRef<HTMLDivElement>(null);
  const slotRef = useRef<HTMLSpanElement>(null);
  const eRef = useRef<HTMLSpanElement>(null);
  const fallbackRef = useRef<HTMLSpanElement>(null);
  const trailRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const completed = useRef(false);
  const onCompleteRef = useRef(onAnimationComplete);
  const [mode, setMode] = useState<"loading" | "animated" | "static">("loading");

  useEffect(() => {
    onCompleteRef.current = onAnimationComplete;
  }, [onAnimationComplete]);

  useEffect(() => {
    const stage = stageRef.current!;
    const canvas = canvasRef.current!;
    const slot = slotRef.current!;
    const letter = eRef.current!;
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    let renderer: EmberRenderer | null = null;
    let abort: AbortController | null = null;
    let disposed = false;
    let visible = true;
    let p = 0;
    let running = false;
    let raf = 0;
    let lastDraw = 0;
    let start = 0;
    let layout = {
      width: 1,
      height: 1,
      initialX: 0,
      centerY: 0,
      slotWidth: 1,
      eWidth: 1,
      unit: 1,
      font: 1,
    };

    function finish() {
      if (completed.current || disposed) return;
      completed.current = true;
      onCompleteRef.current();
    }

    function draw(progress: number) {
      if (disposed || !wordRef.current || !fallbackRef.current) return;
      p = clamp(progress);
      const frame = frameAt(p);
      const l = layout;
      const pass = frame.distance;
      const overshoot = l.font * 0.23 * Math.sin(pass * Math.PI);
      const windup = p > 0.12 && p < 0.31 ? -l.font * 0.045 * Math.sin(((p - 0.12) / 0.19) * Math.PI) : 0;
      const dx = l.eWidth * pass + overshoot + windup + frame.settle * l.font;
      const lift = l.font * 0.4 * frame.lift;
      const centerX = l.initialX + dx;
      const centerY = l.centerY - lift;
      letter.style.transform = `translate(${-l.slotWidth * frame.eShift}px,${Math.sin(frame.eShift * Math.PI) * l.font * 0.045}px)`;
      fallbackRef.current.style.transform = `translate(${dx}px,${-lift}px)`;
      if (renderer && visible) {
        renderer.draw({
          x: (centerX - l.width / 2) / l.unit,
          y: (l.height / 2 - centerY) / l.unit,
          halfWidth: l.width / (2 * l.unit),
          halfHeight: l.height / (2 * l.unit),
          yaw: frame.yaw,
          roll: frame.roll,
          tip: frame.tip,
          limb: frame.limb,
        });
      }
      trailRefs.current.forEach((trail, i) => {
        if (!trail) return;
        const length = l.font * (0.34 + i * 0.1) * frame.speed;
        trail.style.width = `${length}px`;
        trail.style.transform = `translate(${centerX - l.font * 0.55 - length - i * 3}px,${centerY + (i - 1) * l.font * 0.12}px)`;
        trail.style.opacity = String(frame.speed * (0.7 - i * 0.14));
      });
      wordRef.current.setAttribute("aria-label", p < 0.5 ? "OVERTAKE" : "OVERTAEK");
    }

    function measure() {
      if (disposed || !wordRef.current) return;
      const outer = stage.getBoundingClientRect();
      const rect = slot.getBoundingClientRect();
      const font = Number.parseFloat(getComputedStyle(wordRef.current).fontSize);
      const unit = font / 3.515;
      layout = {
        width: outer.width,
        height: outer.height,
        initialX: rect.left - outer.left + rect.width / 2,
        centerY: rect.top - outer.top + rect.height / 2 + 0.255 * unit,
        slotWidth: rect.width,
        eWidth: letter.getBoundingClientRect().width,
        unit,
        font,
      };
      renderer?.resize(outer.width, outer.height);
      draw(p);
    }

    function pause() {
      cancelAnimationFrame(raf);
      running = false;
    }

    function play() {
      if (disposed || running) return;
      if (!renderer || media.matches) {
        draw(1);
        finish();
        return;
      }
      if (p >= 1) p = 0;
      const initial = p;
      start = performance.now();
      lastDraw = 0;
      running = true;
      function tick(now: number) {
        if (!running || disposed) return;
        const next = clamp(initial + (now - start) / DURATION_MS);
        if (now - lastDraw >= 1000 / 24 || next === 1) {
          draw(next);
          lastDraw = now;
        }
        if (next < 1) raf = requestAnimationFrame(tick);
        else {
          pause();
          finish();
        }
      }
      raf = requestAnimationFrame(tick);
    }

    function staticFinal() {
      pause();
      abort?.abort();
      renderer?.destroy();
      renderer = null;
      setMode("static");
      draw(1);
      finish();
    }

    async function initialize() {
      if (disposed) return;
      if (media.matches) {
        staticFinal();
        return;
      }
      abort?.abort();
      const request = new AbortController();
      abort = request;
      setMode("loading");
      try {
        const next = await createEmberRenderer(canvas, request.signal, () => {
          if (!disposed) staticFinal();
        });
        if (disposed || request.signal.aborted) {
          next.destroy();
          return;
        }
        renderer = next;
        setMode("animated");
        measure();
        play();
      } catch {
        if (!disposed && !request.signal.aborted) staticFinal();
      }
    }

    function visibilityChanged() {
      if (document.hidden) pause();
      else if (!completed.current && renderer && !media.matches) {
        if (!running && p < 1) play();
        else draw(p);
      }
    }

    const observer = new ResizeObserver(measure);
    observer.observe(stage);
    const intersection = new IntersectionObserver((entries) => {
      visible = entries[0]?.isIntersecting ?? true;
      if (visible) draw(p);
    });
    intersection.observe(stage);
    document.addEventListener("visibilitychange", visibilityChanged);
    measure();
    void document.fonts.ready.then(() => {
      if (!disposed) measure();
    });
    void initialize();

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      running = false;
      abort?.abort();
      renderer?.destroy();
      observer.disconnect();
      intersection.disconnect();
      document.removeEventListener("visibilitychange", visibilityChanged);
    };
  }, []);

  return (
    <div className="boot-splash" role="status" aria-live="polite" aria-busy="true">
      <div ref={stageRef} className="boot-splash-stage">
        <div ref={wordRef} className="boot-splash-word" role="img" aria-label="OVERTAKE">
          <span aria-hidden="true">OVERTA</span>
          <span ref={slotRef} className="boot-splash-slot" aria-hidden="true">
            <span
              ref={fallbackRef}
              className="boot-splash-fallback"
              hidden={mode === "animated"}
            >
              <Image
                src="/brand/mascots/star-ember.webp"
                width={480}
                height={480}
                alt=""
                unoptimized
                priority
              />
            </span>
          </span>
          <span ref={eRef} className="boot-splash-e" aria-hidden="true">
            E
          </span>
        </div>
        <canvas
          ref={canvasRef}
          className="boot-splash-canvas"
          aria-hidden="true"
          hidden={mode === "static"}
        />
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            ref={(node) => {
              trailRefs.current[i] = node;
            }}
            className="boot-splash-trail"
            aria-hidden="true"
          />
        ))}
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
