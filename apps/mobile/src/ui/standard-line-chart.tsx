import { useThemeColors } from "../theme";
import { buildStandardChartGeometry, dottedCircleDasharray } from "@fitness-battle/shared";
import { chartTextProps } from "./section";
import { ChartScrubber, type ChartDatum } from "./chart-scrubber";
import { useId, useState } from "react";
import { Animated } from "react-native";
import { Polyline, Line, Defs, ClipPath, LinearGradient, Stop, Rect, G, Path, Circle } from "react-native-svg";
import { ChartSvg as Svg, ChartText as SvgText } from "./chart-text";
const AnimatedRect = Animated.createAnimatedComponent(Rect);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/** Strips unit suffixes (ms, bpm, %, x, h, etc.) from Y-axis ticks while keeping numbers and clock times. */
function stripAxisUnit(label: string): string {
  const trimmed = label.trim();
  if (/^\d+:\d+$/.test(trimmed)) return trimmed;
  return trimmed.replace(/\s*(?:ms|bpm|kcal|pts|km|mi|min|hrs|hr|steps|lbs|lb|kg|%|x|h|L|m|s)\s*$/i, "").trim();
}

export interface StandardLineChartProps {
  revealProgress?: Animated.Value;
  followRevealDot?: boolean;
  showAxes?: boolean;
  xAxisLabel?: string;
  yAxisLabel?: string;
  showSummary?: boolean;
  pointLabels?: string[];
  values: (number | null)[];
  xLabels?: [string, string, string]; // [start, mid, end]
  formatAxisY?: (value: number) => string;
  formatY?: (value: number) => string;
  selectedIdx?: number;
  onSelectIdx?: (index: number) => void;
  stroke?: string;
  axisColor?: string;
  labelColor?: string;
  height?: number;
  showArea?: boolean;
  showTrend?: boolean;
  onSelectionChange?: (point: ChartDatum | undefined) => void;
  corridor?: {
    high: number[];
    low: number[];
  };
  accessibilityLabel?: string;
  ariaLabel?: string;
}

