"use client";
import { motion, useReducedMotion } from "motion/react";
import type { AthleteCardModel } from "@fitness-battle/shared";
import { AthleteCrest } from "@/features/athlete-card/athlete-crest";

export function OnboardingAthlete({ model, label, compact = false }: { model: AthleteCardModel; label?: string; compact?: boolean }) {
  const reduced = useReducedMotion();
  return <motion.div layoutId="onboarding-athlete" className={compact ? "onboarding-mini" : "onboarding-card-hero"}
    transition={{ duration: reduced ? 0 : .35, ease: "easeInOut" }}>
    <AthleteCrest model={model} compact={compact} />
    {compact && <span className="onboarding-mini-label" key={label}>{label}</span>}
  </motion.div>;
}
