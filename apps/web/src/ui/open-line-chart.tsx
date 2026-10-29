"use client";
import { useState, type ReactNode } from "react";
import { SHELL_COLORS as c, type OpenLineModel, type OpenLineRange } from "@fitness-battle/shared";
import { OpenLineRangeToggle } from "@/features/progress/chart-range-toggle";
import { ChartScrubber } from "./chart-scrubber";
import "./open-line-chart.css";

export function OpenLineChart({ chart, label, unit, range, onRangeChange, includeYear = true, comparisonLabel, live = false, footerAction }: {
  chart: OpenLineModel; label: string; unit: string; range: OpenLineRange;
  onRangeChange: (range: OpenLineRange) => void; includeYear?: boolean; comparisonLabel?: string; live?: boolean; footerAction?: ReactNode;
}) {
  const [selected, setSelected] = useState(false);
  const end = chart.points.at(-1);
  return <div className="open-line-chart">
    <ChartScrubber key={range} points={chart.points} width={chart.width} height={chart.height} plotTop={chart.top} plotBottom={chart.bottom} label={label} onSelectionChange={point => setSelected(!!point)}
      renderSummary={point => <div className="open-line-reading"><span>{point?.label ?? chart.date}</span><strong>{point?.value ?? chart.value}<small> {unit}</small></strong></div>}>
      <svg viewBox={`0 0 ${chart.width} ${chart.height}`} preserveAspectRatio="none" aria-hidden="true">

        {chart.previous && <polyline points={chart.previous} fill="none" stroke={c.muted} strokeWidth="1.5" strokeDasharray="2 5" strokeLinecap="round" opacity=".65" />}
        <polyline points={chart.line} fill="none" stroke={c.tennis} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

        {chart.points.length === 1 && <circle cx={chart.points[0]!.x} cy={chart.points[0]!.y} r="3" fill={c.tennis} />}
      </svg>
      {comparisonLabel && chart.previous && <span className="open-line-period-label" style={{ top: `${Math.max(0, Number(chart.previous.trim().split(/\s+/).at(-1)?.split(",")[1] ?? 28) - 28) / chart.height * 100}%` }}>{comparisonLabel}</span>}
      {live && !selected && end && <span className="open-line-live" style={{ background: c.tennis, left: `${end.x / chart.width * 100}%`, top: `${end.y / chart.height * 100}%` }}><i /></span>}
    </ChartScrubber>
    <div className="open-line-footer"><OpenLineRangeToggle value={range} onChange={onRangeChange} includeYear={includeYear} />{footerAction}</div>
  </div>;
}
