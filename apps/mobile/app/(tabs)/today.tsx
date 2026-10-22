import {
  APP_TIMEZONE,
  buildTodayRoute,
  competeNow,
  competePeriodWindow,
  countsOnTrack,
  dayKey,
  getZonedWeekday,
  primaryFreezePeriodStart,
  weeklyPeriodBounds,
} from "@fitness-battle/shared";
import { useState, useCallback } from "react";
import { useFocusEffect } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, {
  Circle,
  Defs,
  Line,
  LinearGradient,
  Polygon,
  Polyline,
  Stop,
  Text as SvgText,
} from "react-native-svg";
import { SessionStage } from "../../src/features/session-stage";
import { HomeActivityActions } from "../../src/features/home-activity-actions";
import { Journey } from "../../src/features/journey";
import { useCompeteStore } from "../../src/lib/compete-store";
import { FocusSheet, f } from "../../src/ui/focus";
export default function Home() {
  const { state, dispatch } = useCompeteStore();
  const [expanded, setExpanded] = useState<"suggestion" | null>(null);
  useFocusEffect(useCallback(()=>()=>setExpanded(null),[]));
  if (!state)
    return (
      <SafeAreaView style={f.safe}>
        <Text style={f.copy}>Loading your week…</Text>
      </SafeAreaView>
    );
  const route = buildTodayRoute(state);
  const now = competeNow(state);
  const counted = state.activities.filter(
    (a) => countsOnTrack(a, "open") && new Date(a.startedAt) <= now,
  );
  const units = state.units;
  const weekPeriod = competePeriodWindow(state, now);
  const weekStart = weekPeriod.startsAt.getTime();
  const weekEnd = weekPeriod.endsAt.getTime();
  const weekActivities = state.activities.filter((a) => {
    if (!countsOnTrack(a, "open")) return false;
    const t = new Date(a.startedAt).getTime();
    return t >= weekStart && t < weekEnd && t <= now.getTime();
  });
  const weekMovingSec = weekActivities.reduce(
    (acc, a) => acc + (a.movingSec || 0),
    0,
  );
  const dayLabels = ["M", "T", "W", "T", "F", "S", "S"];
  // Previous calendar week in Eastern time, including DST changes.
  const prevWeekStart = weeklyPeriodBounds(
    new Date(weekStart - 1),
  ).startsAt.getTime();
  const prevWeekEnd = weekStart;
  const prevWeekActivities = state.activities.filter((a) => {
    if (!countsOnTrack(a, "open")) return false;
    const t = new Date(a.startedAt).getTime();
    return t >= prevWeekStart && t < prevWeekEnd;
  });
  const prevWeekMovingSec = prevWeekActivities.reduce(
    (acc, a) => acc + (a.movingSec || 0),
    0,
  );
  const prevPeriodResult = state.periodResults.find(
    (r) =>
      r.sport === state.primary &&
      (r.track === "open" || !r.track) &&
      new Date(r.periodStart).getTime() >= prevWeekStart - 3600000 &&
      new Date(r.periodStart).getTime() <= prevWeekStart + 3600000,
  );
  // Index of today (0 = Monday, 6 = Sunday) in America/New_York
  const weekday = getZonedWeekday(now, APP_TIMEZONE);
  const nowDayIndex = Math.min(6, Math.max(0, weekday === 0 ? 6 : weekday - 1));
  // Cumulative hours for current week up to now
  let currRunningSec = 0;
  const currCumulativeHours: number[] = [];
  for (let i = 0; i <= nowDayIndex; i++) {
    const d = new Date(weekStart + i * 86400000 + 43200000);
    const dayIso = dayKey(d, APP_TIMEZONE);
    const dayActs = weekActivities.filter(
      (a) => dayKey(new Date(a.startedAt), APP_TIMEZONE) === dayIso,
    );
    const daySec = dayActs.reduce((acc, a) => acc + (a.movingSec || 0), 0);
    currRunningSec += daySec;
    currCumulativeHours.push(Number((currRunningSec / 3600).toFixed(2)));
  }
  if (currCumulativeHours.length > 0) {
    currCumulativeHours[currCumulativeHours.length - 1] = Number(
      (weekMovingSec / 3600).toFixed(2),
    );
  }
  // Cumulative hours for previous week (all 7 days)
  let prevRunningSec = 0;
  const prevCumulativeHours: number[] = [];
  if (prevWeekActivities.length > 0) {
    for (let i = 0; i < 7; i++) {
      const d = new Date(prevWeekStart + i * 86400000 + 43200000);
      const dayIso = dayKey(d, APP_TIMEZONE);
      const dayActs = prevWeekActivities.filter(
        (a) => dayKey(new Date(a.startedAt), APP_TIMEZONE) === dayIso,
      );
      const daySec = dayActs.reduce((acc, a) => acc + (a.movingSec || 0), 0);
      prevRunningSec += daySec;
      prevCumulativeHours.push(Number((prevRunningSec / 3600).toFixed(2)));
    }
  } else if (prevPeriodResult && prevPeriodResult.movingSec > 0) {
    const totalPrevHours = prevPeriodResult.movingSec / 3600;
    for (let i = 0; i < 7; i++) {
      prevCumulativeHours.push(
        Number(((totalPrevHours * (i + 1)) / 7).toFixed(2)),
      );
    }
  } else {
    for (let i = 0; i < 7; i++) {
      prevCumulativeHours.push(0);
    }
  }
  const currTotalHours = Number((weekMovingSec / 3600).toFixed(1));
  const prevTotalHours = Number(
    (
      prevCumulativeHours[prevCumulativeHours.length - 1] ??
      prevWeekMovingSec / 3600
    ).toFixed(1),
  );
  const hoursDelta = Number(
    (currTotalHours - (prevCumulativeHours[nowDayIndex] ?? 0)).toFixed(1),
  );
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
  const weekDurationMs = weekEnd - weekStart;
  const weekProgress = Math.min(
    1,
    Math.max(0, (now.getTime() - weekStart) / (weekDurationMs || 1)),
  );
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
  return (
    <SafeAreaView style={f.safe} edges={[]}>
      <View style={s.homeStage}>
        <ScrollView
          style={s.homeOverlayScroll}
          contentContainerStyle={s.homeOverlayContent}
          showsVerticalScrollIndicator={false}
        >
          {state.frozenPeriods.includes(primaryFreezePeriodStart(state)) ? (
            <Text style={f.copy}>
              ❄ Week frozen · Your effort score is protected through next
              Monday.
            </Text>
          ) : null}
          <View style={s.statsCard} accessibilityLabel="This week's progress">
            <View style={s.statsHeader}>
              <View>
                <Text style={f.kicker}>This week</Text>
                <View style={s.statsNumbers}>
                  <Text style={s.statsMain}>
                    {currTotalHours === 0
                      ? "0 hours"
                      : `${currTotalHours.toFixed(1)} hrs`}
                  </Text>
                  <Text style={s.statsSessionCount}>
                    {weekActivities.length}{" "}
                    {weekActivities.length === 1 ? "session" : "sessions"}
                  </Text>
                </View>
              </View>
              <View style={{ width: 88 }}>
                <HomeActivityActions compact />
              </View>
            </View>

            <View style={s.chartWrap}>
              <Svg
                width="100%"
                height={180}
                viewBox={`0 0 ${chartW} 120`}
                accessible
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
                    <Stop offset="0" stopColor="#f1c75b" stopOpacity="0.4" />
                    <Stop offset="1" stopColor="#f1c75b" stopOpacity="0.0" />
                  </LinearGradient>
                </Defs>

                {/* Horizontal gridlines & Y labels */}
                <SvgText
                  x="22"
                  y={yTop + 3}
                  textAnchor="end"
                  fontSize="9"
                  fill="#616c63"
                  fontWeight="500"
                >
                  {`${yMax}h`}
                </SvgText>
                <Line
                  x1={xStart}
                  y1={yTop}
                  x2={xEnd}
                  y2={yTop}
                  stroke="#e0e5dc"
                  strokeDasharray="3 3"
                />

                <SvgText
                  x="22"
                  y={yMidPos + 3}
                  textAnchor="end"
                  fontSize="9"
                  fill="#616c63"
                  fontWeight="500"
                >
                  {`${yMid}h`}
                </SvgText>
                <Line
                  x1={xStart}
                  y1={yMidPos}
                  x2={xEnd}
                  y2={yMidPos}
                  stroke="#e0e5dc"
                  strokeDasharray="3 3"
                />

                <SvgText
                  x="22"
                  y={yBottom + 3}
                  textAnchor="end"
                  fontSize="9"
                  fill="#616c63"
                  fontWeight="500"
                >
                  0h
                </SvgText>
                <Line
                  x1={xStart}
                  y1={yBottom}
                  x2={xEnd}
                  y2={yBottom}
                  stroke="#e0e5dc"
                />

                {/* Previous week line */}
                <Polyline
                  points={prevPoints}
                  fill="none"
                  stroke="#819486"
                  strokeWidth={1.8}
                  strokeDasharray="4 4"
                />

                {/* Current week area & line */}
                <Polygon points={currAreaPoints} fill="url(#mobile-act-grad)" />
                <Polyline
                  points={currLinePoints}
                  fill="none"
                  stroke="#f1c75b"
                  strokeWidth={2.8}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Live indicator dot */}
                <Circle
                  cx={currPreciseX}
                  cy={currLastY}
                  r={6.5}
                  fill="none"
                  stroke="#f1c75b"
                  strokeWidth={2}
                />
                <Circle
                  cx={currPreciseX}
                  cy={currLastY}
                  r={3.5}
                  fill="#f1c75b"
                />

                {/* Direct on-chart label: This week over indicator */}
                <SvgText
                  x={Math.max(xStart + 26, Math.min(xEnd - 26, currPreciseX))}
                  y={Math.max(yTop + 10, currLastY - 10)}
                  textAnchor="middle"
                  fontSize="9"
                  fontWeight="700"
                  fill="#282f2c"
                >
                  This week
                </SvgText>

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
                  fill="#616c63"
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
                      fill={isToday ? "#282f2c" : "#616c63"}
                    >
                      {lbl}
                    </SvgText>
                  );
                })}
              </Svg>
            </View>
          </View>
          <View style={s.homeJourneyLayer} pointerEvents="box-none">
            <Journey
              activities={counted}
              units={units}
              onToday={() => setExpanded("suggestion")}
            />
          </View>
        </ScrollView>
      </View>
      <FocusSheet
        open={expanded === "suggestion"}
        title="Today"
        onClose={() => setExpanded(null)}
      >
        <SessionStage state={state} activities={counted.filter(a=>dayKey(new Date(a.startedAt),APP_TIMEZONE)===dayKey(now,APP_TIMEZONE))} suggestion={route.suggestion} actions={<HomeActivityActions/>} onRemove={activityId=>dispatch({type:"set-disposition",activityId,disposition:"excluded"})}/>
      </FocusSheet>
    </SafeAreaView>
  );
}
const s = StyleSheet.create({
  homeStage: {
    flex: 1,
    position: "relative",
  },
  homeJourneyLayer: {
    width: "100%",
  },
  homeOverlayScroll: {
    flex: 1,
  },
  homeOverlayContent: {
    paddingHorizontal: 22,
    paddingTop: 4,
    paddingBottom: 120,
    gap: 18,
  },
  statsCard: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e0e5dc",
    borderBottomWidth: 3,
    borderRadius: 16,
    padding: 18,
    gap: 12,
    marginBottom: 8,
  },
  statsMain: {
    fontFamily: "DMSans_700Bold",
    fontSize: 24,
    color: "#282f2c",
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
    color: "#616c63",
  },
  chartWrap: {
    width: "100%",
    borderTopWidth: 1,
    borderTopColor: "#e0e5dc",
    paddingTop: 12,
  },
});
