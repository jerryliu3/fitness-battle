import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Polyline } from "react-native-svg";
import { SHELL_COLORS as c, type OpenLineModel, type OpenLineRange } from "@fitness-battle/shared";
import { OpenLineRangeToggle } from "../features/chart-range-toggle";
import { AppText, textStyle } from "./section";
import { ChartScrubber } from "./chart-scrubber";

export function OpenLineChart({ chart, label, unit, range, onRangeChange, includeYear = true, comparisonLabel }: {
  chart: OpenLineModel; label: string; unit: string; range: OpenLineRange;
  onRangeChange: (range: OpenLineRange) => void; includeYear?: boolean; comparisonLabel?: string;
}) {
  return <View style={{ gap: 12 }}>
    <ChartScrubber key={range} points={chart.points} width={chart.width} height={chart.height} plotTop={chart.top} plotBottom={chart.bottom} label={label}
      renderSummary={point => <View style={s.reading}><AppText role="caption" secondary>{point?.label ?? chart.date}</AppText><Text style={s.value}>{point?.value ?? chart.value}<Text style={s.unit}> {unit}</Text></Text></View>}>
      <Svg width="100%" height={chart.height} viewBox={`0 0 ${chart.width} ${chart.height}`} preserveAspectRatio="none" accessible={false}>
        {!!chart.previous && <Polyline points={chart.previous} fill="none" stroke={c.muted} strokeWidth={1.5} strokeDasharray="2 5" strokeLinecap="round" opacity={.65} />}
        <Polyline points={chart.line} fill="none" stroke={c.fieldTeal} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
        {chart.points.length === 1 && <Circle cx={chart.points[0]!.x} cy={chart.points[0]!.y} r={3} fill={c.fieldTeal} />}
      </Svg>
    </ChartScrubber>
    <View style={s.footer}><OpenLineRangeToggle value={range} onChange={onRangeChange} includeYear={includeYear} />{comparisonLabel && <View style={s.comparison}><View style={s.dotted} /><AppText role="caption" secondary>{comparisonLabel}</AppText></View>}</View>
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
