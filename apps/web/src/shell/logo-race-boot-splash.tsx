"use client";

import { useEffect, useRef, useState } from "react";
import { clamp, LOGO_RACE_DURATION_MS, logoRaceWords } from "@fitness-battle/shared/boot";
import { SHELL_COLORS as c } from "@fitness-battle/shared";
import "./logo-race-boot-splash.css";

export function LogoRaceBootSplash({ waiting = false, onAnimationComplete, progress }: {
  waiting?: boolean;
  onAnimationComplete: () => void;
  progress?: number;
}) {
  const [position, setPosition] = useState(0);
  const onComplete = useRef(onAnimationComplete);
  onComplete.current = onAnimationComplete;
  const completed = useRef(false);
  useEffect(() => {
    if (progress !== undefined) return;
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    let disposed = false, raf = 0, elapsed = 0, last: number | null = null;
    let fontsReady = false;
    function finish() {
      setPosition(1);
      if (!disposed && !completed.current) {
        completed.current = true;
        onComplete.current();
      }
    }
    function tick(now: number) {
      if (disposed || document.hidden) return;
      if (last !== null) elapsed += now - last;
      last = now;
      const next = clamp(elapsed / LOGO_RACE_DURATION_MS);
      setPosition(next);
      if (next === 1) finish(); else raf = requestAnimationFrame(tick);
    }
    function resume() {
      cancelAnimationFrame(raf);
      last = null;
      if (disposed || completed.current || !fontsReady) return;
      if (media.matches) { finish(); return; }
      if (!document.hidden) raf = requestAnimationFrame(tick);
    }
    document.addEventListener("visibilitychange", resume);
    media.addEventListener("change", resume);
    void document.fonts.ready.then(() => { fontsReady = true; resume(); });
    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", resume);
      media.removeEventListener("change", resume);
    };
  }, [progress]);
  const words = logoRaceWords(progress ?? position);
  return <div className="logo-race-splash" style={{ backgroundColor: c.paper, color: c.ink }} role="status" aria-label="Loading Overtaek" aria-busy="true">
    <svg viewBox="0 100 760 240" className="logo-race-splash-mark" role="img" aria-label="Overtaek">
      {words.map((word, i) => <g key={i} transform={`translate(${word.x} ${word.y}) skewX(${-word.lean})`} opacity={word.opacity} aria-hidden="true">
        <text x="0" y="0" fill={word.echo ? c.tennis : c.ink} fontFamily="var(--font-overtaek), sans-serif" fontWeight="900" fontSize="124" letterSpacing="-5" textLength={word.width} lengthAdjust="spacingAndGlyphs">{word.word}</text>
      </g>)}
    </svg>
    <div className="logo-race-splash-wait" style={{ color: c.muted }}>{waiting && <><span className="logo-race-splash-spinner" style={{ borderColor: c.line, borderTopColor: c.ink }} aria-hidden="true" /><span>Loading…</span></>}</div>
  </div>;
}
