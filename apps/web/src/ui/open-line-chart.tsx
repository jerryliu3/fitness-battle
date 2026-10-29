"use client";
import { SHELL_COLORS as c, type OpenLineModel, type OpenLineRange } from "@fitness-battle/shared";
import { OpenLineRangeToggle } from "@/features/progress/chart-range-toggle";
import { ChartScrubber } from "./chart-scrubber";
import "./open-line-chart.css";

export function OpenLineChart({ chart, label, unit, range, onRangeChange, includeYear = true, comparisonLabel }: {
  chart: OpenLineModel; label: string; unit: string; range: OpenLineRange;
  onRangeChange: (range: OpenLineRange) => void; includeYear?: boolean; comparisonLabel?: string;
}) {
  return <div className="open-line-chart">
    <ChartScrubber key={range} points={chart.points} width={chart.width} height={chart.height} plotTop={chart.top} plotBottom={chart.bottom} label={label}
      renderSummary={point => <div className="open-line-reading"><span>{point?.label ?? chart.date}</span><strong>{point?.value ?? chart.value}<small> {unit}</small></strong></div>}>
      <svg viewBox={`0 0 ${chart.width} ${chart.height}`} preserveAspectRatio="none" aria-hidden="true">
        {chart.previous && <polyline points={chart.previous} fill="none" stroke={c.muted} strokeWidth="1.5" strokeDasharray="2 5" strokeLinecap="round" opacity=".65" />}
        <polyline points={chart.line} fill="none" stroke={c.fieldTeal} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {chart.points.length === 1 && <circle cx={chart.points[0]!.x} cy={chart.points[0]!.y} r="3" fill={c.fieldTeal} />}
      </svg>
    </ChartScrubber>
    <div className="open-line-footer"><OpenLineRangeToggle value={range} onChange={onRangeChange} includeYear={includeYear} />{comparisonLabel && <span className="open-line-comparison"><i aria-hidden="true" />{comparisonLabel}</span>}</div>
  </div>;
}
