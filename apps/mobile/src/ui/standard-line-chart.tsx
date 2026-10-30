import { SHELL_COLORS as c, buildStandardChartGeometry } from "@fitness-battle/shared";
import { ChartScrubber } from "./chart-scrubber";
import { useId } from "react";
import { Animated } from "react-native";
import Svg, { Polyline, Line, Text as SvgText, Defs, ClipPath, Rect, G } from "react-native-svg";
const AnimatedRect = Animated.createAnimatedComponent(Rect);

export interface StandardLineChartProps {
  revealProgress?: Animated.Value;
  showAxes?: boolean;
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
  accessibilityLabel?: string;
  ariaLabel?: string;
}

export function StandardLineChart({ revealProgress, showAxes = false, values, xLabels, formatY = (v) => `${Math.round(v)}`, onSelectIdx, selectedIdx, height = 190, ariaLabel, accessibilityLabel }: StandardLineChartProps) {
 const clipId = useId();
 const geo = buildStandardChartGeometry(values, 340, height);
 if (!values.length) return null;
 const points = geo.points.map((point, index) => ({ id: String(index), x: point.x, y: point.y, label: index === 0 ? xLabels?.[0] ?? "Day 1" : index === values.length - 1 ? xLabels?.[2] ?? `Day ${index + 1}` : `Day ${index + 1}`, value: formatY(values[index]!) }));
 return <ChartScrubber hideSummary selectedPointId={selectedIdx === undefined ? undefined : String(selectedIdx)} points={points} width={340} height={height} plotTop={geo.yTop} plotBottom={geo.yBottom} label={ariaLabel ?? accessibilityLabel ?? "Daily trend"} onSelect={id => onSelectIdx?.(Number(id))}>
 <Svg width="100%" height={height} viewBox={`0 0 340 ${height}`}>
 {revealProgress && <Defs><ClipPath id={clipId}><AnimatedRect x={geo.xStart} y={0} height={height} width={revealProgress.interpolate({inputRange:[0,1],outputRange:[0,geo.xEnd-geo.xStart]})}/></ClipPath></Defs>}
 {showAxes && <G><Line x1={geo.xStart} x2={geo.xStart} y1={geo.yTop} y2={geo.yBottom} stroke={c.line}/>
 <Line x1={geo.xStart} x2={geo.xEnd} y1={geo.yBottom} y2={geo.yBottom} stroke={c.line}/>
 {[{value:geo.yMax,y:geo.yTop},{value:geo.yMid,y:geo.yMidPos},{value:geo.yMin,y:geo.yBottom}].map(tick=><SvgText key={tick.y} x={geo.xStart-6} y={tick.y+4} fontSize={10} fill={c.muted} textAnchor="end">{formatY(tick.value)}</SvgText>)}
 {xLabels?.map((label,i)=><SvgText key={i} x={[geo.xStart,geo.xMid,geo.xEnd][i]} y={height-6} fontSize={10} fill={c.muted} textAnchor={i===0?"start":i===2?"end":"middle"}>{label}</SvgText>)}
 </G>}
 <G clipPath={revealProgress?`url(#${clipId})`:undefined}><Polyline points={geo.polyline} fill="none" stroke={c.tennis} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" /></G></Svg>
 </ChartScrubber>;
}
