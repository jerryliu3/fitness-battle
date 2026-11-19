"use client";

import { useState } from "react";
import Link from "next/link";
import { BENCHMARKS, buildStandingsDistribution, raceClock, raceEditionChart, racePercentLabel, raceDistanceSlugForBenchmark, recordedRaceBenchmarkSeconds, type RaceEditionAnalytics } from "@fitness-battle/shared";
import { AppHeading } from "@/ui/section";
import { useAuth } from "@/components/auth-context";
import { useCompete } from "@/components/compete-context";

export function EditionAnalytics({ analytics, distance, scope = "edition" }: {
  analytics: RaceEditionAnalytics;
  distance: string;
  scope?: "edition" | "distance";
}) {
  const { user } = useAuth();
  const { state } = useCompete();
  const benchmark = BENCHMARKS.running.find(option => raceDistanceSlugForBenchmark("running", option.id) === distance);
  const yourSeconds = benchmark && state && user?.mode === "supabase" && user.dataOrigin !== "synthetic"
    ? recordedRaceBenchmarkSeconds(state, benchmark.meters)
    : null;
  const overlay = yourSeconds == null ? null : buildStandingsDistribution({
    source: "published", overtaekRows: [], publishedAnalytics: analytics, yourSeconds,
  });
  const yourBucket = overlay?.yourBucket;
  const [selected, setSelected] = useState<number | null>(null);
  const bins = raceEditionChart(analytics);
  const active = selected === null ? null : bins[selected];
  return <section className="race-edition-analytics" aria-label="Edition finish analytics">
    <AppHeading level={2} role="heading">{scope==="edition" ? "Inside this race" : "Across this distance"}</AppHeading>
    <p className="rankings-note">{analytics.total.toLocaleString()} published finishes across {analytics.editionCount ?? 1} {analytics.editionCount===1 ? "race edition" : "race editions"} in the selected category and timeframe. Athlete search does not change this field. <Link href="/pace/coverage">Check coverage</Link></p>
    <div className="race-edition-metrics">{([["Fastest finish",analytics.fastestMs],["Median finish",analytics.medianMs],["Slowest finish",analytics.slowestMs]] as const).map(([label,time]) => <div key={label}><span>{label}</span><strong>{raceClock(time)}</strong></div>)}</div>
    {analytics.benchmarks && <div className="race-benchmarks-panel">
      <span className="race-benchmarks-title">Percentile finish cutoffs</span>
      <div className="race-benchmarks-grid">
        <div><span>Top 1%</span><strong>{analytics.benchmarks.top1Ms != null ? raceClock(analytics.benchmarks.top1Ms) : "—"}</strong></div>
        <div><span>Top 5%</span><strong>{analytics.benchmarks.top5Ms != null ? raceClock(analytics.benchmarks.top5Ms) : "—"}</strong></div>
        <div><span>Top 10%</span><strong>{analytics.benchmarks.top10Ms != null ? raceClock(analytics.benchmarks.top10Ms) : "—"}</strong></div>
        <div><span>Top 25%</span><strong>{analytics.benchmarks.top25Ms != null ? raceClock(analytics.benchmarks.top25Ms) : "—"}</strong></div>
        <div><span>Median 50%</span><strong>{raceClock(analytics.medianMs)}</strong></div>
      </div>
    </div>}
    {overlay?.yourTimeMs != null && <p className="rankings-note"><strong>Your moving-pace estimate · {raceClock(overlay.yourTimeMs)}</strong>
      {overlay.yourPercentile != null && ` · Estimated faster than ${racePercentLabel(overlay.yourPercentile)} of this field`}
      <br />Based on your fastest recorded moving pace from a run covering this distance.</p>}
    <div className="race-edition-chart" aria-label="Inspect finish-time ranges">{bins.map(bin => <button key={bin.bucket} type="button" aria-pressed={selected===bin.bucket} data-personal={yourBucket === bin.bucket ? "true" : undefined} aria-label={`${bin.label}: ${bin.count.toLocaleString()} finishes${yourBucket === bin.bucket ? " · your pace estimate" : ""}`} onClick={() => setSelected(bin.bucket)}><span style={{height:`${bin.height}%`}} /></button>)}</div>
    <div className="race-chart-axis"><span>{raceClock(analytics.minimumMs)}</span><span>{raceClock(analytics.minimumMs+bins.length*analytics.binWidthMs)}</span></div>
    <p className="race-bin-detail" aria-live="polite">{active ? `${active.label} · ${active.count.toLocaleString()} finishes` : "Select a bar to inspect its finish-time range."}</p>
    <details><summary>Distribution values</summary><ul>{bins.map(bin => <li key={bin.bucket}>{bin.label} · {bin.count.toLocaleString()} finishes</li>)}</ul></details>
    <p className="rankings-note">{analytics.chipCount.toLocaleString()} chip times · {analytics.officialCount.toLocaleString()} official times. Each finish is counted, so an athlete may appear more than once. Times are not adjusted for course or conditions.</p>
  </section>;
}
