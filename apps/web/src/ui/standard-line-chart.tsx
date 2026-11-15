"use client";
import { colors as c } from "@/theme/app-colors";

import { useId } from "react";
import { buildStandardChartGeometry } from "@fitness-battle/shared";
import { ChartScrubber, type ChartDatum } from "./chart-scrubber";
import { ChartSvg, ChartText } from "./chart-text";
export interface StandardLineChartProps {
  animateReveal?: boolean;
  revealDelay?: number;
  showAxes?: boolean;
  yAxisLabel?: string;
  xAxisLabel?: string;
  pointLabels?: string[];
  values: (number | null)[];
  xLabels?: [string, string, string]; // [start, mid, end]
  formatY?: (value: number) => string;
  formatAxisY?: (value: number) => string;
  selectedIdx?: number;
  onSelectIdx?: (index: number) => void;
  onSelectionChange?: (point: ChartDatum | undefined) => void;
  stroke?: string;
  height?: number;
  showArea?: boolean;
  corridor?: {
    high: number[];
    low: number[];
  };
  ariaLabel?: string;
  accessibilityLabel?: string;
}

export function StandardLineChart({ values, xLabels, pointLabels, formatY = (v) => `${Math.round(v)}`, formatAxisY, onSelectIdx, onSelectionChange, selectedIdx, height = 190, showAxes = true, showArea = false, yAxisLabel = "Value", xAxisLabel, stroke = c.tennis, corridor, ariaLabel, accessibilityLabel }: StandardLineChartProps) {
 const areaId = useId();
 const geo = buildStandardChartGeometry(values, 340, height, corridor);
 if (!values.length || !geo.points.length) return null;
 const safeSelectedIdx = selectedIdx === undefined ? undefined : Math.max(0, Math.min(selectedIdx, values.length - 1));
 const xAt = (index: number) => geo.xStart + (index / Math.max(1, values.length - 1)) * (geo.xEnd - geo.xStart);
 const points = geo.points.map((point) => ({ id: String(point.index), x: point.x, y: point.y, label: pointLabels?.[point.index] ?? (point.index === 0 ? xLabels?.[0] ?? "Day 1" : point.index === values.length - 1 ? xLabels?.[2] ?? `Day ${point.index + 1}` : `Day ${point.index + 1}`), value: formatY(point.val) }));
 const xTicks: Array<{ x: number; label: string; anchor: "start" | "middle" | "end" }> = xLabels
   ? [
       { x: geo.xStart, label: xLabels[0], anchor: "start" },
       { x: xAt(Math.floor((values.length - 1) / 2)), label: xLabels[1], anchor: "middle" },
       { x: geo.xEnd, label: xLabels[2], anchor: "end" },
     ]
   : values.length === 1
     ? [{ x: geo.xStart, label: pointLabels?.[0] ?? "1", anchor: "start" }]
     : values.length === 2
       ? [
           { x: geo.xStart, label: pointLabels?.[0] ?? "1", anchor: "start" },
           { x: geo.xEnd, label: pointLabels?.[1] ?? "2", anchor: "end" },
         ]
       : [
           { x: geo.xStart, label: pointLabels?.[0] ?? "1", anchor: "start" },
           { x: xAt(Math.floor((values.length - 1) / 2)), label: pointLabels?.[Math.floor((values.length - 1) / 2)] ?? String(Math.floor((values.length - 1) / 2) + 1), anchor: "middle" },
           { x: geo.xEnd, label: pointLabels?.at(-1) ?? String(values.length), anchor: "end" },
         ];
 return <ChartScrubber hideSummary selectedPointId={safeSelectedIdx === undefined ? undefined : String(safeSelectedIdx)} points={points} width={340} height={height} plotTop={geo.yTop} plotBottom={geo.yBottom} label={ariaLabel ?? accessibilityLabel ?? "Daily trend"} onSelectionChange={onSelectionChange} onSelect={id => onSelectIdx?.(Number(id))}>
 <ChartSvg width="100%" height={height} viewBox={`0 0 340 ${height}`} preserveAspectRatio="none">
 {showArea && geo.areaPath && (
  <defs>
    <linearGradient id={areaId} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor={stroke} stopOpacity="0.28" />
      <stop offset="100%" stopColor={stroke} stopOpacity="0.02" />
    </linearGradient>
  </defs>
 )}
 {showAxes && <g>
 <ChartText x={geo.xStart} y={14} fill={c.muted}>{yAxisLabel}</ChartText>
 <ChartText x={geo.xMid} y={height-2} textAnchor="middle" fill={c.muted}>{xAxisLabel ?? (xLabels ? "Date" : "Observation")}</ChartText>
 <line x1={geo.xStart} x2={geo.xStart} y1={geo.yTop} y2={geo.yBottom} stroke={c.line}/>
 <line x1={geo.xStart} x2={geo.xEnd} y1={geo.yBottom} y2={geo.yBottom} stroke={c.line}/>
 {[{value:geo.yMax,y:geo.yTop},{value:geo.yMid,y:geo.yMidPos},{value:geo.yMin,y:geo.yBottom}].map((tick, i)=><ChartText key={`${tick.value}-${i}`} x={geo.xStart-6} y={tick.y+4} fill={c.muted} textAnchor="end">{(formatAxisY ?? formatY)(tick.value)}</ChartText>)}
 {xTicks.map((tick, i)=><ChartText key={i} x={tick.x} y={height-22} fill={c.muted} textAnchor={tick.anchor}>{tick.label}</ChartText>)}
 </g>}
 {showArea && geo.areaPath && <path d={geo.areaPath} fill={`url(#${areaId})`} />}
 {geo.corridorPath && <path d={geo.corridorPath} fill={stroke} opacity={0.16}/>}
 {geo.corridorHighPolyline && <polyline points={geo.corridorHighPolyline} fill="none" stroke={stroke} strokeWidth={1.5} strokeDasharray="3 3" opacity={0.65} />}
 {geo.corridorLowPolyline && <polyline points={geo.corridorLowPolyline} fill="none" stroke={stroke} strokeWidth={1.5} strokeDasharray="3 3" opacity={0.65} />}
 {geo.polylines.map((segment) => (
   <polyline key={segment} points={segment} fill="none" stroke={stroke} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
 ))}
 {geo.points.map((p) => {
   const isSelected = safeSelectedIdx !== undefined && p.index === safeSelectedIdx;
   const isOutOfBand = corridor && (p.val < corridor.low[p.index]! || p.val > corridor.high[p.index]!);
   return (
     <circle
       key={p.index}
       cx={p.x}
       cy={p.y}
       r={isSelected ? 5 : 3.5}
       fill={isOutOfBand ? (p.val < corridor!.low[p.index]! ? c.gold : stroke) : (isSelected ? stroke : "#ffffff")}
       stroke={stroke}
       strokeWidth={isSelected ? 2.5 : 1.5}
     />
   );
 })}</ChartSvg>
 </ChartScrubber>;
}
