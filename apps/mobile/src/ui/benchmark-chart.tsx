import { createThemedStyles, useThemedStyles, useThemeColors } from "../theme";
import { useState } from "react";
import { Text, View } from "react-native";
import { Circle, G, Line, Rect } from "react-native-svg";
import { benchmarkBars, type TrainingBucket } from "@fitness-battle/shared";
import { ChartScrubber } from "./chart-scrubber";
import { ChartSvg, ChartText } from "./chart-text";
import { AppText, textStyle } from "./section";

export function BenchmarkChart({ buckets, now, dateLabel, hideSummary = false, onSelectionChange }: { buckets: TrainingBucket[]; now: Date; dateLabel: string; hideSummary?: boolean; onSelectionChange?: (point: { id: string; label: string; value: string } | undefined) => void }) {
const c=useThemeColors();
const s=useThemedStyles(sThemes);

  const chart = benchmarkBars(buckets, now);
  const [selected, setSelected] = useState<string | null>(null);
  const total = buckets.reduce((sum, bucket) => sum + bucket.movingSec, 0);
  const tickStep = buckets.length > 7 ? Math.ceil(buckets.length / 4) : 1;
  return <ChartScrubber points={chart.points} width={chart.width} height={chart.height} plotTop={chart.top} plotBottom={chart.bottom} label={`Training hours, ${dateLabel}`}
    onSelectionChange={point => { setSelected(point?.id ?? null); onSelectionChange?.(point); }}
    hideSummary={hideSummary}
    renderSummary={hideSummary ? undefined : point => <View style={s.reading}><AppText role="caption" secondary>{point?.label ?? "Active time"}</AppText><Text style={s.value}>{point?.value ?? (total / 3600).toFixed(1)}<Text style={s.unit}> hrs</Text></Text></View>}>
    <ChartSvg width="100%" height={chart.height} viewBox={`0 0 ${chart.width} ${chart.height}`} preserveAspectRatio="none" accessible={false}>
      {chart.ticks.map(tick => <G key={tick.y}><Line x1={chart.left} x2={chart.right} y1={tick.y} y2={tick.y} stroke={c.line} /><ChartText x={chart.left - 6} y={tick.y + 4} textAnchor="end" fill={c.muted}>{tick.label}</ChartText></G>)}
      {chart.bars.map((bar, i) => <G key={bar.start}>
        {selected === bar.start && <Rect x={bar.x - chart.barWidth / .62 / 2} y={chart.top} width={chart.barWidth / .62} height={chart.bottom - chart.top} fill={c.tennis} opacity={.06} />}
        <Rect x={bar.x - chart.barWidth / 2} y={bar.y} width={chart.barWidth} height={chart.bottom - bar.y} fill={c.tennis} opacity={bar.future ? .12 : selected && selected !== bar.start ? .25 : bar.partial ? .65 : 1} />
        {!bar.future && !bar.movingSec && <Circle cx={bar.x} cy={chart.bottom - 2} r={1.5} fill={c.muted} />}
        {(i % tickStep === 0 || i === buckets.length - 1) && <ChartText x={bar.x} y={chart.height - 24} textAnchor="middle" fill={c.muted}>{bar.label}</ChartText>}
      </G>)}
      <Line x1={chart.left} x2={chart.right} y1={chart.averageY} y2={chart.averageY} stroke={c.muted} strokeDasharray="2 4" />
      <ChartText x={chart.right - 16} y={chart.averageY + 4} textAnchor="middle" fill={c.muted}>Avg</ChartText>
    </ChartSvg>
  </ChartScrubber>;
}
const sThemes = createThemedStyles(themeColors=>{const c=themeColors;return {
  reading: { minHeight: 92, gap: 4 },
  value: { ...textStyle("hero"), color: c.ink, fontVariant: ["tabular-nums"] },
  unit: { ...textStyle("body"), color: c.muted },
};});
