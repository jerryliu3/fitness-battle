"use client";
import { useLayoutEffect, useState, type RefObject } from "react";
import { motion, useReducedMotion } from "motion/react";
import type { AthleteCardModel, OnboardingStep } from "@fitness-battle/shared";
import { AthleteCrest } from "@/features/athlete-card/athlete-crest";

/** The renderer retains its model, rotation and loaded portrait across every step. */
export function OnboardingAthlete({ model, step, root }: { model: AthleteCardModel; step: OnboardingStep; root: RefObject<HTMLElement | null> }) {
  const reduced = useReducedMotion();
  const [target, setTarget] = useState({ x: 0, y: 0, scale: 1, opacity: 0 });
  useLayoutEffect(() => {
    const host = root.current, slot = host?.querySelector<HTMLElement>("[data-card-slot]");
    if (!host || !slot) { setTarget(t => ({ ...t, opacity: 0 })); return; }
    const measure = () => {
      const a = host.getBoundingClientRect(), b = slot.getBoundingClientRect();
      setTarget({ x: b.left - a.left, y: b.top - a.top, scale: b.width / 320, opacity: 1 });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(host); observer.observe(slot);
    return () => observer.disconnect();
  }, [root, step]);
  return <motion.div className="onboarding-persistent-card" inert={step === "sport"} aria-hidden={step === "sport"}
    animate={target} transition={{ duration: reduced ? 0 : .38, ease: "easeInOut" }} style={{ transformOrigin: "top left" }}>
    <AthleteCrest model={model} active={step !== "sport"} />
  </motion.div>;
}
