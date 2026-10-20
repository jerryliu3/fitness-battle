import { shouldShowBootSplash } from "@fitness-battle/shared/boot";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useCompeteStore } from "../lib/compete-store";
import { BootSplash } from "./boot-splash";

let bootAnimationCompleted = false;

/**
 * Force the OVERTAKE → OVERTAEK splash to finish even when local compete state
 * is already available (typical on TestFlight after AsyncStorage hydrates).
 */
export function BootGate({ children }: { children: ReactNode }) {
  const { state } = useCompeteStore();
  const [animationDone, setAnimationDone] = useState(bootAnimationCompleted);
  const dataReady = state !== null;
  const opened = useRef(false);
  if (dataReady && animationDone) opened.current = true;
  useEffect(() => {
    const timer = setTimeout(() => { bootAnimationCompleted = true; setAnimationDone(true); }, 8000);
    return () => clearTimeout(timer);
  }, []);

  if (!opened.current && shouldShowBootSplash(dataReady, animationDone)) {
    return (
      <BootSplash
        waiting={animationDone && !dataReady}
        onAnimationComplete={() => { bootAnimationCompleted = true; setAnimationDone(true); }}
      />
    );
  }

  return children;
}
