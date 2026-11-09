"use client";

import { useState } from "react";
import Link from "next/link";
import { raceClock, raceEditionChart, type RaceEditionAnalytics } from "@fitness-battle/shared";
import { AppHeading } from "@/ui/section";

export function EditionAnalytics({ analytics }: { analytics: RaceEditionAnalytics }) {
  const [selected, setSelected] = useState<number | null>(null);
  const bins = raceEditionChart(analytics);
  const active = selected === null ? null : bins[selected];
  return <section className="race-edition-analytics" aria-label="Edition finish analytics">
    <AppHeading level={2} role="heading">Inside the field</AppHeading>
    <p className="rankings-note">{analytics.total.toLocaleString()} published finishes in this edition, category and timeframe. Athlete search does not change this field. <Link href="/rankings/coverage">Check coverage</Link></p>
    <div className="race-edition-metrics">{([["Fastest finish",analytics.fastestMs],["Median finish",analytics.medianMs],["Slowest finish",analytics.slowestMs]] as const).map(([label,time]) => <div key={label}><span>{label}</span><strong>{raceClock(time)}</strong></div>)}</div>
    <div className="race-edition-chart" aria-label="Inspect finish-time ranges">{bins.map(bin => <button key={bin.bucket} type="button" aria-pressed={selected===bin.bucket} aria-label={`${bin.label}: ${bin.count.toLocaleString()} finishes`} onClick={() => setSelected(bin.bucket)}><span style={{height:`${bin.height}%`}} /></button>)}</div>
    <div className="race-chart-axis"><span>{raceClock(analytics.minimumMs)}</span><span>{raceClock(analytics.minimumMs+bins.length*analytics.binWidthMs)}</span></div>
    <p className="race-bin-detail" aria-live="polite">{active ? `${active.label} · ${active.count.toLocaleString()} finishes` : "Select a bar to inspect its finish-time range."}</p>
    <details><summary>Distribution values</summary><ul>{bins.map(bin => <li key={bin.bucket}>{bin.label} · {bin.count.toLocaleString()} finishes</li>)}</ul></details>
    <p className="rankings-note">{analytics.chipCount.toLocaleString()} chip times · {analytics.officialCount.toLocaleString()} official times. These summaries describe published records; completeness is reviewed separately.</p>
  </section>;
}