export function StandardLineChart({ revealProgress, followRevealDot = false, showAxes = true, showSummary = false, showArea = false, showTrend = true, onSelectionChange, pointLabels, values, xLabels, formatY = (v) => `${Math.round(v)}`, formatAxisY, onSelectIdx, selectedIdx, height = 190, stroke: suppliedstroke, axisColor, labelColor, corridor, ariaLabel, accessibilityLabel }: StandardLineChartProps) {
const c=useThemeColors();
const stroke=suppliedstroke ?? c.tennis;

 const clipId = useId();
 const [scrubbedPoint, setScrubbedPoint] = useState<ChartDatum | undefined>(undefined);
 const geo = buildStandardChartGeometry(values, 340, height, corridor);
 if (!values.length || !geo.points.length) return null;
 const safeSelectedIdx = selectedIdx === undefined ? undefined : Math.max(0, Math.min(selectedIdx, values.length - 1));
 const xAt = (index: number) => geo.xStart + (index / Math.max(1, values.length - 1)) * (geo.xEnd - geo.xStart);
 const points = geo.points.map((point) => ({ id: String(point.index), x: point.x, y: point.y, label: pointLabels?.[point.index] ?? (point.index === 0 ? xLabels?.[0] ?? "Day 1" : point.index === values.length - 1 ? xLabels?.[2] ?? `Day ${point.index + 1}` : `Day ${point.index + 1}`), value: formatY(point.val) }));
 const activePoint = scrubbedPoint ?? (safeSelectedIdx !== undefined ? points.find((p) => p.id === String(safeSelectedIdx)) : undefined);
 const activeGeoPoint = activePoint ? geo.points.find((p) => String(p.index) === activePoint.id) : undefined;
 const isActiveOutOfCorridor = Boolean(
   corridor && activeGeoPoint && (activeGeoPoint.val < corridor.low[activeGeoPoint.index]! || activeGeoPoint.val > corridor.high[activeGeoPoint.index]!),
 );
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
 const corridorColor = c.tennis;
 return <ChartScrubber
   hideSummary={!showSummary}
   hideSelectionDot={Boolean(corridor)}
   selectedPointId={safeSelectedIdx === undefined ? undefined : String(safeSelectedIdx)}
   points={points}
   width={340}
   height={height}
   plotTop={geo.yTop}
   plotBottom={geo.yBottom}
   dotColor={stroke}
   dotBorderColor={c.card}
   isSelectedHollow={isActiveOutOfCorridor}
   label={ariaLabel ?? accessibilityLabel ?? "Daily trend"}
   onSelectionChange={(point) => { setScrubbedPoint(point); onSelectionChange?.(point); }}
   onSelect={id => onSelectIdx?.(Number(id))}
 >
 <Svg width="100%" height={height} viewBox={`0 0 340 ${height}`} preserveAspectRatio="none">
 <Defs>
   {showArea && geo.areaPath ? (
     <LinearGradient id={`${clipId}-area`} x1="0" y1="0" x2="0" y2="1">
       <Stop offset="0" stopColor={stroke} stopOpacity={0.28} />
       <Stop offset="1" stopColor={stroke} stopOpacity={0.02} />
     </LinearGradient>
   ) : null}
   {revealProgress && <ClipPath id={clipId}><AnimatedRect x={geo.xStart} y={0} height={height} width={revealProgress.interpolate({inputRange:[0,1],outputRange:[0,geo.xEnd-geo.xStart]})}/></ClipPath>}
   {activePoint && <>
     <ClipPath id={`${clipId}-left`}><Rect x={0} y={0} width={activePoint.x} height={height} /></ClipPath>
     <ClipPath id={`${clipId}-right`}><Rect x={activePoint.x} y={0} width={Math.max(0, 340 - activePoint.x)} height={height} /></ClipPath>
   </>}
 </Defs>
 {showAxes && <G>
   <Line x1={geo.xStart} x2={geo.xStart} y1={geo.yTop} y2={geo.yBottom} stroke={axisColor ?? c.line}/>
   <Line x1={geo.xStart} x2={geo.xEnd} y1={geo.yBottom} y2={geo.yBottom} stroke={axisColor ?? c.line}/>
   {geo.yTicks.map((tick, i) => (
     <G key={`${tick.value}-${i}`}>
       <Line x1={geo.xStart} x2={geo.xEnd} y1={tick.y} y2={tick.y} stroke={axisColor ?? c.secondary} strokeWidth={0.5} opacity={0.3} />
       <SvgText x={geo.xStart - 6} y={tick.y + 4} {...chartTextProps()} fill={labelColor ?? c.secondary} textAnchor="end">
         {stripAxisUnit((formatAxisY ?? formatY)(tick.value))}
       </SvgText>
     </G>
   ))}
   {xTicks.map((tick, i)=><SvgText key={i} x={tick.x} y={height-22} {...chartTextProps()} fill={labelColor ?? c.muted} textAnchor={tick.anchor}>{tick.label}</SvgText>)}
 </G>}
 <G clipPath={revealProgress?`url(#${clipId})`:undefined}>
   {corridor ? (
     <>
       {geo.corridorPath && <Path d={geo.corridorPath} fill={corridorColor} opacity={0.14}/>}
       {geo.corridorHighPolyline && <Polyline points={geo.corridorHighPolyline} fill="none" stroke={corridorColor} strokeWidth={1.5} strokeDasharray="3 3" opacity={0.75} />}
       {geo.corridorLowPolyline && <Polyline points={geo.corridorLowPolyline} fill="none" stroke={corridorColor} strokeWidth={1.5} strokeDasharray="3 3" opacity={0.75} />}
       {geo.points.map((p) => {
         const isOutOfBand = p.val < corridor.low[p.index]! || p.val > corridor.high[p.index]!;
         return (
           <Circle
             key={p.index}
             cx={p.x}
             cy={p.y}
             r={4}
             fill={isOutOfBand ? c.card : corridorColor}
             stroke={isOutOfBand ? corridorColor : "none"}
             strokeWidth={isOutOfBand ? 1.6 : 0}
             strokeDasharray={isOutOfBand ? dottedCircleDasharray(4, 8) : undefined}
           />
         );
       })}
     </>
   ) : (
     <>
       {showArea && geo.areaPath ? <Path d={geo.areaPath} fill={`url(#${clipId}-area)`} /> : null}
       {showTrend && !!geo.trendPolyline && (<Polyline
               points={geo.trendPolyline}
               fill="none"
               stroke={c.secondary}
               strokeWidth={1.75}
               strokeDasharray="3 3"
               strokeLinecap="round"
               strokeLinejoin="round"
             />)}
       {activePoint ? (
         <>
           <G clipPath={`url(#${clipId}-left)`}>
             {geo.polylines.map((segment) => (
               <Polyline key={segment} points={segment} fill="none" stroke={stroke} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
             ))}
           </G>
           <G clipPath={`url(#${clipId}-right)`} opacity={0.3}>
             {geo.polylines.map((segment) => (
               <Polyline key={segment} points={segment} fill="none" stroke={stroke} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
             ))}
           </G>
         </>
       ) : (
         <>
           {geo.polylines.map((segment) => (
             <Polyline key={segment} points={segment} fill="none" stroke={stroke} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
           ))}
           {!(revealProgress && followRevealDot) && geo.points.at(-1) ? (
             <Circle cx={geo.points.at(-1)!.x} cy={geo.points.at(-1)!.y} r={4} fill={stroke} stroke={c.card} strokeWidth={1.5} />
           ) : null}
         </>
       )}
     </>
   )}
 </G>
 {revealProgress && followRevealDot && !corridor && !activePoint && geo.points.length > 0 && (() => {
   const span = Math.max(1, geo.xEnd - geo.xStart);
   const inputRange: number[] = [];
   const xs: number[] = [];
   const ys: number[] = [];
   for (const pt of geo.points) {
     const t = Math.max(0, Math.min(1, (pt.x - geo.xStart) / span));
     if (inputRange.length === 0 && t > 0) {
       inputRange.push(0);
       xs.push(pt.x);
       ys.push(pt.y);
     }
     if (inputRange.length === 0 || t > inputRange[inputRange.length - 1]! + 1e-4) {
       inputRange.push(t);
       xs.push(pt.x);
       ys.push(pt.y);
     }
   }
   const last = geo.points.at(-1)!;
   if (inputRange[inputRange.length - 1]! < 1) {
     inputRange.push(1);
     xs.push(last.x);
     ys.push(last.y);
   }
   const dotX = inputRange.length >= 2 ? revealProgress.interpolate({ inputRange, outputRange: xs }) : last.x;
   const dotY = inputRange.length >= 2 ? revealProgress.interpolate({ inputRange, outputRange: ys }) : last.y;
   return <AnimatedCircle cx={dotX} cy={dotY} r={4.2} fill={stroke} stroke={c.card} strokeWidth={1.6} />;
 })()}
 </Svg>
 </ChartScrubber>;
}
