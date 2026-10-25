"use client";
import { useState } from "react";
import { BootSplash } from "@/shell/boot-splash";
import type { BootSplashVariant } from "@fitness-battle/shared/boot";

/** Both production loaders, replayable without changing account data or boot flags. */
export function LoadingStudy() {
  const [variant, setVariant] = useState<BootSplashVariant>("logo-race");
  const [replay, setReplay] = useState(0);
  const [done, setDone] = useState(false);
  return <main>
    <div style={{ position: "fixed", top: 16, left: 16, zIndex: 1, display: "flex", gap: 12 }}>
      {(["logo-race", "ember"] as const).map(value => <button key={value} type="button" aria-pressed={variant === value} onClick={() => { setVariant(value); setReplay(replay + 1); setDone(false); }}>{value === "logo-race" ? "Over / taek" : "Ember"}</button>)}
      <button type="button" onClick={() => { setReplay(replay + 1); setDone(false); }}>Replay</button>
    </div>
    <BootSplash key={`${variant}:${replay}`} variant={variant} waiting={done} onAnimationComplete={() => setDone(true)} />
  </main>;
}
