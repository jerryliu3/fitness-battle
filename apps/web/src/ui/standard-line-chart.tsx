"use client";
import { colors as c } from "@/theme/app-colors";

import { useEffect, useId, useState } from "react";
import { useReducedMotion } from "motion/react";
import { buildStandardChartGeometry } from "@fitness-battle/shared";
import { ChartScrubber, type ChartDatum } from "./chart-scrubber";
import { ChartSvg, ChartText } from "./chart-text";
export interface StandardLineChartProps {
  animateReveal?: boolean;
  revealDuration?: number;
  onRevealProgress?: (progress: number) => void;
  revealDelay?: number;
  followRevealDot?: boolean;
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
  axisColor?: string;
  labelColor?: string;
  height?: number;
  showArea?: boolean;
  corridor?: {
    high: number[];
    low: number[];
  };
  ariaLabel?: string;
  accessibilityLabel?: string;
}

export function StandardLineChart({ animateReveal = false, revealDuration = 850, onRevealProgress, revealDelay = 0, followRevealDot = false, values, xLabels, pointLabels, formatY = (v) => `${Math.round(v)}`, formatAxisY, onSelectIdx, onSelectionChange, selectedIdx, height = 190, showAxes = true, showArea = false, yAxisLabel = "Value", xAxisLabel, stroke = c.tennis, axisColor, labelColor, corridor, ariaLabel, accessibilityLabel }: StandardLineChartProps) {
 const areaId = useId();
 const revealClipId = useId();
 const reduced = useReducedMotion();
 const valuesKey = values.join(",");
 const [revealProgress, setRevealProgress] = useState(() => (!animateReveal || reduced ? 1 : 0));

 useEffect(() => {
   if (!animateReveal || reduced || typeof window === "undefined" || typeof requestAnimationFrame === "undefined") {
     setRevealProgress(1);
     return;
   }
   setRevealProgress(0);
   let raf = 0;
   let timer = 0;
   const startAnim = () => {
     const start = performance.now();
     const duration = revealDuration;
     const tick = (now: number) => {
       const t = Math.min(1, (now - start) / duration);
       setRevealProgress(1 - (1 - t) ** 3);
       if (t < 1) raf = requestAnimationFrame(tick);
     };
     raf = requestAnimationFrame(tick);
   };
   if (revealDelay > 0) timer = window.setTimeout(startAnim, revealDelay * 1000);
   else startAnim();
   return () => {
     window.clearTimeout(timer);
     cancelAnimationFrame(raf);
   };
 }, [animateReveal, revealDuration, revealDelay, reduced, valuesKey]);

 useEffect(() => { onRevealProgress?.(revealProgress); }, [revealProgress, onRevealProgress]);

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
 const isAnimatingReveal = animateReveal && !reduced && revealProgress < 1;
 const clipWidth = Math.max(0, (geo.xEnd - geo.xStart) * revealProgress);
 const leadingDot = (() => {
   if (!followRevealDot || geo.points.length === 0) return null;
   const targetX = geo.xStart + (geo.xEnd - geo.xStart) * revealProgress;
   if (geo.points.length === 1 || targetX <= geo.points[0]!.x) return { x: geo.points[0]!.x, y: geo.points[0]!.y };
   for (let i = 1; i < geo.points.length; i++) {
     const a = geo.points[i - 1]!;
     const b = geo.points[i]!;
     if (targetX <= b.x) {
       const ratio = (targetX - a.x) / Math.max(1e-4, b.x - a.x);
       return { x: targetX, y: a.y + (b.y - a.y) * ratio };
     }
   }
   const last = geo.points.at(-1)!;
   return { x: last.x, y: last.y };
 })();
 return <ChartScrubber hideSummary selectedPointId={safeSelectedIdx === undefined ? undefined : String(safeSelectedIdx)} points={points} width={340} height={height} plotTop={geo.yTop} plotBottom={geo.yBottom} label={ariaLabel ?? accessibilityLabel ?? "Daily trend"} onSelectionChange={onSelectionChange} onSelect={id => onSelectIdx?.(Number(id))}>
 <ChartSvg width="100%" height={height} viewBox={`0 0 340 ${height}`} preserveAspectRatio="none">
 {(showArea && geo.areaPath) || isAnimatingReveal ? (
  <defs>
    {showArea && geo.areaPath && (
      <linearGradient id={areaId} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={stroke} stopOpacity="0.28" />
        <stop offset="100%" stopColor={stroke} stopOpacity="0.02" />
      </linearGradient>
    )}
    {isAnimatingReveal && (
      <clipPath id={revealClipId}>
        <rect x={geo.xStart} y={0} width={clipWidth} height={height} />
      </clipPath>
    )}
  </defs>
 ) : null}
 {showAxes && <g>
 <ChartText x={geo.xStart} y={14} fill={labelColor ?? c.muted}>{yAxisLabel}</ChartText>
 <ChartText x={geo.xMid} y={height-2} textAnchor="middle" fill={labelColor ?? c.muted}>{xAxisLabel ?? (xLabels ? "Date" : "Observation")}</ChartText>
 <line x1={geo.xStart} x2={geo.xStart} y1={geo.yTop} y2={geo.yBottom} stroke={axisColor ?? c.line}/>
 <line x1={geo.xStart} x2={geo.xEnd} y1={geo.yBottom} y2={geo.yBottom} stroke={axisColor ?? c.line}/>
 {[{value:geo.yMax,y:geo.yTop},{value:geo.yMid,y:geo.yMidPos},{value:geo.yMin,y:geo.yBottom}].map((tick, i)=><ChartText key={`${tick.value}-${i}`} x={geo.xStart-6} y={tick.y+4} fill={labelColor ?? c.muted} textAnchor="end">{(formatAxisY ?? formatY)(tick.value)}</ChartText>)}
 {xTicks.map((tick, i)=><ChartText key={i} x={tick.x} y={height-22} fill={labelColor ?? c.muted} textAnchor={tick.anchor}>{tick.label}</ChartText>)}
 </g>}
 <g clipPath={isAnimatingReveal ? `url(#${revealClipId})` : undefined}>
 {showArea && geo.areaPath && <path d={geo.areaPath} fill={`url(#${areaId})`} />}
 {geo.corridorPath && <path d={geo.corridorPath} fill={stroke} opacity={0.16}/>}
 {geo.corridorHighPolyline && <polyline points={geo.corridorHighPolyline} fill="none" stroke={stroke} strokeWidth={1.5} strokeDasharray="3 3" opacity={0.65} />}
 {geo.corridorLowPolyline && <polyline points={geo.corridorLowPolyline} fill="none" stroke={stroke} strokeWidth={1.5} strokeDasharray="3 3" opacity={0.65} />}
 {geo.polylines.map((segment) => (
   <polyline key={segment} points={segment} fill="none" stroke={stroke} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
 ))}
 </g>
 {leadingDot ? (
   <circle cx={leadingDot.x} cy={leadingDot.y} r={4.2} fill={stroke} stroke={c.card} strokeWidth={1.6} />
 ) : !isAnimatingReveal && geo.points.map((p) => {
   const isSelected = safeSelectedIdx !== undefined && p.index === safeSelectedIdx;
   const isOutOfBand = corridor && (p.val < corridor.low[p.index]! || p.val > corridor.high[p.index]!);
   return (
     <circle
       key={p.index}
       cx={p.x}
       cy={p.y}
       r={isSelected ? 5 : 3.5}
       fill={isOutOfBand ? (p.val < corridor!.low[p.index]! ? c.gold : stroke) : (isSelected ? stroke : c.card)}
       stroke={stroke}
       strokeWidth={isSelected ? 2.5 : 1.5}
     />
   );
 })}</ChartSvg>
 </ChartScrubber>;
}
