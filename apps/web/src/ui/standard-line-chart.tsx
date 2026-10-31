"use client";
import { SHELL_COLORS as c, buildStandardChartGeometry } from "@fitness-battle/shared";
import { ChartScrubber } from "./chart-scrubber";
import { ChartSvg, ChartText } from "./chart-text";
export interface StandardLineChartProps {
  animateReveal?: boolean;
  revealDelay?: number;
  yAxisLabel?: string;
  xAxisLabel?: string;
  values: number[];
  xLabels?: [string, string, string]; // [start, mid, end]
  formatY?: (value: number) => string;
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

export function StandardLineChart({ values, xLabels, formatY = (v) => `${Math.round(v)}`, onSelectIdx, selectedIdx, height = 190, yAxisLabel = "Value", xAxisLabel, stroke = c.tennis, corridor, ariaLabel, accessibilityLabel }: StandardLineChartProps) {
 const geo = buildStandardChartGeometry(values, 340, height, corridor);
 if (!values.length) return null;
 const points = geo.points.map((point, index) => ({ id: String(index), x: point.x, y: point.y, label: index === 0 ? xLabels?.[0] ?? "Day 1" : index === values.length - 1 ? xLabels?.[2] ?? `Day ${index + 1}` : `Day ${index + 1}`, value: formatY(values[index]!) }));
 return <ChartScrubber hideSummary selectedPointId={selectedIdx === undefined ? undefined : String(selectedIdx)} points={points} width={340} height={height} plotTop={geo.yTop} plotBottom={geo.yBottom} label={ariaLabel ?? accessibilityLabel ?? "Daily trend"} onSelect={id => onSelectIdx?.(Number(id))}>
 <ChartSvg width="100%" height={height} viewBox={`0 0 340 ${height}`} preserveAspectRatio="none"><ChartText x={geo.xStart} y={14} fill={c.muted}>{yAxisLabel}</ChartText>
 <ChartText x={geo.xMid} y={height-2} textAnchor="middle" fill={c.muted}>{xAxisLabel ?? (xLabels ? "Date" : "Observation")}</ChartText>
 {[{value:geo.yMax,y:geo.yTop},{value:geo.yMid,y:geo.yMidPos},{value:geo.yMin,y:geo.yBottom}].map(tick=><ChartText key={tick.y} x={geo.xStart-6} y={tick.y+4} fill={c.muted} textAnchor="end">{formatY(tick.value)}</ChartText>)}
 {(xLabels ?? ["1", String(Math.floor(values.length/2)+1), String(values.length)]).map((label,i)=><ChartText key={i} x={[geo.xStart,geo.points[Math.floor(values.length/2)]!.x,geo.xEnd][i]} y={height-22} fill={c.muted} textAnchor={i===0?"start":i===2?"end":"middle"}>{label}</ChartText>)}
 <line x1={geo.xStart} x2={geo.xEnd} y1={geo.yBottom} y2={geo.yBottom} stroke={c.line}/>
 {geo.corridorPath && <path d={geo.corridorPath} fill={stroke} opacity={.08}/>}<polyline points={geo.polyline} fill="none" stroke={stroke} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" /></ChartSvg>
 </ChartScrubber>;
}
