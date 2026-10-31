"use client";
import { useState } from "react";
import { benchmarkBars, SHELL_COLORS as c, type TrainingBucket } from "@fitness-battle/shared";
import { ChartScrubber } from "./chart-scrubber";
import { ChartSvg, ChartText } from "./chart-text";
import "./benchmark-chart.css";

export function BenchmarkChart({ buckets, now, dateLabel }: { buckets: TrainingBucket[]; now: Date; dateLabel: string }) {
  const chart = benchmarkBars(buckets, now);
  const [selected, setSelected] = useState<string | null>(null);
  const total = buckets.reduce((sum, bucket) => sum + bucket.movingSec, 0);
  const tickStep = buckets.length > 7 ? Math.ceil(buckets.length / 4) : 1;
  return <div className="benchmark-chart"><ChartScrubber points={chart.points} width={chart.width} height={chart.height} plotTop={chart.top} plotBottom={chart.bottom} label={`Training hours, ${dateLabel}`}
    onSelectionChange={point => setSelected(point?.id ?? null)}
    renderSummary={point => <div className="benchmark-reading"><span>{point?.label ?? "Active time"}</span><strong>{point?.value ?? (total / 3600).toFixed(1)}<small> hrs</small></strong></div>}>
    <ChartSvg viewBox={`0 0 ${chart.width} ${chart.height}`} preserveAspectRatio="none" aria-hidden="true">
      <ChartText x={chart.left} y={12} fill={c.muted}>Training (hrs)</ChartText>
      <ChartText x={(chart.left + chart.right) / 2} y={chart.height - 2} textAnchor="middle" fill={c.muted}>Date</ChartText>
      {chart.ticks.map(tick => <g key={tick.y}><line x1={chart.left} x2={chart.right} y1={tick.y} y2={tick.y} stroke="var(--line)" /><ChartText x={chart.right} y={tick.y - 6} textAnchor="end" fill="var(--muted)">{tick.label}</ChartText></g>)}
      {chart.bars.map((bar, i) => <g key={bar.start}>
        {selected === bar.start && <rect x={bar.x - chart.barWidth / .62 / 2} y={chart.top} width={chart.barWidth / .62} height={chart.bottom - chart.top} fill={c.tennis} opacity={.06} />}
        <rect x={bar.x - chart.barWidth / 2} y={bar.y} width={chart.barWidth} height={chart.bottom - bar.y} fill={c.tennis} opacity={bar.future ? .12 : selected && selected !== bar.start ? .25 : bar.partial ? .65 : 1} />
        {!bar.future && !bar.movingSec && <circle cx={bar.x} cy={chart.bottom - 2} r={1.5} fill="var(--muted)" />}
        {(i % tickStep === 0 || i === buckets.length - 1) && <ChartText x={bar.x} y={chart.height - 24} textAnchor="middle" fill="var(--muted)">{bar.label}</ChartText>}
      </g>)}
      <line x1={0} x2={chart.right} y1={chart.averageY} y2={chart.averageY} stroke="var(--muted)" strokeDasharray="2 4" />
      <rect x={0} y={chart.averageY - 9} width={30} height={18} rx={2} fill="var(--card)" />
      <ChartText x={14} y={chart.averageY + 4} textAnchor="middle" fill="var(--muted)">Avg</ChartText>
    </ChartSvg>
  </ChartScrubber></div>;
}
