"use client";
import { defaultLook } from "@fitness-battle/pursuit/avatar";
import { LivePursuit, type PursuitProps } from "@fitness-battle/pursuit/live-pursuit";
export function PursuitPreview(props: Omit<PursuitProps,"look"|"camera">) {
  return <div className="club-pursuit"><LivePursuit {...props} look={defaultLook} camera="follow"/></div>;
}
