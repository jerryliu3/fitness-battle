import { SHELL_COLORS as c, buildStandardChartGeometry } from "@fitness-battle/shared";
import { chartTextProps } from "./section";
import { ChartScrubber } from "./chart-scrubber";
import { useId } from "react";
import { Animated } from "react-native";
import { Polyline, Line, Defs, ClipPath, Rect, G, Path, Circle } from "react-native-svg";
import { ChartSvg as Svg, ChartText as SvgText } from "./chart-text";
const AnimatedRect = Animated.createAnimatedComponent(Rect);

export interface StandardLineChartProps {
  revealProgress?: Animated.Value;
  showAxes?: boolean;
  xAxisLabel?: string;
  yAxisLabel?: string;
  showSummary?: boolean;
  pointLabels?: string[];
  values: number[];
  xLabels?: [string, string, string]; // [start, mid, end]
  formatAxisY?: (value: number) => string;
  formatY?: (value: number) => string;
  selectedIdx?: number;
  onSelectIdx?: (index: number) => void;
  stroke?: string;
  height?: number;
  corridor?: {
    high: number[];
    low: number[];
  };
  accessibilityLabel?: string;
  ariaLabel?: string;
}

export function StandardLineChart({ revealProgress, showAxes = true, showSummary = false, xAxisLabel, yAxisLabel = "Value", pointLabels, values, xLabels, formatY = (v) => `${Math.round(v)}`, formatAxisY, onSelectIdx, selectedIdx, height = 190, stroke = c.tennis, corridor, ariaLabel, accessibilityLabel }: StandardLineChartProps) {
 const clipId = useId();
 const geo = buildStandardChartGeometry(values, 340, height, corridor);
 if (!values.length) return null;
 const points = geo.points.map((point, index) => ({ id: String(index), x: point.x, y: point.y, label: pointLabels?.[index] ?? (index === 0 ? xLabels?.[0] ?? "Day 1" : index === values.length - 1 ? xLabels?.[2] ?? `Day ${index + 1}` : `Day ${index + 1}`), value: formatY(values[index]!) }));
 const xTicks: Array<{ x: number; label: string; anchor: "start" | "middle" | "end" }> = xLabels
   ? [
       { x: geo.xStart, label: xLabels[0], anchor: "start" },
       { x: geo.points[Math.floor((values.length - 1) / 2)]!.x, label: xLabels[1], anchor: "middle" },
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
           { x: geo.points[Math.floor((values.length - 1) / 2)]!.x, label: pointLabels?.[Math.floor((values.length - 1) / 2)] ?? String(Math.floor((values.length - 1) / 2) + 1), anchor: "middle" },
           { x: geo.xEnd, label: pointLabels?.at(-1) ?? String(values.length), anchor: "end" },
         ];
 return <ChartScrubber hideSummary={!showSummary} selectedPointId={selectedIdx === undefined ? undefined : String(selectedIdx)} points={points} width={340} height={height} plotTop={geo.yTop} plotBottom={geo.yBottom} label={ariaLabel ?? accessibilityLabel ?? "Daily trend"} onSelect={id => onSelectIdx?.(Number(id))}>
 <Svg width="100%" height={height} viewBox={`0 0 340 ${height}`} preserveAspectRatio="none">
 {revealProgress && <Defs><ClipPath id={clipId}><AnimatedRect x={geo.xStart} y={0} height={height} width={revealProgress.interpolate({inputRange:[0,1],outputRange:[0,geo.xEnd-geo.xStart]})}/></ClipPath></Defs>}
 {showAxes && <G><SvgText x={geo.xStart} y={14} {...chartTextProps()} fill={c.muted}>{yAxisLabel}</SvgText><SvgText x={geo.xMid} y={height-2} {...chartTextProps()} fill={c.muted} textAnchor="middle">{xAxisLabel ?? (xLabels ? "Date" : "Observation")}</SvgText><Line x1={geo.xStart} x2={geo.xStart} y1={geo.yTop} y2={geo.yBottom} stroke={c.line}/>
 <Line x1={geo.xStart} x2={geo.xEnd} y1={geo.yBottom} y2={geo.yBottom} stroke={c.line}/>
 {[{value:geo.yMax,y:geo.yTop},{value:geo.yMid,y:geo.yMidPos},{value:geo.yMin,y:geo.yBottom}].map((tick, i)=><SvgText key={`${tick.value}-${i}`} x={geo.xStart-6} y={tick.y+4} {...chartTextProps()} fill={c.muted} textAnchor="end">{(formatAxisY ?? formatY)(tick.value)}</SvgText>)}
 {xTicks.map((tick, i)=><SvgText key={i} x={tick.x} y={height-22} {...chartTextProps()} fill={c.muted} textAnchor={tick.anchor}>{tick.label}</SvgText>)}
 </G>}
 <G clipPath={revealProgress?`url(#${clipId})`:undefined}>{geo.corridorPath && <Path d={geo.corridorPath} fill={stroke} opacity={.08}/>}<Polyline points={geo.polyline} fill="none" stroke={stroke} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />{values.length === 1 && <Circle cx={geo.points[0]!.x} cy={geo.points[0]!.y} r={3} fill={stroke} />}</G></Svg>
 </ChartScrubber>;
}
