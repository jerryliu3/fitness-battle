import { homeHealthColors } from "@fitness-battle/shared";
import { createThemedStyles, useThemedStyles, useHomeHealthColors } from "../theme";
import { useState } from "react";
import { Pressable, StyleSheet, View, useWindowDimensions } from "react-native";
import Svg, { Circle, G, Line, Path, Text as SvgText } from "react-native-svg";
import { formatHealthNumber, buildHealth7DayCorridorModel, competeNow, healthSignal, healthSignalRange, homeHealthMetrics, type CompeteState } from "@fitness-battle/shared";
import { ChartScrubber, type ChartDatum } from "../ui/chart-scrubber";
import { AppText, chartTextProps } from "../ui/section";

export function DailyHealth({ state }: { state: CompeteState }) {
const colors=useHomeHealthColors();
const s=useThemedStyles(sThemes);

  const metrics = homeHealthMetrics(state);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [scrubbedPoint, setScrubbedPoint] = useState<ChartDatum | undefined>(undefined);
  const { fontScale, width } = useWindowDimensions();
  const selected = metrics.find((metric) => metric.id === expanded);

  return (
    <View style={s.panel}>
      <View style={s.header}>
        <AppText role="heading" accessibilityRole="header" style={{ color: colors.text }}>
          Today’s health
        </AppText>
      </View>
      <View style={s.grid}>
        {metrics.map((metric) => {
          const signal = healthSignal(metric.history);
          return (
            <Pressable
              key={metric.id}
              accessibilityRole="button"
              accessibilityLabel={`${metric.name}, ${metric.value}${metric.unit ? ` ${metric.unit}` : ""}, ${metric.context}`}
              accessibilityHint="Show reading details"
              accessibilityState={{ expanded: metric.id === expanded }}
              onPress={() => {
                setExpanded(expanded === metric.id ? null : metric.id);
                setScrubbedPoint(undefined);
              }}
              style={[
                s.tile,
                { width: fontScale > 1.2 ? "100%" : "47%", flexGrow: 1, padding: width < 360 ? 8 : 14 },
                expanded === metric.id && { borderColor: colors.accent },
              ]}
            >
              <AppText role="label" style={{ color: colors.text }}>
                {metric.name}
              </AppText>
              <View style={[s.signal, { maxWidth: 160 * fontScale }]}>
                <Svg width="100%" height="100%" viewBox="0 0 144 144" accessible={false} style={StyleSheet.absoluteFill}>
                  <Path d={signal.track} fill="none" stroke={colors.border} strokeWidth={7} strokeLinecap="round" />
                  {signal.ticks.map((tick, i) => (
                    <Line
                      key={i}
                      x1={tick.outer.x}
                      y1={tick.outer.y}
                      x2={tick.inner.x}
                      y2={tick.inner.y}
                      stroke={colors.comparison}
                    />
                  ))}
                  {signal.fill && (
                    <Path d={signal.fill} fill="none" stroke={colors.accent} strokeWidth={7} strokeLinecap="round" />
                  )}
                </Svg>
                <View style={s.reading}>
                  <AppText role={fontScale > 1.2 || width >= 360 ? "value" : "body"} style={s.value}>
                    {metric.value}
                  </AppText>
                  {!!metric.unit && <AppText role="caption" style={s.secondary}>{metric.unit}</AppText>}
                </View>
              </View>
              <AppText role="caption" style={s.secondary}>
                {healthSignalRange(metric)}
              </AppText>
            </Pressable>
          );
        })}
      </View>
      {selected && (() => {
        const chart = buildHealth7DayCorridorModel(selected, competeNow(state), { weekCorridorFallback: true });
        const scrubPoints: ChartDatum[] = chart.points
          .filter((p) => p.value != null && p.y != null)
          .map((p) => ({
            id: String(p.index),
            x: p.x,
            y: p.y!,
            label: p.dateLabel,
            value: selected.id === "sleep" ? p.formatted : formatHealthNumber(p.value!),
          }));
        const scrubbedModelPt = scrubbedPoint
          ? chart.points.find((p) => String(p.index) === scrubbedPoint.id)
          : undefined;
        const isScrubbedOutOfCorridor = Boolean(
          scrubbedModelPt && (scrubbedModelPt.position === "under" || scrubbedModelPt.position === "over"),
        );
        const activeReading = scrubbedPoint ? scrubbedPoint.value : selected.value;
        return (
          <View style={s.detail} accessibilityLiveRegion="polite">
            <View style={s.detailHeader}>
              <View style={s.detailTitleRow}>
                <AppText role="label" style={{ color: colors.text }}>
                  {selected.name}
                </AppText>
              </View>
              <AppText role="label" style={{ color: colors.accent, fontVariant: ["tabular-nums"] }}>
                {`${activeReading}${selected.unit && activeReading !== "—" ? ` ${selected.unit}` : ""}`}
              </AppText>
            </View>
            <View style={s.chartBox}>
              <ChartScrubber
                key={selected.id}
                hideSummary
                points={scrubPoints}
                width={chart.width}
                height={chart.height}
                plotTop={chart.plotTop}
                plotBottom={chart.plotBottom}
                dotColor={colors.accent}
                dotBorderColor={colors.tile}
                isSelectedHollow={isScrubbedOutOfCorridor}
                onSelectionChange={setScrubbedPoint}
                label={`${selected.name} 7-day trend`}
              >
                <Svg width="100%" height={chart.height} viewBox={`0 0 ${chart.width} ${chart.height}`} accessible={false}>
                  {chart.hasBaseline && (() => {
                    const yDiff = chart.corridorYBottom - chart.corridorYTop;
                    const minGap = 13;
                    const topLabelY = yDiff < minGap ? chart.corridorYTop - (minGap - yDiff) / 2 + 3 : chart.corridorYTop + 3;
                    const bottomLabelY = yDiff < minGap ? chart.corridorYBottom + (minGap - yDiff) / 2 + 3 : chart.corridorYBottom + 3;
                    return (
                      <G>
                        <Path d={chart.corridorAreaPath} fill={colors.accent} opacity={0.12} />
                        <Line
                          x1={chart.plotLeft}
                          x2={chart.plotRight}
                          y1={chart.corridorYTop}
                          y2={chart.corridorYTop}
                          stroke={colors.accent}
                          strokeDasharray="3 3"
                          opacity={0.65}
                        />
                        <Line
                          x1={chart.plotLeft}
                          x2={chart.plotRight}
                          y1={chart.corridorYBottom}
                          y2={chart.corridorYBottom}
                          stroke={colors.accent}
                          strokeDasharray="3 3"
                          opacity={0.65}
                        />
                        <SvgText
                          {...chartTextProps()}
                          x={chart.plotLeft - 4}
                          y={topLabelY}
                          textAnchor="end"
                          fill={colors.secondary}
                        >
                          {formatHealthNumber(chart.baselineHigh)}
                        </SvgText>
                        <SvgText
                          {...chartTextProps()}
                          x={chart.plotLeft - 4}
                          y={bottomLabelY}
                          textAnchor="end"
                          fill={colors.secondary}
                        >
                          {formatHealthNumber(chart.baselineLow)}
                        </SvgText>
                      </G>
                    );
                  })()}
                  {chart.points.map((p) => {
                    if (p.value == null || p.y == null) return null;
                    const isOutOfCorridor = p.position === "under" || p.position === "over";
                    return (
                      <Circle
                        key={p.index}
                        cx={p.x}
                        cy={p.y}
                        r={p.index === 6 ? 4.5 : 3.5}
                        fill={isOutOfCorridor ? colors.tile : colors.accent}
                        stroke={isOutOfCorridor ? colors.accent : "none"}
                        strokeWidth={isOutOfCorridor ? 1.75 : 0}
                        strokeDasharray={isOutOfCorridor ? "2 2" : undefined}
                      />
                    );
                  })}
                  {chart.points.map((p) => (
                    <SvgText
                      {...chartTextProps()}
                      key={`l-${p.index}`}
                      x={p.x}
                      y={chart.height - 4}
                      textAnchor="middle"
                      fill={p.index === 6 ? colors.text : colors.secondary}
                    >
                      {p.dayLabel}
                    </SvgText>
                  ))}
                </Svg>
              </ChartScrubber>
            </View>
          </View>
        );
      })()}
    </View>
  );
}

const sThemes = createThemedStyles(themeColors=>{const colors=homeHealthColors(themeColors);return {
  panel: { backgroundColor: colors.background, gap: 16 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  tile: {
    padding: 14,
    minHeight: 200,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    backgroundColor: colors.tile,
    gap: 8,
  },
  value: { textAlign: "center", color: colors.text, fontVariant: ["tabular-nums"] },
  signal: { width: "100%", aspectRatio: 1 },
  reading: { ...StyleSheet.absoluteFill, alignItems: "center", justifyContent: "center", gap: 4 },
  secondary: { color: colors.secondary },
  detail: {
    backgroundColor: colors.tile,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 14,
    gap: 10,
  },
  detailHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  detailTitleRow: { flexDirection: "row", alignItems: "baseline", flexWrap: "wrap", gap: 8 },
  alertBadge: {
    backgroundColor: "rgba(217, 119, 6, 0.12)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  alertText: { color: colors.comparison },
  chartBox: { width: "100%", overflow: "hidden" },
};});
