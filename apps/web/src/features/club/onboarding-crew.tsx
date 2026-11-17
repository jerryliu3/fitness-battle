"use client";
import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import { APP_ICON_PATHS, onboardingCrewReplay, type GuestIntroDraft } from "@fitness-battle/shared";
import { CrewRelay } from "@/features/rally/crew-relay";

export function OnboardingCrew({ draft }: { draft: GuestIntroDraft }) {
  const [progress, setProgress] = useState(1), [playing, setPlaying] = useState(false);
  const frame = useRef(progress), reduced = useReducedMotion();
  frame.current = progress;
  useEffect(() => {
    if (!playing) return;
    if (reduced) { setProgress(1); setPlaying(false); return; }
    const from = frame.current, started = Date.now();
    const timer = setInterval(() => {
      const next = Math.min(1, from + (Date.now() - started) / 3600);
      setProgress(next); if (next === 1) setPlaying(false);
    }, 40);
    return () => clearInterval(timer);
  }, [playing, reduced]);
  return <div className="fb-stack">
    <CrewRelay {...onboardingCrewReplay(draft, progress)} userId="you" compact units="metric" />
    <div className="onboarding-actions">
      <button className="ui-back-button" type="button" aria-label={playing ? "Pause crew replay" : "Play crew replay"} onClick={() => { if (!playing && progress >= 1) setProgress(0); setPlaying(!playing); }}><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d={APP_ICON_PATHS[playing ? "pause" : "play"]} /></svg></button>
      <input type="range" aria-label="Crew replay timeline" min={0} max={1} step={.01} value={progress} onChange={e => { setPlaying(false); setProgress(Number(e.target.value)); }} style={{ flex: 1, minWidth: 0 }} />
    </div>
  </div>;
}
