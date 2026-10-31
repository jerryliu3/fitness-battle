"use client";
import { useState } from "react";
import { onboardingOvertakeCourse, onboardingOvertakeMoment } from "@fitness-battle/shared";
import { CompetitionMoment } from "./competition-moment";
import { motion, useReducedMotion } from "motion/react";
import { typographyStyle } from "@/ui/section";
export function OnboardingOvertake() {
  const [dimension,setDimension]=useState<"2d"|"4d">("4d"),[replay,setReplay]=useState(0),[autoStart,setAutoStart]=useState(true);
  const reduced=useReducedMotion();
  const play = () => { setAutoStart(true); setReplay(n=>n+1); };
  return <div className="fb-stack"><div style={{display:"flex",alignItems:"center",gap:12,justifyContent:"flex-end"}}><span style={typographyStyle("label")}>2D field</span><button type="button" role="switch" aria-label="3D course" aria-checked={dimension==="4d"} onClick={()=>setDimension(d=>d==="4d"?"2d":"4d")} style={{width:54,height:32,padding:3,border:0,borderRadius:20,background:dimension==="4d"?"var(--ink, #142b3b)":"var(--line, #e3e9e7)",cursor:"pointer"}}><motion.span style={{display:"block",width:26,height:26,borderRadius:13,background:"white",boxShadow:"0 1px 3px #0003"}} animate={{x:dimension==="4d"?22:0}} transition={{duration:reduced?0:.2}}/></button><span style={typographyStyle("label")}>3D course</span></div><CompetitionMoment key={replay} autoStart={autoStart} embedded dimension={dimension} course={onboardingOvertakeCourse} moment={onboardingOvertakeMoment} remaining={1} onConfirm={play}/></div>;
}
