"use client";

import type { EmberAction, EmberExpression } from "@fitness-battle/shared/mascot";
import { Ember } from "./ember";
import { useEmberPlayback } from "./use-ember-playback";

export function AnimatedEmber({ action = "idle", expression, playing = true, loop = true, restartKey = 0, label, className }: {
  action?: EmberAction; expression?: EmberExpression; playing?: boolean; loop?: boolean;
  restartKey?: number; label?: string; className?: string;
}) {
  const { hostRef, pose } = useEmberPlayback({ action, playing, loop, restartKey });
  return <div ref={hostRef} className={className}><Ember pose={pose} expression={expression} label={label} style={{ display: "block", width: "100%", height: "100%" }} /></div>;
}
