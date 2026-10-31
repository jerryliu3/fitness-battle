"use client";
import { SHELL_COLORS as c, buildStandardChartGeometry } from "@fitness-battle/shared";
import { ChartScrubber } from "./chart-scrubber";
import { ChartSvg, ChartText } from "./chart-text";
export interface StandardLineChartProps {
  animateReveal?: boolean;
  revealDelay?: number;
  showAxes?: boolean;
  yAxisLabel?: string;
  xAxisLabel?: string;
  pointLabels?: string[];
  values: number[];
  xLabels?: [string, string, string]; // [start, mid, end]
  formatY?: (value: number) => string;
  formatAxisY?: (value: number) => string;
  selectedIdx?: number;
  onSelectIdx?: (index: number) => void;
  stroke?: string;
  height?: number;
  corridor?: {
    high: number[];
    low: number[];
  };
  ariaLabel?: string;
  accessibilityLabel?: string;
}

export function StandardLineChart({ values, xLabels, pointLabels, formatY = (v) => `${Math.round(v)}`, formatAxisY, onSelectIdx, selectedIdx, height = 190, showAxes = true, yAxisLabel = "Value", xAxisLabel, stroke = c.tennis, corridor, ariaLabel, accessibilityLabel }: StandardLineChartProps) {
 const geo = buildStandardChartGeometry(values, 340, height, corridor);
 if (!values.length) return null;
 const safeSelectedIdx = selectedIdx === undefined ? undefined : Math.max(0, Math.min(selectedIdx, values.length - 1));
 const points = geo.points.map((point, index) => ({ id: String(index), x: point.x, y: point.y, label: pointLabels?.[index] ?? (index === 0 ? xLabels?.[0] ?? "Day 1" : index === values.length - 1 ? xLabels?.[2] ?? `Day ${index + 1}` : `Day ${index + 1}`), value: formatY(values[index]!) }));
 const xTicks: Array<{ x: number; label: string; anchor: "start" | "middle" | "end" }> = xLabels
   ? [
       { x: geo.xStart, label: xLabels[0], anchor: "start" },
       { x: geo.xMid, label: xLabels[1], anchor: "middle" },
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
           { x: geo.xMid, label: pointLabels?.[Math.floor((values.length - 1) / 2)] ?? String(Math.floor((values.length - 1) / 2) + 1), anchor: "middle" },
           { x: geo.xEnd, label: pointLabels?.at(-1) ?? String(values.length), anchor: "end" },
         ];
 return <ChartScrubber hideSummary selectedPointId={safeSelectedIdx === undefined ? undefined : String(safeSelectedIdx)} points={points} width={340} height={height} plotTop={geo.yTop} plotBottom={geo.yBottom} label={ariaLabel ?? accessibilityLabel ?? "Daily trend"} onSelect={id => onSelectIdx?.(Number(id))}>
 <ChartSvg width="100%" height={height} viewBox={`0 0 340 ${height}`} preserveAspectRatio="none">
 {showAxes && <g>
 <ChartText x={geo.xStart} y={14} fill={c.muted}>{yAxisLabel}</ChartText>
 <ChartText x={geo.xMid} y={height-2} textAnchor="middle" fill={c.muted}>{xAxisLabel ?? (xLabels ? "Date" : "Observation")}</ChartText>
 <line x1={geo.xStart} x2={geo.xStart} y1={geo.yTop} y2={geo.yBottom} stroke={c.line}/>
 <line x1={geo.xStart} x2={geo.xEnd} y1={geo.yBottom} y2={geo.yBottom} stroke={c.line}/>
 {[{value:geo.yMax,y:geo.yTop},{value:geo.yMid,y:geo.yMidPos},{value:geo.yMin,y:geo.yBottom}].map((tick, i)=><ChartText key={`${tick.value}-${i}`} x={geo.xStart-6} y={tick.y+4} fill={c.muted} textAnchor="end">{(formatAxisY ?? formatY)(tick.value)}</ChartText>)}
 {xTicks.map((tick, i)=><ChartText key={i} x={tick.x} y={height-22} fill={c.muted} textAnchor={tick.anchor}>{tick.label}</ChartText>)}
 </g>}
 {geo.corridorPath && <path d={geo.corridorPath} fill={stroke} opacity={0.16}/>}
 {geo.corridorHighPolyline && <polyline points={geo.corridorHighPolyline} fill="none" stroke={stroke} strokeWidth={1.5} strokeDasharray="3 3" opacity={0.65} />}
 {geo.corridorLowPolyline && <polyline points={geo.corridorLowPolyline} fill="none" stroke={stroke} strokeWidth={1.5} strokeDasharray="3 3" opacity={0.65} />}
 <polyline points={geo.polyline} fill="none" stroke={stroke} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
 {geo.points.map((p, i) => {
   const isSelected = safeSelectedIdx !== undefined && i === safeSelectedIdx;
   const isOutOfBand = corridor && (p.val < corridor.low[i]! || p.val > corridor.high[i]!);
   return (
     <circle
       key={i}
       cx={p.x}
       cy={p.y}
       r={isSelected ? 5 : 3.5}
       fill={isOutOfBand ? (p.val < corridor!.low[i]! ? c.gold : stroke) : (isSelected ? stroke : "#ffffff")}
       stroke={stroke}
       strokeWidth={isSelected ? 2.5 : 1.5}
     />
   );
 })}</ChartSvg>
 </ChartScrubber>;
}
