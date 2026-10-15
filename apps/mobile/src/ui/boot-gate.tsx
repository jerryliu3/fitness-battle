import { shouldShowBootSplash } from "@fitness-battle/shared/boot";
import { useState, type ReactNode } from "react";
import { useCompeteStore } from "../lib/compete-store";
import { BootSplash } from "./boot-splash";

/**
 * Force the OVERTAKE → OVERTAEK splash to finish even when local compete state
 * is already available (typical on TestFlight after AsyncStorage hydrates).
 */
export function BootGate({ children }: { children: ReactNode }) {
  const { state } = useCompeteStore();
  const [animationDone, setAnimationDone] = useState(false);
  const dataReady = state !== null;

  if (shouldShowBootSplash(dataReady, animationDone)) {
    return (
      <BootSplash
        waiting={animationDone && !dataReady}
        onAnimationComplete={() => setAnimationDone(true)}
      />
    );
  }

  return children;
}
