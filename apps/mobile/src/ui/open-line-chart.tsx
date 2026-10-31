import { useEffect, useRef, useState, type ReactNode } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { Circle, Polyline, Line, G } from "react-native-svg";
import { SHELL_COLORS as c, type OpenLineModel, type OpenLineRange } from "@fitness-battle/shared";
import { OpenLineRangeToggle } from "../features/chart-range-toggle";
import { ChartSvg, ChartText } from "./chart-text";
import { AppText, textStyle } from "./section";
import { useReducedMotion } from "./use-reduced-motion";
import { ChartScrubber } from "./chart-scrubber";

const LiveCircle = Animated.createAnimatedComponent(Circle);

export function OpenLineChart({ chart, label, unit, range, onRangeChange, includeYear = true, comparisonLabel, live = false, footerAction }: {
  chart: OpenLineModel; label: string; unit: string; range: OpenLineRange;
  onRangeChange: (range: OpenLineRange) => void; includeYear?: boolean; comparisonLabel?: string; live?: boolean; footerAction?: ReactNode;
}) {
  const reduceMotion = useReducedMotion();
  const [selected, setSelected] = useState(false);
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!live || selected || reduceMotion) return;
    pulse.setValue(0);
    const animation = Animated.loop(Animated.timing(pulse, { toValue: 1, duration: 1800, useNativeDriver: false }));
    animation.start();
    return () => animation.stop();
  }, [live, selected, pulse, reduceMotion]);
  const end = chart.points.at(-1);
  return <View style={{ gap: 12 }}>
    <ChartScrubber key={range} points={chart.points} width={chart.width} height={chart.height} plotTop={chart.top} plotBottom={chart.bottom} label={label} onSelectionChange={point => setSelected(!!point)}
      renderSummary={point => <View style={s.reading}><AppText role="caption" secondary>{point?.label ?? chart.date}</AppText><Text style={s.value}>{point?.value ?? chart.value}<Text style={s.unit}> {unit}</Text></Text></View>}>
      <View style={{ position: "relative" }}><ChartSvg width="100%" height={chart.height} viewBox={`0 0 ${chart.width} ${chart.height}`} preserveAspectRatio="none" accessible={false}>
        <G>
          <ChartText x={chart.left} y={14} fill={c.muted}>{unit}</ChartText>
          <ChartText x={(chart.left + chart.right) / 2} y={chart.height - 2} textAnchor="middle" fill={c.muted}>Date</ChartText>
          {chart.yTicks.map(tick => <G key={tick.y}><Line x1={chart.left} x2={chart.right} y1={tick.y} y2={tick.y} stroke={c.line} strokeWidth={.5}/><ChartText x={chart.left - 6} y={tick.y + 4} textAnchor="end" fill={c.muted}>{tick.label}</ChartText></G>)}
          {chart.xTicks.map((tick, i) => <ChartText key={i} x={tick.x} y={chart.height - 22} textAnchor={i === 0 ? "start" : i === chart.xTicks.length - 1 ? "end" : "middle"} fill={c.muted}>{tick.label}</ChartText>)}
        </G>
        {!!chart.previous && <Polyline points={chart.previous} fill="none" stroke={c.muted} strokeWidth={1.5} strokeDasharray="2 5" strokeLinecap="round" opacity={.65} />}
        {chart.segments.map((line, i) => {
          if (!line) return null;
          if (!line.includes(" ")) {
            const [cx, cy] = line.split(",").map(Number);
            return <Circle key={i} cx={cx} cy={cy} r={3} fill={c.tennis} />;
          }
          return <Polyline key={i} points={line} fill="none" stroke={c.tennis} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />;
        })}
        {live && !selected && end && <Circle cx={end.x} cy={end.y} r={3.5} fill={c.tennis} />}
        {live && !selected && !reduceMotion && end && <LiveCircle cx={end.x} cy={end.y} r={pulse.interpolate({ inputRange: [0, .75, 1], outputRange: [3.5, 12, 12] })} fill={c.tennis} opacity={pulse.interpolate({ inputRange: [0, .65, .9, 1], outputRange: [.5, .18, 0, 0] })} />}
        {chart.points.length === 1 && <Circle cx={chart.points[0]!.x} cy={chart.points[0]!.y} r={3} fill={c.tennis} />}
      </ChartSvg>
      {comparisonLabel && chart.previous && <View pointerEvents="none" style={{ position: "absolute", right: 0, top: Math.max(0, Number(chart.previous.trim().split(/\s+/).at(-1)?.split(",")[1] ?? 28) - 28), maxWidth: "100%" }}><AppText role="caption" secondary>{comparisonLabel}</AppText></View>}
      </View>
    </ChartScrubber>
    <View style={s.footer}><OpenLineRangeToggle value={range} onChange={onRangeChange} includeYear={includeYear} />{footerAction}</View>
  </View>;
}
const s = StyleSheet.create({
  reading: { minHeight: 92, gap: 4 },
  value: { ...textStyle("hero"), color: c.ink, fontVariant: ["tabular-nums"] },
  unit: { ...textStyle("body"), color: c.muted },
  footer: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" },
});
