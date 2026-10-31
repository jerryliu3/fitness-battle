import { SHELL_COLORS as c, buildStandardChartGeometry } from "@fitness-battle/shared";
import { chartTextProps } from "./section";
import { ChartScrubber } from "./chart-scrubber";
import { useId } from "react";
import { Animated } from "react-native";
import { Polyline, Line, Defs, ClipPath, Rect, G, Path } from "react-native-svg";
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
 return <ChartScrubber hideSummary={!showSummary} selectedPointId={selectedIdx === undefined ? undefined : String(selectedIdx)} points={points} width={340} height={height} plotTop={geo.yTop} plotBottom={geo.yBottom} label={ariaLabel ?? accessibilityLabel ?? "Daily trend"} onSelect={id => onSelectIdx?.(Number(id))}>
 <Svg width="100%" height={height} viewBox={`0 0 340 ${height}`} preserveAspectRatio="none">
 {revealProgress && <Defs><ClipPath id={clipId}><AnimatedRect x={geo.xStart} y={0} height={height} width={revealProgress.interpolate({inputRange:[0,1],outputRange:[0,geo.xEnd-geo.xStart]})}/></ClipPath></Defs>}
 {showAxes && <G><SvgText x={geo.xStart} y={14} {...chartTextProps()} fill={c.muted}>{yAxisLabel}</SvgText><SvgText x={geo.xMid} y={height-2} {...chartTextProps()} fill={c.muted} textAnchor="middle">{xAxisLabel ?? (xLabels ? "Date" : "Observation")}</SvgText><Line x1={geo.xStart} x2={geo.xStart} y1={geo.yTop} y2={geo.yBottom} stroke={c.line}/>
 <Line x1={geo.xStart} x2={geo.xEnd} y1={geo.yBottom} y2={geo.yBottom} stroke={c.line}/>
 {[{value:geo.yMax,y:geo.yTop},{value:geo.yMid,y:geo.yMidPos},{value:geo.yMin,y:geo.yBottom}].map(tick=><SvgText key={tick.y} x={geo.xStart-6} y={tick.y+4} {...chartTextProps()} fill={c.muted} textAnchor="end">{(formatAxisY ?? formatY)(tick.value)}</SvgText>)}
 {(xLabels ?? [pointLabels?.[0] ?? "1", pointLabels?.[Math.floor(values.length/2)] ?? String(Math.floor(values.length/2)+1), pointLabels?.at(-1) ?? String(values.length)]).map((label,i)=><SvgText key={i} x={[geo.xStart,geo.points[Math.floor(values.length/2)]!.x,geo.xEnd][i]} y={height-22} {...chartTextProps()} fill={c.muted} textAnchor={i===0?"start":i===2?"end":"middle"}>{label}</SvgText>)}
 </G>}
 <G clipPath={revealProgress?`url(#${clipId})`:undefined}>{geo.corridorPath && <Path d={geo.corridorPath} fill={stroke} opacity={.08}/>}<Polyline points={geo.polyline} fill="none" stroke={stroke} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" /></G></Svg>
 </ChartScrubber>;
}
