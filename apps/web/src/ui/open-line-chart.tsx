"use client";
import { colors as c } from "@/theme/app-colors";

import { useState, type ReactNode } from "react";
import { type OpenLineModel, type OpenLineRange } from "@fitness-battle/shared";
import { OpenLineRangeToggle } from "@/features/progress/chart-range-toggle";
import { ChartScrubber } from "./chart-scrubber";
import "./open-line-chart.css";
import { ChartSvg, ChartText } from "./chart-text";

export function OpenLineChart({ chart, label, unit, range, onRangeChange, includeYear = true, comparisonLabel, live = false, footerAction, showAxes = true, showDateRange = true }: {
  chart: OpenLineModel; showAxes?: boolean; showDateRange?: boolean; label: string; unit: string; range: OpenLineRange;
  onRangeChange: (range: OpenLineRange) => void; includeYear?: boolean; comparisonLabel?: string; live?: boolean; footerAction?: ReactNode;
}) {
  const [selected, setSelected] = useState(false);
  const end = chart.points.at(-1);
  return <div className="open-line-chart">
    <ChartScrubber key={range} points={chart.points} width={chart.width} height={chart.height} plotTop={chart.top} plotBottom={chart.bottom} label={label} onSelectionChange={point => setSelected(!!point)}
      renderSummary={point => <div className="open-line-reading" style={{ minHeight: point || showDateRange ? 92 : 64 }}>{(point || showDateRange) && <span>{point?.label ?? chart.date}</span>}<strong>{point?.value ?? chart.value}<small> {unit}</small></strong></div>}>
      <ChartSvg viewBox={`0 0 ${chart.width} ${chart.height}`} preserveAspectRatio="none" aria-hidden="true">
        {showAxes && <g>

        {chart.yTicks.map((tick, i) => <g key={`${tick.y}-${i}`}><line x1={chart.left} x2={chart.right} y1={tick.y} y2={tick.y} stroke={c.line} strokeWidth={.5}/><ChartText x={chart.left - 6} y={tick.y + 4} textAnchor="end" fill={c.muted}>{tick.label}</ChartText></g>)}
        {chart.xTicks.map((tick, i) => <ChartText key={i} x={tick.x} y={chart.height - 22} textAnchor={tick.anchor ?? (i === 0 ? "start" : i === chart.xTicks.length - 1 ? "end" : "middle")} fill={c.muted}>{tick.label}</ChartText>)}
        </g>}
        {chart.previous && <polyline points={chart.previous} fill="none" stroke={c.chartComparison} strokeWidth="1.5" strokeDasharray="2 5" strokeLinecap="round" opacity=".65" />}
        {chart.bridges?.map((line, index) => <polyline key={`bridge-${index}`} points={line} fill="none" stroke={c.tennis} strokeWidth="2.5" />)}
        {chart.segments.map((line, i) => {
          if (!line) return null;
          if (!line.includes(" ")) {
            const [cx, cy] = line.split(",").map(Number);
            return <circle key={i} cx={cx} cy={cy} r={3} fill={c.tennis} />;
          }
          return <polyline key={i} points={line} fill="none" stroke={c.tennis} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />;
        })}

        {chart.points.length === 1 && <circle cx={chart.points[0]!.x} cy={chart.points[0]!.y} r="3" fill={c.tennis} />}
      </ChartSvg>
      {comparisonLabel && chart.previous && <span className="open-line-period-label" style={{ right: `${(1 - Number(chart.previous.trim().split(/\s+/).at(-1)?.split(",")[0] ?? chart.right) / chart.width) * 100}%`, top: `${Math.max(0, Number(chart.previous.trim().split(/\s+/).at(-1)?.split(",")[1] ?? 28) - 28) / chart.height * 100}%` }}>{comparisonLabel}</span>}
      {live && !selected && end && <span className="open-line-live" style={{ background: c.tennis, left: `${end.x / chart.width * 100}%`, top: `${end.y / chart.height * 100}%` }}><i /></span>}
    </ChartScrubber>
    <div className="open-line-footer"><OpenLineRangeToggle value={range} onChange={onRangeChange} includeYear={includeYear} />{footerAction}</div>
  </div>;
}
