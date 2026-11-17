"use client";
import { motion, useReducedMotion } from "motion/react";
import { type UnitSystem } from "@fitness-battle/shared";
import { AppParagraph, typographyStyle } from "@/ui/section";
export function OnboardingUnits({value,onChange}:{value:UnitSystem;onChange:(value:UnitSystem)=>void}) {
 const reduced=useReducedMotion();
 return <div style={{display:"flex",flexDirection:"column",alignItems:"flex-start",gap:12}}><AppParagraph typographyRole="label">Units</AppParagraph><div role="group" aria-label="Units" style={{position:"relative",display:"flex",width:210,padding:4,borderRadius:24,background:"var(--line, #e3e9e7)"}}><motion.span aria-hidden style={{position:"absolute",top:4,bottom:4,left:4,width:"calc(50% - 4px)",borderRadius:20,background:"var(--ink, #142b3b)"}} animate={{x:value==="us"?"0%":"100%"}} transition={{duration:reduced?0:.24}}/>{(["us","metric"] as const).map(unit=><button type="button" key={unit} aria-pressed={value===unit} onClick={()=>onChange(unit)} style={{...typographyStyle("label"),flex:1,position:"relative",border:0,background:"transparent",borderRadius:20,padding:8,color:value===unit?"white":"var(--ink, #142b3b)",cursor:"pointer"}}>{unit==="us"?"Imperial":"Metric"}</button>)}</div></div>;
}
