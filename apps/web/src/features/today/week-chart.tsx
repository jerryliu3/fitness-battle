"use client";

import { useState } from "react";
import { homeTrainingLine, type CompeteState } from "@fitness-battle/shared";
import { AppHeading, TextAction } from "@/ui/section";
import { ChartFrame } from "@/ui/chart-frame";
import { OpenLineChart } from "@/ui/open-line-chart";
import { ActivityActions } from "./activity-actions";
import "./week-chart.css";

export function WeekChart({ state, detail = false, ready = true }: { state: CompeteState; detail?: boolean; ready?: boolean }) {
  const [range, setRange] = useState<"week" | "fourWeeks">("week");
  const chart = homeTrainingLine(state, range);
  return <ChartFrame ready={ready}><section className="home-portfolio" aria-label="Training hours">
    <div className="home-portfolio-header"><AppHeading level={1} role="display">Your effort</AppHeading><ActivityActions compact /></div>
    <OpenLineChart key={range} chart={chart} label="Cumulative training hours" unit="hrs" range={range} onRangeChange={next => { if (next !== "year") setRange(next); }} includeYear={false} comparisonLabel={range === "week" ? "Last week" : "Prior 4 weeks"} live footerAction={!detail ? <TextAction href="/week" label="View week →" accessibilityLabel="View your full week" /> : undefined} />
  </section></ChartFrame>;
}
