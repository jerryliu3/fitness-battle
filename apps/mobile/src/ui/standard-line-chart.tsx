import { useThemeColors } from "../theme";
import { buildStandardChartGeometry } from "@fitness-battle/shared";
import { chartTextProps } from "./section";
import { ChartScrubber, type ChartDatum } from "./chart-scrubber";
import { useId, useState } from "react";
import { Animated } from "react-native";
import { Polyline, Line, Defs, ClipPath, Rect, G, Path, Circle } from "react-native-svg";
import { ChartSvg as Svg, ChartText as SvgText } from "./chart-text";
const AnimatedRect = Animated.createAnimatedComponent(Rect);

/** Strips unit suffixes (ms, bpm, %, x, h, etc.) from Y-axis ticks while keeping numbers and clock times. */
function stripAxisUnit(label: string): string {
  const trimmed = label.trim();
  if (/^\d+:\d+$/.test(trimmed)) return trimmed;
  return trimmed.replace(/\s*(?:ms|bpm|kcal|pts|km|mi|min|hrs|hr|steps|lbs|lb|kg|%|x|h|L|m|s)\s*$/i, "").trim();
}

export interface StandardLineChartProps {
  revealProgress?: Animated.Value;
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
  height?: number;
  corridor?: {
    high: number[];
    low: number[];
  };
  accessibilityLabel?: string;
  ariaLabel?: string;
}

export function StandardLineChart({ revealProgress, showAxes = true, showSummary = false, pointLabels, values, xLabels, formatY = (v) => `${Math.round(v)}`, formatAxisY, onSelectIdx, selectedIdx, height = 190, stroke: suppliedstroke, corridor, ariaLabel, accessibilityLabel }: StandardLineChartProps) {
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
 return <ChartScrubber
   hideSummary={!showSummary}
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
   onSelectionChange={setScrubbedPoint}
   onSelect={id => onSelectIdx?.(Number(id))}
 >
 <Svg width="100%" height={height} viewBox={`0 0 340 ${height}`} preserveAspectRatio="none">
 <Defs>
   {revealProgress && <ClipPath id={clipId}><AnimatedRect x={geo.xStart} y={0} height={height} width={revealProgress.interpolate({inputRange:[0,1],outputRange:[0,geo.xEnd-geo.xStart]})}/></ClipPath>}
   {activePoint && <>
     <ClipPath id={`${clipId}-left`}><Rect x={0} y={0} width={activePoint.x} height={height} /></ClipPath>
     <ClipPath id={`${clipId}-right`}><Rect x={activePoint.x} y={0} width={Math.max(0, 340 - activePoint.x)} height={height} /></ClipPath>
   </>}
 </Defs>
 {showAxes && <G>
   <Line x1={geo.xStart} x2={geo.xStart} y1={geo.yTop} y2={geo.yBottom} stroke={c.line}/>
   <Line x1={geo.xStart} x2={geo.xEnd} y1={geo.yBottom} y2={geo.yBottom} stroke={c.line}/>
   {[{value:geo.yMax,y:geo.yTop},{value:geo.yMid,y:geo.yMidPos},{value:geo.yMin,y:geo.yBottom}].map((tick, i)=><SvgText key={`${tick.value}-${i}`} x={geo.xStart-6} y={tick.y+4} {...chartTextProps()} fill={c.muted} textAnchor="end">{stripAxisUnit((formatAxisY ?? formatY)(tick.value))}</SvgText>)}
   {xTicks.map((tick, i)=><SvgText key={i} x={tick.x} y={height-22} {...chartTextProps()} fill={c.muted} textAnchor={tick.anchor}>{tick.label}</SvgText>)}
 </G>}
 <G clipPath={revealProgress?`url(#${clipId})`:undefined}>
   {corridor ? (
     <>
       {geo.corridorPath && <Path d={geo.corridorPath} fill={stroke} opacity={0.14}/>}
       {geo.corridorHighPolyline && <Polyline points={geo.corridorHighPolyline} fill="none" stroke={stroke} strokeWidth={1.5} strokeDasharray="3 3" opacity={0.65} />}
       {geo.corridorLowPolyline && <Polyline points={geo.corridorLowPolyline} fill="none" stroke={stroke} strokeWidth={1.5} strokeDasharray="3 3" opacity={0.65} />}
       {geo.points.map((p) => {
         if (activePoint?.id === String(p.index)) return null;
         const isOutOfBand = p.val < corridor.low[p.index]! || p.val > corridor.high[p.index]!;
         return (
           <Circle
             key={p.index}
             cx={p.x}
             cy={p.y}
             r={3.5}
             fill={isOutOfBand ? c.card : stroke}
             stroke={isOutOfBand ? stroke : "none"}
             strokeWidth={isOutOfBand ? 1.75 : 0}
             strokeDasharray={isOutOfBand ? "2 2" : undefined}
           />
         );
       })}
     </>
   ) : (
     <>
       {!!geo.trendPolyline && (
         <Polyline
           points={geo.trendPolyline}
           fill="none"
           stroke={c.secondary}
           strokeWidth={1.75}
           strokeDasharray="3 3"
           strokeLinecap="round"
           strokeLinejoin="round"
         />
       )}
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
         geo.polylines.map((segment) => (
           <Polyline key={segment} points={segment} fill="none" stroke={stroke} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
         ))
       )}
     </>
   )}
 </G></Svg>
 </ChartScrubber>;
}
