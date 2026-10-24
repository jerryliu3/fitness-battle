"use client";
import { AppHeading } from "@/ui/section";

import Link from "next/link";
import { useCompete } from "@/components/compete-context";
import { WeekChart } from "@/features/today/week-chart";
import { EffortRail } from "@/features/progress/effort-rail";
import { WeekRecap } from "@/features/club/week-recap";
export default function WeekPage() {
  const { state } = useCompete();
  if (!state) return null;
  return <div className="club-week-detail">
    <header className="club-detail-heading"><Link className="club-icon-button" href="/today" aria-label="Return to Home">‹</Link><AppHeading level={1} role="navigationTitle">Your week</AppHeading></header>
    <WeekChart state={state} detail /><EffortRail /><WeekRecap state={state} />
  </div>;
}
