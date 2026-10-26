"use client";

import { useId } from "react";
import { portfolioWeekChart, weekHoursDeltaTone, type CompeteState, SHELL_COLORS as c } from "@fitness-battle/shared";
import { motion, useReducedMotion } from "motion/react";
import { AppHeading, TextAction } from "@/ui/section";
import { ChartFrame } from "@/ui/chart-frame";
import { ChartScrubber } from "@/ui/chart-scrubber";
import { ActivityActions } from "./activity-actions";
import "./week-chart.css";

export function WeekChart({ state, detail = false, ready = true }: { state: CompeteState; detail?: boolean; ready?: boolean }) {
  const chart = portfolioWeekChart(state);
  const deltaTone = weekHoursDeltaTone(chart);
  const gradient = useId().replace(/:/g, "");
  const reduced = useReducedMotion();
  return <ChartFrame ready={ready}>
    <motion.section initial={detail && !reduced ? { y: 12, opacity: .8 } : false} animate={{ y: 0, opacity: 1 }} transition={{ duration: reduced ? 0 : .3 }} className="home-portfolio" aria-label="This week's progress">
      <div className="home-portfolio-header"><AppHeading level={2} role="heading">Current week</AppHeading><ActivityActions compact /></div>
      <div className="home-portfolio-total"><strong>{chart.currTotalHours.toFixed(1)}<span> hrs</span></strong><div><span>{chart.sessionCount} {chart.sessionCount === 1 ? "session" : "sessions"}</span><span className={`home-portfolio-delta is-${deltaTone}`}>{chart.deltaLabel}</span></div></div>
      <ChartScrubber label="This week's cumulative training hours" points={chart.inspection} width={chart.width} height={chart.height} plotTop={chart.top} plotBottom={chart.bottom} summaryOnSelection>
        <svg viewBox={`0 0 ${chart.width} ${chart.height}`} aria-hidden="true">
          <defs><linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1"><stop stopColor={c.fieldTeal} stopOpacity=".2"/><stop offset="1" stopColor={c.fieldTeal} stopOpacity="0"/></linearGradient></defs>
          <line x1={chart.left} x2={chart.right} y1={chart.bottom} y2={chart.bottom} stroke={c.line}/>
          <polyline points={chart.previous} fill="none" stroke={c.secondary} strokeWidth="1.5" strokeDasharray="3 5" opacity=".65"/>
          <polygon points={chart.area} fill={`url(#${gradient})`}/>
          <polyline points={chart.current} fill="none" stroke={c.fieldTeal} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
          <circle cx={chart.tip.x} cy={chart.tip.y} r="4.5" fill={c.fieldTeal} stroke={c.card} strokeWidth="2"/>
        </svg>
      </ChartScrubber>
      {!detail && <div className="home-portfolio-footer"><TextAction href="/week" label="View week" accessibilityLabel="View your full week" /></div>}
      <div className="home-portfolio-dates"><span>{chart.startLabel}</span><span>{chart.endLabel}</span></div>
    </motion.section>
  </ChartFrame>;
}
