import { useEffect, useRef, useState, type ReactNode } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Polyline, Text as SvgText } from "react-native-svg";
import { SHELL_COLORS as c, type OpenLineModel, type OpenLineRange } from "@fitness-battle/shared";
import { OpenLineRangeToggle } from "../features/chart-range-toggle";
import { AppText, textStyle } from "./section";
import { ChartScrubber } from "./chart-scrubber";

const LiveCircle = Animated.createAnimatedComponent(Circle);

export function OpenLineChart({ chart, label, unit, range, onRangeChange, includeYear = true, comparisonLabel, live = false, footerAction }: {
  chart: OpenLineModel; label: string; unit: string; range: OpenLineRange;
  onRangeChange: (range: OpenLineRange) => void; includeYear?: boolean; comparisonLabel?: string; live?: boolean; footerAction?: ReactNode;
}) {
  const [selected, setSelected] = useState(false);
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => { if (!live || selected) return; const animation = Animated.loop(Animated.sequence([Animated.timing(pulse, { toValue: .25, duration: 900, useNativeDriver: true }), Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true })])); animation.start(); return () => animation.stop(); }, [live, selected, pulse]);
  const end = chart.points.at(-1);
  return <View style={{ gap: 12 }}>
    <ChartScrubber key={range} points={chart.points} width={chart.width} height={chart.height} plotTop={chart.top} plotBottom={chart.bottom} label={label} onSelectionChange={point => setSelected(!!point)}
      renderSummary={point => <View style={s.reading}><AppText role="caption" secondary>{point?.label ?? chart.date}</AppText><Text style={s.value}>{point?.value ?? chart.value}<Text style={s.unit}> {unit}</Text></Text></View>}>
      <Svg width="100%" height={chart.height} viewBox={`0 0 ${chart.width} ${chart.height}`} preserveAspectRatio="none" accessible={false}>
        {comparisonLabel && chart.previous && <SvgText x={chart.width - 4} y={Math.max(14, Number(chart.previous.trim().split(/\s+/).at(-1)?.split(",")[1] ?? 28) - 12)} textAnchor="end" fill={c.muted} fontSize={11}>··· {comparisonLabel}</SvgText>}
        {!!chart.previous && <Polyline points={chart.previous} fill="none" stroke={c.muted} strokeWidth={1.5} strokeDasharray="2 5" strokeLinecap="round" opacity={.65} />}
        <Polyline points={chart.line} fill="none" stroke={c.tennis} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
        {live && !selected && end && <LiveCircle cx={end.x} cy={end.y} r={3} fill={c.tennis} opacity={pulse} />}
        {chart.points.length === 1 && <Circle cx={chart.points[0]!.x} cy={chart.points[0]!.y} r={3} fill={c.tennis} />}
      </Svg>
    </ChartScrubber>
    <View style={s.footer}><OpenLineRangeToggle value={range} onChange={onRangeChange} includeYear={includeYear} />{footerAction}</View>
  </View>;
}
const s = StyleSheet.create({
  reading: { minHeight: 92, gap: 4 },
  value: { ...textStyle("hero"), color: c.ink, fontVariant: ["tabular-nums"] },
  unit: { ...textStyle("body"), color: c.muted },
  footer: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" },
  comparison: { flexDirection: "row", alignItems: "center", gap: 6 },
  dotted: { width: 18, borderTopWidth: 2, borderColor: c.muted, borderStyle: "dotted" },
});
