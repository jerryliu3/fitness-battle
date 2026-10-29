"use client";
import { SHELL_COLORS as c, buildStandardChartGeometry } from "@fitness-battle/shared";
import { ChartScrubber } from "./chart-scrubber";
import { ChartSvg } from "./chart-text";
export interface StandardLineChartProps {
  animateReveal?: boolean;
  revealDelay?: number;
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

export function StandardLineChart({ values, xLabels, formatY = (v) => `${Math.round(v)}`, onSelectIdx, height = 190, ariaLabel, accessibilityLabel }: StandardLineChartProps) {
 const geo = buildStandardChartGeometry(values, 340, height);
 if (!values.length) return null;
 const points = geo.points.map((point, index) => ({ id: String(index), x: point.x, y: point.y, label: index === 0 ? xLabels?.[0] ?? "Day 1" : index === values.length - 1 ? xLabels?.[2] ?? `Day ${index + 1}` : `Day ${index + 1}`, value: formatY(values[index]!) }));
 return <ChartScrubber points={points} width={340} height={height} plotTop={geo.yTop} plotBottom={geo.yBottom} label={ariaLabel ?? accessibilityLabel ?? "Daily trend"} onSelect={id => onSelectIdx?.(Number(id))}>
 <ChartSvg width="100%" height={height} viewBox={`0 0 340 ${height}`} preserveAspectRatio="none"><polyline points={geo.polyline} fill="none" stroke={c.tennis} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" /></ChartSvg>
 </ChartScrubber>;
}
