"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { BENCHMARKS, buildStandingsDistribution, raceClock, raceEditionChart, racePercentLabel, raceDistanceSlugForBenchmark, recordedRaceBenchmarkSeconds, type RaceEditionAnalytics } from "@fitness-battle/shared";
import { AppHeading } from "@/ui/section";
import { useAuth } from "@/components/auth-context";
import { useCompete } from "@/components/compete-context";

export function EditionAnalytics({ analytics, distance, scope = "edition", percentile, chartFilter, onPercentile }: {
  analytics: RaceEditionAnalytics;
  distance: string;
  scope?: "edition" | "distance";
  percentile: string;
  chartFilter: boolean;
  onPercentile: (tier: string) => void;
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
  const graph = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!chartFilter && selected === null) return;
    function dismiss(event: PointerEvent) {
      if (!(event.target instanceof Element) || graph.current?.contains(event.target)) return;
      if (event.target.closest("button,a,input,select,label,summary")) return;
      setSelected(null);
      if (chartFilter) onPercentile("all");
    }
    function escape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setSelected(null);
      if (chartFilter) onPercentile("all");
    }
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", escape);
    };
  }, [chartFilter, onPercentile, selected]);
  return <section className="race-edition-analytics" aria-label="Edition finish analytics">
    <AppHeading level={2} role="heading">{scope==="edition" ? "Inside this race" : "Across this distance"}</AppHeading>
    <p className="rankings-note">{analytics.total.toLocaleString()} published finishes across {analytics.editionCount ?? 1} {analytics.editionCount===1 ? "race edition" : "race editions"} in the selected category and timeframe. Athlete search does not change this field. <Link href="/pace/coverage">Check coverage</Link></p>
    <div className="race-edition-metrics">{([["Fastest finish",analytics.fastestMs],["Median finish",analytics.medianMs],["Slowest finish",analytics.slowestMs]] as const).map(([label,time]) => <div key={label}><span>{label}</span><strong>{raceClock(time)}</strong></div>)}</div>
    <div ref={graph}>
      {analytics.benchmarks && <div className="race-benchmarks-panel">
        <span className="race-benchmarks-title">Filter by percentile</span>
        <div className="race-benchmarks-grid">{([
          ["Top 1%", "top1", analytics.benchmarks.top1Ms],
          ["Top 5%", "top5", analytics.benchmarks.top5Ms],
          ["Top 10%", "top10", analytics.benchmarks.top10Ms],
          ["Top 25%", "top25", analytics.benchmarks.top25Ms],
          ["Top 50%", "top50", analytics.medianMs],
        ] as const).map(([label, tier, time]) => <button key={tier} type="button"
          aria-pressed={percentile === tier} disabled={time == null}
          onClick={() => onPercentile(percentile === tier ? "all" : tier)}>
          <span>{label}</span><strong>{tier === "top50" ? "Faster than half" : time != null ? raceClock(time) : "—"}</strong>
        </button>)}</div>
        {chartFilter && <button type="button" className="race-chart-clear" onClick={() => onPercentile("all")}>Clear percentile filter</button>}
      </div>}
    {overlay?.yourTimeMs != null && <p className="rankings-note"><strong>Your moving-pace estimate · {raceClock(overlay.yourTimeMs)}</strong>
      {overlay.yourPercentile != null && ` · Estimated faster than ${racePercentLabel(overlay.yourPercentile)} of this field`}
      <br />Based on your fastest recorded moving pace from a run covering this distance.</p>}
    <div className="race-edition-chart" aria-label="Inspect finish-time ranges">{bins.map(bin => <button key={bin.bucket} type="button" aria-pressed={selected===bin.bucket} data-personal={yourBucket === bin.bucket ? "true" : undefined} aria-label={`${bin.label}: ${bin.count.toLocaleString()} finishes${yourBucket === bin.bucket ? " · your pace estimate" : ""}`} onClick={() => setSelected(bin.bucket)}><span style={{height:`${bin.height}%`}} /></button>)}</div>
    <div className="race-chart-axis"><span>{raceClock(analytics.minimumMs)}</span><span>{raceClock(analytics.minimumMs+bins.length*analytics.binWidthMs)}</span></div>
    <p className="race-bin-detail" aria-live="polite">{active ? `${active.label} · ${active.count.toLocaleString()} finishes` : "Select a bar to inspect its finish-time range."}</p>
    </div>
    <details><summary>Distribution values</summary><ul>{bins.map(bin => <li key={bin.bucket}>{bin.label} · {bin.count.toLocaleString()} finishes</li>)}</ul></details>
    <p className="rankings-note">{analytics.chipCount.toLocaleString()} chip times · {analytics.officialCount.toLocaleString()} official times. Each finish is counted, so an athlete may appear more than once. Times are not adjusted for course or conditions.</p>
  </section>;
}
