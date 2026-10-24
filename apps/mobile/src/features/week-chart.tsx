import type { CompeteState } from "@fitness-battle/shared";
import { weeklyHoursComparison } from "@fitness-battle/shared";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Defs, Line, LinearGradient, Polygon, Polyline, Stop, Text as SvgText } from "react-native-svg";
import { PulseCircle } from "../ui/pulse-circle";
import { ChartFrame } from "../ui/chart-frame";
import { HomeActivityActions } from "./home-activity-actions";
import { SHELL_COLORS as c } from "../theme";

export function WeekChart({ state, onOpen, ready = true }: { state: CompeteState; onOpen?: () => void; ready?: boolean }) {
  const { nowDayIndex, currCumulativeHours, prevCumulativeHours, currTotalHours, prevTotalHours, sessionCount, weekProgress } = weeklyHoursComparison(state);
  const dayLabels = ["M", "T", "W", "T", "F", "S", "S"];
  // SVG chart geometry
  const chartW = 230;
  const xStart = 28;
  const xEnd = 220;
  const yTop = 14;
  const yBottom = 92;
  const yMidPos = Math.round((yTop + yBottom) / 2);
  const maxVal = Math.max(...currCumulativeHours, ...prevCumulativeHours, 0.5);
  const yMax = Math.max(1, Math.ceil(maxVal * 1.15));
  const yMid = Math.round((yMax / 2) * 10) / 10;
  const getY = (hrs: number) =>
    yBottom - (Math.min(hrs, yMax) / yMax) * (yBottom - yTop);
  const getX = (dayIdx: number) =>
    xStart + ((dayIdx + 1) / 7) * (xEnd - xStart);
  const getDayCenterX = (dayIdx: number) =>
    xStart + ((dayIdx + 0.5) / 7) * (xEnd - xStart);
  // Continuous X coordinate reflecting exact progress through the week
  const currPreciseX = Number(
    (xStart + weekProgress * (xEnd - xStart)).toFixed(1),
  );
  const currLastY = getY(currTotalHours);
  const prevPoints = [
    `${xStart.toFixed(1)},${getY(0).toFixed(1)}`,
    ...prevCumulativeHours.map(
      (h, i) => `${getX(i).toFixed(1)},${getY(h).toFixed(1)}`,
    ),
  ].join(" ");
  const currPointsList = [
    `${xStart.toFixed(1)},${getY(0).toFixed(1)}`,
    ...currCumulativeHours
      .slice(0, nowDayIndex)
      .map((h, i) => `${getX(i).toFixed(1)},${getY(h).toFixed(1)}`),
    `${currPreciseX.toFixed(1)},${currLastY.toFixed(1)}`,
  ];
  const currLinePoints = currPointsList.join(" ");
  const currAreaPoints = `${currLinePoints} ${currPreciseX.toFixed(1)},${yBottom} ${xStart.toFixed(1)},${yBottom}`;
  const prevLastY = getY(prevTotalHours);
  return (<ChartFrame ready={ready}><View style={s.statsCard} accessibilityLabel="This week's progress">
            <View style={s.statsHeader}>
              <View>

                <View style={s.statsNumbers}>
                  <Text style={s.statsMain}>
                    {currTotalHours === 0
                      ? "0 hours"
                      : `${currTotalHours.toFixed(1)} hrs`}
                  </Text>
                  <Text style={s.statsSessionCount}>
                    {sessionCount}{" "}
                    {sessionCount === 1 ? "session" : "sessions"}
                  </Text>
                </View>
              </View>
              <View style={{ width: 96 }}>
                <HomeActivityActions compact />
              </View>
            </View>

            <Pressable accessibilityRole={onOpen ? "button" : undefined} accessibilityLabel={onOpen ? "Explore your week" : undefined} disabled={!onOpen} onPress={onOpen} style={s.chartWrap}>
              <Svg
                width="100%"
                height={onOpen ? 130 : 200}
                viewBox={`0 0 ${chartW} 120`}
                accessible={Platform.OS==="web"?undefined:true}
                accessibilityLabel={`Cumulative hours: ${currTotalHours === 0 ? "0 hours" : `${currTotalHours.toFixed(1)} hrs`} this week compared to ${prevTotalHours.toFixed(1)} hrs last week`}
              >
                <Defs>
                  <LinearGradient
                    id="mobile-act-grad"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <Stop offset="0" stopColor={c.tennis} stopOpacity="0.4" />
                    <Stop offset="1" stopColor={c.tennis} stopOpacity="0.0" />
                  </LinearGradient>
                </Defs>

                {/* Horizontal gridlines & Y labels */}
                <SvgText
                  x="22"
                  y={yTop + 3}
                  textAnchor="end"
                  fontSize="9"
                  fill={c.muted}
                  fontWeight="500"
                >
                  {`${yMax}h`}
                </SvgText>
                <Line
                  x1={xStart}
                  y1={yTop}
                  x2={xEnd}
                  y2={yTop}
                  stroke={c.line}
                  strokeDasharray="3 3"
                />

                <SvgText
                  x="22"
                  y={yMidPos + 3}
                  textAnchor="end"
                  fontSize="9"
                  fill={c.muted}
                  fontWeight="500"
                >
                  {`${yMid}h`}
                </SvgText>
                <Line
                  x1={xStart}
                  y1={yMidPos}
                  x2={xEnd}
                  y2={yMidPos}
                  stroke={c.line}
                  strokeDasharray="3 3"
                />

                <SvgText
                  x="22"
                  y={yBottom + 3}
                  textAnchor="end"
                  fontSize="9"
                  fill={c.muted}
                  fontWeight="500"
                >
                  0h
                </SvgText>
                <Line
                  x1={xStart}
                  y1={yBottom}
                  x2={xEnd}
                  y2={yBottom}
                  stroke={c.line}
                />

                {/* Previous week line */}
                <Polyline
                  points={prevPoints}
                  fill="none"
                  stroke={c.secondary}
                  strokeWidth={1.8}
                  strokeDasharray="4 4"
                />

                {/* Current week area & line */}
                <Polygon points={currAreaPoints} fill="url(#mobile-act-grad)" />
                <Polyline
                  points={currLinePoints}
                  fill="none"
                  stroke={c.tennis}
                  strokeWidth={2.8}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Live indicator dot */}
                <PulseCircle
                  cx={currPreciseX}
                  cy={currLastY}
                  r={6.5}
                  fill="none"
                  stroke={c.tennis}
                  strokeWidth={2}
                />
                <Circle
                  cx={currPreciseX}
                  cy={currLastY}
                  r={3.5}
                  fill={c.tennis}
                />

                {/* Direct on-chart label: Last week at end */}
                <SvgText
                  x={xEnd}
                  y={
                    Math.abs(currPreciseX - xEnd) < 50 &&
                    Math.abs(currLastY - prevLastY) < 18
                      ? Math.min(yBottom - 6, prevLastY + 12)
                      : Math.max(yTop + 10, prevLastY - 6)
                  }
                  textAnchor="end"
                  fontSize="9"
                  fontWeight="600"
                  fill={c.muted}
                >
                  Last week
                </SvgText>

                {/* Day labels */}
                {dayLabels.map((lbl, i) => {
                  const cx = getDayCenterX(i);
                  const isToday = i === nowDayIndex;
                  return (
                    <SvgText
                      key={i}
                      x={cx}
                      y={yBottom + 16}
                      textAnchor="middle"
                      fontSize="10"
                      fontWeight={isToday ? "700" : "500"}
                      fill={isToday ? c.ink : c.muted}
                    >
                      {lbl}
                    </SvgText>
                  );
                })}
              </Svg>
            </Pressable>
          </View></ChartFrame>);
}
const s = StyleSheet.create({
  statsCard: {
    backgroundColor: c.card,
    borderWidth: 1,
    borderColor: c.line,
    borderBottomWidth: 1,
    borderRadius: 20,
    padding: 18,
    gap: 12,
    marginBottom: 8,
  },
  statsMain: {
    fontFamily: "DMSans_700Bold",
    fontSize: 24,
    color: c.ink,
    letterSpacing: -0.4,
  },
  statsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  statsNumbers: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "baseline",
    gap: 8,
  },
  statsSessionCount: {
    fontFamily: "DMSans_500Medium",
    fontSize: 13,
    color: c.muted,
  },
  chartWrap: {
    width: "100%",
    borderTopWidth: 1,
    borderTopColor: c.line,
    paddingTop: 12,
  },
});
