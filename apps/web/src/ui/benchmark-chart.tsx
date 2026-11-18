"use client";
import { colors as c } from "@/theme/app-colors";

import { useEffect, useMemo, useState } from "react";
import { useReducedMotion } from "motion/react";
import { benchmarkBars, interpolateBenchmarkBars, type TrainingBucket } from "@fitness-battle/shared";
import { ChartScrubber } from "./chart-scrubber";
import { ChartSvg, ChartText } from "./chart-text";
import "./benchmark-chart.css";
import { useChartTween } from "./use-chart-tween";

export function BenchmarkChart({ buckets, now, dateLabel, displayTimeZone, visibleFrom }: { buckets: TrainingBucket[]; now: Date; dateLabel: string; displayTimeZone?: string; visibleFrom?: Date | null }) {
  const reduced = Boolean(useReducedMotion());
  const targetChart = useMemo(() => benchmarkBars(buckets, now, displayTimeZone, visibleFrom), [buckets, now, displayTimeZone, visibleFrom]);
  const chart = useChartTween(targetChart, dateLabel, interpolateBenchmarkBars, reduced);
  const [selected, setSelected] = useState<string | null>(null);
  useEffect(() => { setSelected(null); }, [dateLabel]);
  const total = buckets.reduce((sum, bucket) => sum + bucket.movingSec, 0);
  const tickStep = chart.bars.length > 7 ? Math.ceil(chart.bars.length / 4) : 1;
  return <div className="benchmark-chart"><ChartScrubber points={targetChart.points} width={chart.width} height={chart.height} plotTop={chart.top} plotBottom={chart.bottom} label={`Training hours, ${dateLabel}`}
    onSelectionChange={point => setSelected(point?.id ?? null)}
    renderSummary={point => <div className="benchmark-reading"><span>{point?.label ?? "Active time"}</span><strong>{point?.value ?? (total / 3600).toFixed(1)}<small> hrs</small></strong></div>}>
    <ChartSvg viewBox={`0 0 ${chart.width} ${chart.height}`} preserveAspectRatio="none" aria-hidden="true">
      {chart.ticks.map((tick, i) => <g key={`${tick.label}-${i}`}><line x1={chart.left} x2={chart.right} y1={tick.y} y2={tick.y} stroke="var(--line)" /><ChartText x={chart.left - 6} y={tick.y + 4} textAnchor="end" fill="var(--muted)">{tick.label}</ChartText></g>)}
      {chart.bars.map((bar, i) => <g key={bar.start}>
        {selected === bar.start && <rect x={bar.x - chart.barWidth / .62 / 2} y={chart.top} width={chart.barWidth / .62} height={chart.bottom - chart.top} fill={c.tennis} opacity={.06} />}
        <rect x={bar.x - chart.barWidth / 2} y={bar.y} width={chart.barWidth} height={chart.bottom - bar.y} fill={c.tennis} opacity={bar.future ? .12 : selected && selected !== bar.start ? .25 : bar.partial ? .65 : 1} />
        {!bar.future && !bar.movingSec && <circle cx={bar.x} cy={chart.bottom - 2} r={1.5} fill="var(--muted)" />}
        {(i % tickStep === 0 || i === chart.bars.length - 1) && <ChartText x={bar.x} y={chart.height - 24} textAnchor="middle" fill="var(--muted)">{bar.label}</ChartText>}
      </g>)}
      <line x1={chart.left} x2={chart.right} y1={chart.averageY} y2={chart.averageY} stroke="var(--muted)" strokeDasharray="2 4" />
      <rect x={chart.right - 32} y={chart.averageY - 9} width={32} height={18} rx={2} fill="var(--card)" />
    </ChartSvg>
  </ChartScrubber></div>;
}
