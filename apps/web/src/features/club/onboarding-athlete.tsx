"use client";
import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import type { AthleteCardModel } from "@fitness-battle/shared";
import { AthleteCrest } from "@/features/athlete-card/athlete-crest";
import { Sheet } from "@/ui/sheet";

/** The compact face stays readable without mounting a second 3D renderer. */
export function OnboardingAthlete({ model, label, compact = false }: { model: AthleteCardModel; label?: string; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const reduced = useReducedMotion();
  return <>
    <motion.div layoutId="onboarding-athlete" className={compact ? "onboarding-mini" : "onboarding-card-hero"}
      transition={{ duration: reduced ? 0 : .35, ease: "easeInOut" }}>
      {compact ? <button type="button" aria-label={`Open ${model.name}'s athlete card`} onClick={() => setOpen(true)}>
        {model.avatarUrl ? <img src={model.avatarUrl} alt="" /> : <span className="onboarding-mini-portrait">{model.initials}</span>}
        <strong>{model.name}</strong><span className="onboarding-mini-label" key={label}>{label}</span>
      </button> : <AthleteCrest model={model} />}
    </motion.div>
    {compact && <Sheet open={open} title={model.name} body={label ?? "Your athlete"} onClose={() => setOpen(false)}>
      {open && <AthleteCrest model={model} />}
    </Sheet>}
  </>;
}
