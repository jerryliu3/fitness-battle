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
 const points = geo.points.map((point, index) => ({ id: String(index), x: point.x, y: point.y, label: pointLabels?.[index] ?? (index === 0 ? xLabels?.[0] ?? "Day 1" : index === values.length - 1 ? xLabels?.[2] ?? `Day ${index + 1}` : `Day ${index + 1}`), value: formatY(values[index]!) }));
 return <ChartScrubber hideSummary selectedPointId={selectedIdx === undefined ? undefined : String(selectedIdx)} points={points} width={340} height={height} plotTop={geo.yTop} plotBottom={geo.yBottom} label={ariaLabel ?? accessibilityLabel ?? "Daily trend"} onSelect={id => onSelectIdx?.(Number(id))}>
 <ChartSvg width="100%" height={height} viewBox={`0 0 340 ${height}`} preserveAspectRatio="none">
 {showAxes && <g>
 <ChartText x={geo.xStart} y={14} fill={c.muted}>{yAxisLabel}</ChartText>
 <ChartText x={geo.xMid} y={height-2} textAnchor="middle" fill={c.muted}>{xAxisLabel ?? (xLabels ? "Date" : "Observation")}</ChartText>
 <line x1={geo.xStart} x2={geo.xStart} y1={geo.yTop} y2={geo.yBottom} stroke={c.line}/>
 <line x1={geo.xStart} x2={geo.xEnd} y1={geo.yBottom} y2={geo.yBottom} stroke={c.line}/>
 {[{value:geo.yMax,y:geo.yTop},{value:geo.yMid,y:geo.yMidPos},{value:geo.yMin,y:geo.yBottom}].map((tick, i)=><ChartText key={`${tick.value}-${i}`} x={geo.xStart-6} y={tick.y+4} fill={c.muted} textAnchor="end">{(formatAxisY ?? formatY)(tick.value)}</ChartText>)}
 {(xLabels ?? [pointLabels?.[0] ?? "1", pointLabels?.[Math.floor(values.length/2)] ?? String(Math.floor(values.length/2)+1), pointLabels?.at(-1) ?? String(values.length)]).map((label,i)=><ChartText key={i} x={[geo.xStart,geo.xMid,geo.xEnd][i]} y={height-22} fill={c.muted} textAnchor={i===0?"start":i===2?"end":"middle"}>{label}</ChartText>)}
 </g>}
 {geo.corridorPath && <path d={geo.corridorPath} fill={stroke} opacity={.08}/>}<polyline points={geo.polyline} fill="none" stroke={stroke} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" /></ChartSvg>
 </ChartScrubber>;
}
