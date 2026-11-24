"use client";
import { motion, useReducedMotion } from "motion/react";
import { type UnitSystem } from "@fitness-battle/shared";
import { AppParagraph, typographyStyle } from "@/ui/section";
export function OnboardingUnits({value,onChange}:{value:UnitSystem;onChange:(value:UnitSystem)=>void}) {
 const reduced=useReducedMotion();
 return <div className="onboarding-units"><AppParagraph typographyRole="label">Units</AppParagraph><div className="onboarding-units-toggle" role="group" aria-label="Units"><motion.span aria-hidden className="onboarding-units-thumb" animate={{x:value==="us"?"0%":"100%"}} transition={{duration:reduced?0:.24}}/>{(["us","metric"] as const).map(unit=><button type="button" key={unit} aria-pressed={value===unit} onClick={()=>onChange(unit)} style={{...typographyStyle("label"),flex:1,position:"relative",border:0,background:"transparent",borderRadius:20,padding:8,color:value===unit?"var(--card, var(--app-surface-card))":"var(--ink, var(--app-text-primary))",cursor:"pointer"}}>{unit==="us"?"Imperial":"Metric"}</button>)}</div></div>;
}
