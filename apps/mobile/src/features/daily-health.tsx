import { homeHealthColors } from "@fitness-battle/shared";
import { createThemedStyles, useThemedStyles, useHomeHealthColors } from "../theme";
import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Pressable, StyleSheet, View, useWindowDimensions } from "react-native";
import Svg, { Circle, G, Line, Path, Text as SvgText } from "react-native-svg";
import { formatHealthNumber, buildHealth7DayCorridorModel, competeNow, dottedCircleDasharray, healthSignal, healthSignalBounds, homeHealthMetrics, type CompeteState } from "@fitness-battle/shared";
import { ChartScrubber, type ChartDatum } from "../ui/chart-scrubber";
import { AppText, chartTextProps } from "../ui/section";
import { useReducedMotion } from "../ui/use-reduced-motion";

export function DailyHealth({ state }: { state: CompeteState }) {
const colors=useHomeHealthColors();
const s=useThemedStyles(sThemes);

  const metrics = homeHealthMetrics(state);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [displayedId, setDisplayedId] = useState<string | null>(null);
  const [detailHeight, setDetailHeight] = useState(218);
  const [scrubbedPoint, setScrubbedPoint] = useState<ChartDatum | undefined>(undefined);
  const { fontScale, width } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const detailAnim = useRef(new Animated.Value(0)).current;
  const expandedRef = useRef<string | null>(expanded);
  expandedRef.current = expanded;
  const displayedIdRef = useRef<string | null>(null);
  displayedIdRef.current = displayedId;
  const selected = metrics.find((metric) => metric.id === displayedId);
  const selectedIndex = metrics.findIndex((metric) => metric.id === displayedId);
  const originRight = selectedIndex >= 0 && fontScale <= 1.2 && selectedIndex % 2 === 1;

  useEffect(() => {
    if (reduceMotion || typeof Animated?.timing !== "function") {
      setDisplayedId(expanded);
      detailAnim.setValue(expanded ? 1 : 0);
      return;
    }
    if (expanded) {
      if (displayedId !== expanded) {
        setDisplayedId(expanded);
        return;
      }
      const startOpen = () => {
        detailAnim.stopAnimation();
        Animated.timing(detailAnim, {
          toValue: 1,
          duration: 260,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }).start();
      };
      if (typeof requestAnimationFrame === "function") {
        const frame = requestAnimationFrame(startOpen);
        return () => cancelAnimationFrame(frame);
      }
      startOpen();
      return;
    }
    if (displayedIdRef.current !== null) {
      detailAnim.stopAnimation();
      Animated.timing(detailAnim, {
        toValue: 0,
        duration: 240,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: false,
      }).start(({ finished }) => {
        if (finished && expandedRef.current === null) {
          setDisplayedId(null);
        }
      });
    }
  }, [expanded, displayedId, reduceMotion, detailAnim]);

  return (
    <View style={s.panel}>
      <View style={s.header}>
        <AppText role="heading" accessibilityRole="header" style={{ color: colors.text }}>
          Today’s health
        </AppText>
      </View>
      <View>
      <View style={s.grid}>
        {metrics.map((metric) => {
          const signal = healthSignal(metric.history);
          const bounds = healthSignalBounds(metric);
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
                  {bounds && (
                    <G>
                      <SvgText {...chartTextProps()} x={34} y={135} textAnchor="middle" fill={colors.secondary}>
                        {bounds.min}
                      </SvgText>
                      <SvgText {...chartTextProps()} x={110} y={135} textAnchor="middle" fill={colors.secondary}>
                        {bounds.max}
                      </SvgText>
                    </G>
                  )}
                </Svg>
                <View style={s.reading}>
                  <AppText role={fontScale > 1.2 || width >= 360 ? "value" : "body"} style={s.value}>
                    {metric.value}
                  </AppText>
                  {!!metric.unit && <AppText role="caption" style={s.secondary}>{metric.unit}</AppText>}
                </View>
              </View>
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
        const animateExpand = !reduceMotion && typeof detailAnim?.interpolate === "function";
        const originOffsetX = fontScale > 1.2 ? 0 : (originRight ? 1 : -1) * Math.min(110, width * 0.22);
        const outerMotionStyle = animateExpand
          ? {
              overflow: "hidden" as const,
              height: detailAnim.interpolate({ inputRange: [0, 1], outputRange: [0, detailHeight] }),
              marginTop: detailAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 16] }),
            }
          : { marginTop: 16 };
        const innerMotionStyle = animateExpand
          ? {
              position: "absolute" as const,
              top: 0,
              left: 0,
              right: 0,
              opacity: detailAnim.interpolate({ inputRange: [0, 0.14, 1], outputRange: [0, 1, 1] }),
              transform: [
                { translateX: detailAnim.interpolate({ inputRange: [0, 1], outputRange: [originOffsetX, 0] }) },
                { translateY: detailAnim.interpolate({ inputRange: [0, 1], outputRange: [-detailHeight * 0.49, 0] }) },
                { scale: detailAnim.interpolate({ inputRange: [0, 1], outputRange: [0.02, 1] }) },
              ],
            }
          : undefined;
        return (
          <Animated.View style={outerMotionStyle}>
          <Animated.View
            style={[s.detail, innerMotionStyle]}
            accessibilityLiveRegion="polite"
            onLayout={(event) => {
              const nextHeight = Math.ceil(event.nativeEvent.layout.height);
              if (nextHeight > 0 && Math.abs(nextHeight - detailHeight) > 1) {
                setDetailHeight(nextHeight);
              }
            }}
          >
            <View style={s.detailHeader}>
              <View style={s.detailTitleRow}>
                <AppText role="label" style={{ color: colors.text }}>
                  {selected.name}
                </AppText>
                <AppText role="label" style={{ color: colors.accent, fontVariant: ["tabular-nums"] }}>
                  {`${activeReading}${selected.unit && activeReading !== "—" ? ` ${selected.unit}` : ""}`}
                </AppText>
              </View>
            </View>
            <View style={s.chartBox}>
              <ChartScrubber
                key={selected.id}
                hideSummary
                hideSelectionDot
                points={scrubPoints}
                width={chart.width}
                height={chart.height}
                plotTop={chart.plotTop}
                plotBottom={chart.plotBottom}
                onSelectionChange={setScrubbedPoint}
                label={`${selected.name} 7-day trend`}
              >
                <Svg width="100%" height={chart.height} viewBox={`0 0 ${chart.width} ${chart.height}`} preserveAspectRatio="none" accessible={false}>
                  {chart.yTicks.map((tick, i) => (
                    <G key={`y-${tick.value}-${i}`}>
                      <Line
                        x1={chart.plotLeft}
                        x2={chart.plotRight}
                        y1={tick.y}
                        y2={tick.y}
                        stroke={colors.secondary}
                        strokeWidth={0.5}
                        opacity={0.3}
                      />
                      <SvgText
                        {...chartTextProps()}
                        x={chart.plotLeft - 6}
                        y={tick.y + 4}
                        textAnchor="end"
                        fill={colors.secondary}
                      >
                        {tick.label}
                      </SvgText>
                    </G>
                  ))}
                  {chart.hasBaseline && (
                    <G>
                      <Path d={chart.corridorAreaPath} fill={colors.accent} opacity={0.14} />
                      <Line
                        x1={chart.plotLeft}
                        x2={chart.plotRight}
                        y1={chart.corridorYTop}
                        y2={chart.corridorYTop}
                        stroke={colors.accent}
                        strokeDasharray="3 3"
                        opacity={0.75}
                      />
                      <Line
                        x1={chart.plotLeft}
                        x2={chart.plotRight}
                        y1={chart.corridorYBottom}
                        y2={chart.corridorYBottom}
                        stroke={colors.accent}
                        strokeDasharray="3 3"
                        opacity={0.75}
                      />
                    </G>
                  )}
                  {chart.points.map((p) => {
                    if (p.value == null || p.y == null) return null;
                    const isOutOfCorridor = p.position === "under" || p.position === "over";
                    return (
                      <Circle
                        key={p.index}
                        cx={p.x}
                        cy={p.y}
                        r={4}
                        fill={isOutOfCorridor ? colors.tile : colors.accent}
                        stroke={isOutOfCorridor ? colors.accent : "none"}
                        strokeWidth={isOutOfCorridor ? 1.6 : 0}
                        strokeDasharray={isOutOfCorridor ? dottedCircleDasharray(4, 8) : undefined}
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
          </Animated.View>
          </Animated.View>
        );
      })()}
      </View>
    </View>
  );
}

const sThemes = createThemedStyles(themeColors=>{const colors=homeHealthColors(themeColors);return {
  panel: { backgroundColor: colors.background, gap: 16 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  tile: {
    padding: 14,
    minHeight: 176,
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
