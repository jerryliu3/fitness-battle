import { createThemedStyles, useThemedStyles, useThemeColors } from "../theme";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Animated, Easing, Text, View } from "react-native";
import { Circle, ClipPath, Defs, G, Line, Polyline, Rect } from "react-native-svg";
import { type ChartDatum, type EffortHistoryRange, type OpenLineModel, type OpenLineRange } from "@fitness-battle/shared";
import { OpenLineRangeToggle } from "../features/chart-range-toggle";
import { ChartSvg, ChartText } from "./chart-text";
import { AppText, textStyle } from "./section";
import { useReducedMotion } from "./use-reduced-motion";
import { ChartScrubber } from "./chart-scrubber";
import { useSceneActive } from "./use-scene-active";

export function OpenLineChart({ chart, label, unit, range, onRangeChange, includeYear = true, live = false, openHero = false, footerAction, showAxes = true, showDateRange = true, hideSummary = false, hideRangeToggle = false, uniformAspect = false, onSelectionChange }: {
  chart: OpenLineModel; showAxes?: boolean; showDateRange?: boolean; label: string; unit: string; range: OpenLineRange | EffortHistoryRange;
  onRangeChange: (range: OpenLineRange) => void; includeYear?: boolean; comparisonLabel?: string; live?: boolean; openHero?: boolean; footerAction?: ReactNode;
  hideSummary?: boolean; hideRangeToggle?: boolean; uniformAspect?: boolean; onSelectionChange?: (point: ChartDatum | undefined) => void;
}) {
const c=useThemeColors();
const s=useThemedStyles(sThemes);

  const clipId = useId();
  const reduceMotion = useReducedMotion();
  const [selectedPoint, setSelectedPoint] = useState<ChartDatum | undefined>(undefined);
  const selected = !!selectedPoint;
  const active = useSceneActive();
  const [plotWidth, setPlotWidth] = useState(0);
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    pulse.setValue(0);
    if (!live || selected || reduceMotion || !active) return;
    // Animate a native overlay, never SVG props: JS-driven SVG pulses commit the
    // Fabric shadow tree and trigger every retained ScrollView's clipping walk.
    const animation = Animated.loop(Animated.timing(pulse, {
      toValue: 1, duration: 1800, easing: Easing.inOut(Easing.ease),
      useNativeDriver: true, isInteraction: false,
    }));
    animation.start();
    return () => animation.stop();
  }, [live, selected, pulse, reduceMotion, active]);
  const end = chart.points.at(-1);
  const showRangeInHeader = !hideRangeToggle && (range === "week" || range === "fourWeeks" || range === "year");
  const dotBorderColor = openHero ? c.paper : c.card;

  const renderLines = (keyPrefix: string) => (
    <>
      {chart.bridges?.map((line, index) => <Polyline key={`${keyPrefix}-bridge-${index}`} points={line} fill="none" stroke={c.tennis} strokeWidth={2.5} />)}
      {chart.segments.map((line, i) => {
        if (!line || !line.includes(" ")) return null;
        return <Polyline key={`${keyPrefix}-seg-${i}`} points={line} fill="none" stroke={c.tennis} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />;
      })}
    </>
  );

  return <View style={{ gap: 12 }}>
    {hideSummary && showRangeInHeader && (
      <View style={s.rangeTopRight}>
        <OpenLineRangeToggle value={range} onChange={onRangeChange} includeYear={includeYear} />
      </View>
    )}
    <ChartScrubber
      key={range}
      points={chart.points}
      width={chart.width}
      height={chart.height}
      plotTop={chart.top}
      plotBottom={chart.bottom}
      dotColor={c.tennis}
      dotBorderColor={dotBorderColor}
      label={label}
      onSelectionChange={point => { setSelectedPoint(point); onSelectionChange?.(point); }}
      hideSummary={hideSummary}
      renderSummary={hideSummary ? undefined : point => (
        <View style={s.headerRow}>
          <View style={s.reading}>
            {(point || showDateRange || (live && !point)) && <AppText role="caption" secondary>{point?.label ?? (live && !point ? "Current" : chart.date)}</AppText>}
            <Text style={s.value}>{point?.value ?? chart.value}<Text style={s.unit}> {unit}</Text></Text>
          </View>
          {showRangeInHeader && <OpenLineRangeToggle value={range} onChange={onRangeChange} includeYear={includeYear} />}
        </View>
      )}
    >
      <View onLayout={event => setPlotWidth(event.nativeEvent.layout.width)} style={{ position: "relative" }}><ChartSvg width="100%" height={chart.height} viewBox={`0 0 ${chart.width} ${chart.height}`} preserveAspectRatio={uniformAspect ? "xMidYMid meet" : "none"} accessible={false}>
        {selectedPoint && (
          <Defs>
            <ClipPath id={`${clipId}-left`}><Rect x={0} y={0} width={selectedPoint.x} height={chart.height} /></ClipPath>
            <ClipPath id={`${clipId}-right`}><Rect x={selectedPoint.x} y={0} width={Math.max(0, chart.width - selectedPoint.x)} height={chart.height} /></ClipPath>
          </Defs>
        )}
        {showAxes && <G>
          {chart.yTicks.map((tick, i) => <G key={`${tick.y}-${i}`}><Line x1={chart.left} x2={chart.right} y1={tick.y} y2={tick.y} stroke={c.line} strokeWidth={.5}/><ChartText x={chart.left - 6} y={tick.y + 4} textAnchor="end" fill={c.muted}>{tick.label}</ChartText></G>)}
          {chart.xTicks.map((tick, i) => <ChartText key={i} x={tick.x} y={chart.height - 22} textAnchor={tick.anchor ?? (i === 0 ? "start" : i === chart.xTicks.length - 1 ? "end" : "middle")} fill={c.muted}>{tick.label}</ChartText>)}
        </G>}
        {!!chart.trendLine && (
          <Polyline
            points={chart.trendLine}
            fill="none"
            stroke={c.secondary}
            strokeWidth={1.75}
            strokeDasharray="3 3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
        {selectedPoint ? (
          <>
            <G clipPath={`url(#${clipId}-left)`}>{renderLines("l")}</G>
            <G clipPath={`url(#${clipId}-right)`} opacity={0.3}>{renderLines("r")}</G>
          </>
        ) : renderLines("all")}
        {live && !selected && end && (
          <Circle cx={end.x} cy={end.y} r={4} fill={c.tennis} stroke={dotBorderColor} strokeWidth={2} />
        )}
      </ChartSvg>
      {live && !selected && !reduceMotion && active && end && plotWidth > 0 && <View pointerEvents="none" style={{ position: "absolute", left: end.x * plotWidth / chart.width - 12, top: end.y - 12, width: 24, height: 24, transform: [{ scaleX: plotWidth / chart.width }] }}>
        <Animated.View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: c.tennis,
          opacity: pulse.interpolate({ inputRange: [0, .65, .9, 1], outputRange: [.5, .18, 0, 0] }),
          transform: [{ scale: pulse.interpolate({ inputRange: [0, .75, 1], outputRange: [3.5 / 12, 1, 1] }) }],
        }} />
      </View>}
      </View>
    </ChartScrubber>
    {!!footerAction && <View style={s.footer}>{footerAction}</View>}
  </View>;
}
const sThemes = createThemedStyles(themeColors=>{const c=themeColors;return {
  headerRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 8 },
  rangeTopRight: { flexDirection: "row", justifyContent: "flex-end" },
  reading: { minHeight: 58, gap: 4, flexShrink: 1 },
  value: { ...textStyle("hero"), color: c.ink, fontVariant: ["tabular-nums"] },
  unit: { ...textStyle("body"), color: c.muted },
  footer: { flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 12 },
};});
