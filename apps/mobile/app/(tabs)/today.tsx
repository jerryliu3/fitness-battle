import { useRef, useState } from "react";
import {
  Animated,
  Pressable,
  ScrollView,
  Text,
  View,
  StyleSheet,
  AccessibilityInfo,
} from "react-native";
import Svg, {
  Defs,
  LinearGradient,
  Stop,
  Line,
  Polyline,
  Polygon,
  Circle,
  Text as SvgText,
  Path,
} from "react-native-svg";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  APP_TIMEZONE,
  buildTodayRoute,
  competeNow,
  competePeriodWindow,
  countsOnTrack,
  formatDistanceM,
  formatVolume,
  sportById,
  type Activity,
} from "@fitness-battle/shared";
import { useCompeteStore } from "../../src/lib/compete-store";
import { Ember } from "../../src/ui/mascot/ember";
import { FocusHeading, f } from "../../src/ui/focus";

const PATH_L = "24%";
const PATH_C = "50%";
const PATH_R = "76%";
const PATH_ROW = 120;

function PathCurve({ d }: { d: string }) {
  return (
    <Svg
      style={s.pathCurve}
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      pointerEvents="none"
    >
      <Path
        d={d}
        fill="none"
        stroke="#c9d5bf"
        strokeWidth={2.75}
        strokeLinecap="round"
        strokeDasharray="5 9"
      />
    </Svg>
  );
}

export default function Home() {
  const { state } = useCompeteStore();
  const [expanded, setExpanded] = useState<"suggestion" | Activity | null>(
    null,
  );
  const lift = useRef(new Animated.Value(0)).current;
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
  const sessions = counted
    .slice()
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
    .slice(0, 10);
  const units = state.units;

  const weekPeriod = competePeriodWindow(state, now);
  const weekStart = weekPeriod.startsAt.getTime();
  const weekEnd = weekPeriod.endsAt.getTime();
  const weekActivities = state.activities.filter((a) => {
    if (!countsOnTrack(a, "open")) return false;
    const t = new Date(a.startedAt).getTime();
    return t >= weekStart && t < weekEnd;
  });
  const weekMovingSec = weekActivities.reduce(
    (acc, a) => acc + (a.movingSec || 0),
    0,
  );
  const weekDistanceM = weekActivities.reduce(
    (acc, a) => acc + (a.distanceM || 0),
    0,
  );
  const unitLabel = units === "metric" ? "km" : "mi";
  const weekHours = weekMovingSec / 3600;
  const weekHoursLabel =
    weekHours >= 10
      ? `${Math.round(weekHours)} hr`
      : `${(Math.round(weekHours * 10) / 10).toFixed(1).replace(/\.0$/, "")} hr`;
  const nowDayIso = now.toISOString().slice(0, 10);
  const dayLabels = ["M", "T", "W", "T", "F", "S", "S"];

  // Previous week window (Mon 00:00 UTC to next Mon 00:00 UTC, 7 days earlier)
  const prevWeekStart = weekStart - 7 * 86_400_000;
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
      new Date(r.periodStart).getTime() >= prevWeekStart - 3600000 &&
      new Date(r.periodStart).getTime() <= prevWeekStart + 3600000,
  );

  // Index of today (0 = Monday, 6 = Sunday)
  const nowDayIndex = Math.min(
    6,
    Math.max(0, Math.floor((now.getTime() - weekStart) / 86_400_000)),
  );

  // Cumulative hours for current week up to now
  let currRunningSec = 0;
  const currCumulativeHours: number[] = [];
  for (let i = 0; i <= nowDayIndex; i++) {
    const dayEnd = Math.min(weekStart + (i + 1) * 86_400_000, now.getTime() + 1000);
    const dayActs = weekActivities.filter((a) => {
      const t = new Date(a.startedAt).getTime();
      const dayStart = weekStart + i * 86_400_000;
      return t >= dayStart && t < dayEnd;
    });
    const daySec = dayActs.reduce((acc, a) => acc + (a.movingSec || 0), 0);
    currRunningSec += daySec;
    currCumulativeHours.push(Number((currRunningSec / 3600).toFixed(2)));
  }

  // Cumulative hours for previous week (all 7 days)
  let prevRunningSec = 0;
  const prevCumulativeHours: number[] = [];
  if (prevWeekActivities.length > 0) {
    for (let i = 0; i < 7; i++) {
      const dayStart = prevWeekStart + i * 86_400_000;
      const dayEnd = dayStart + 86_400_000;
      const dayActs = prevWeekActivities.filter((a) => {
        const t = new Date(a.startedAt).getTime();
        return t >= dayStart && t < dayEnd;
      });
      const daySec = dayActs.reduce((acc, a) => acc + (a.movingSec || 0), 0);
      prevRunningSec += daySec;
      prevCumulativeHours.push(Number((prevRunningSec / 3600).toFixed(2)));
    }
  } else if (prevPeriodResult && prevPeriodResult.movingSec > 0) {
    const totalPrevHours = prevPeriodResult.movingSec / 3600;
    for (let i = 0; i < 7; i++) {
      prevCumulativeHours.push(Number(((totalPrevHours * (i + 1)) / 7).toFixed(2)));
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
  const chartW = 320;
  const chartH = 126;
  const xStart = 32;
  const xEnd = 308;
  const yTop = 14;
  const yBottom = 96;
  const yMidPos = Math.round((yTop + yBottom) / 2);

  const maxVal = Math.max(...currCumulativeHours, ...prevCumulativeHours, 0.5);
  const yMax = Math.max(1, Math.ceil(maxVal * 1.15));
  const yMid = Math.round((yMax / 2) * 10) / 10;

  const getY = (hrs: number) => yBottom - (Math.min(hrs, yMax) / yMax) * (yBottom - yTop);
  const getX = (dayIdx: number) => xStart + ((dayIdx + 1) / 7) * (xEnd - xStart);
  const getDayCenterX = (dayIdx: number) => xStart + ((dayIdx + 0.5) / 7) * (xEnd - xStart);

  const prevPoints = [
    `${xStart.toFixed(1)},${getY(0).toFixed(1)}`,
    ...prevCumulativeHours.map(
      (h, i) => `${getX(i).toFixed(1)},${getY(h).toFixed(1)}`,
    ),
  ].join(" ");

  const currPointsList = [
    `${xStart.toFixed(1)},${getY(0).toFixed(1)}`,
    ...currCumulativeHours.map(
      (h, i) => `${getX(i).toFixed(1)},${getY(h).toFixed(1)}`,
    ),
  ];
  const currLinePoints = currPointsList.join(" ");
  const currLastX = getX(nowDayIndex);
  const currLastY = getY(currCumulativeHours[nowDayIndex] ?? 0);
  const currAreaPoints = `${currLinePoints} ${currLastX.toFixed(1)},${yBottom} ${xStart.toFixed(1)},${yBottom}`;

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart + i * 86_400_000);
    const dayIso = d.toISOString().slice(0, 10);
    const dayActs = weekActivities.filter(
      (a) => a.startedAt.slice(0, 10) === dayIso,
    );
    return {
      key: dayIso,
      label: dayLabels[i],
      isToday: dayIso === nowDayIso,
      hasActivity: dayActs.length > 0,
    };
  });
  const activeDaysCount = weekDays.filter((d) => d.hasActivity).length;

  function bounce() {
    void AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (!reduce)
        Animated.sequence([
          Animated.timing(lift, {
            toValue: -12,
            duration: 130,
            useNativeDriver: true,
          }),
          Animated.spring(lift, { toValue: 0, useNativeDriver: true }),
        ]).start();
    });
  }

  if (expanded === "suggestion") {
    return (
      <SafeAreaView style={f.safe} edges={["top"]}>
        <ScrollView contentContainerStyle={f.content}>
          <Pressable
            accessibilityRole="button"
            onPress={() => setExpanded(null)}
            style={{ paddingVertical: 8 }}
          >
            <Text style={f.small}>← Back</Text>
          </Pressable>
          <View style={s.expandPanel}>
            <Text style={f.kicker}>Today&apos;s suggestion</Text>
            <Text style={s.expandTitle}>{route.suggestion.title}</Text>
            {route.suggestion.minutes ? (
              <Text style={f.copy}>{route.suggestion.minutes} min</Text>
            ) : null}
            <Text style={f.copy}>{route.suggestion.detail}</Text>
            <Text style={f.small}>{route.suggestion.reason}</Text>
            <View style={s.expandEmber}>
              <Ember size={150} expression="happy" />
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (expanded && typeof expanded === "object") {
    const a = expanded;
    return (
      <SafeAreaView style={f.safe} edges={["top"]}>
        <ScrollView contentContainerStyle={f.content}>
          <Pressable
            accessibilityRole="button"
            onPress={() => setExpanded(null)}
            style={{ paddingVertical: 8 }}
          >
            <Text style={f.small}>← Back</Text>
          </Pressable>
          <View style={s.expandPanel}>
            <Text style={f.kicker}>
              {new Date(a.startedAt).toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
                timeZone: APP_TIMEZONE,
              })}
            </Text>
            <Text style={s.expandTitle}>{sportById(a.sport).name}</Text>
            <Text style={f.copy}>
              {formatVolume(a.sport, a.distanceM, a.movingSec, units)}
            </Text>
            <Text style={f.small}>
              {a.source} · {a.verified ? "Verified" : "Open"} · Counted training.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={f.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={f.content}>
        <FocusHeading
          kicker="Your daily starting point"
          title="Just one good move."
          body="Small steps. A week that adds up."
        />
        <View style={s.statsCard} accessibilityLabel="This week's progress">
          <View style={s.statsHeader}>
            <View>
              <Text style={f.kicker}>This week · Cumulative hours</Text>
              <Text style={s.statsMain}>{currTotalHours.toFixed(1)} hrs</Text>
              {sportById(state.primary).gps && weekDistanceM > 0 ? (
                <Text style={[f.small, { marginTop: 2 }]}>
                  {formatDistanceM(weekDistanceM, units)} {unitLabel}
                </Text>
              ) : null}
            </View>
            <View style={s.statsSummary}>
              <Text style={f.small}>
                <Text style={{ fontWeight: "700", color: "#282f2c" }}>
                  {weekActivities.length}
                </Text>{" "}
                {weekActivities.length === 1 ? "session" : "sessions"}
              </Text>
              <Text style={f.small}>
                <Text style={{ fontWeight: "700", color: "#282f2c" }}>
                  {activeDaysCount}
                </Text>{" "}
                of 7 days
              </Text>
            </View>
          </View>

          <View style={s.chartLegend}>
            <View style={s.legendItems}>
              <View style={s.legendItem}>
                <View style={s.legendSwatchCurr} />
                <Text style={s.legendText}>You ({currTotalHours.toFixed(1)}h)</Text>
              </View>
              <View style={s.legendItem}>
                <View style={s.legendSwatchPrev} />
                <Text style={s.legendText}>Last week ({prevTotalHours.toFixed(1)}h)</Text>
              </View>
            </View>
            <View style={s.deltaPill}>
              <Text style={s.deltaText}>
                {hoursDelta > 0
                  ? `+${hoursDelta.toFixed(1)}h vs last week`
                  : hoursDelta < 0
                    ? `${hoursDelta.toFixed(1)}h vs last week`
                    : "On pace"}
              </Text>
            </View>
          </View>

          <Svg
            width="100%"
            height={chartH}
            viewBox={`0 0 ${chartW} ${chartH}`}
            accessible
            accessibilityLabel={`Cumulative hours: ${currTotalHours.toFixed(1)} hrs this week compared to ${prevTotalHours.toFixed(1)} hrs last week`}
          >
            <Defs>
              <LinearGradient id="mobile-act-grad" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor="#f1c75b" stopOpacity="0.4" />
                <Stop offset="1" stopColor="#f1c75b" stopOpacity="0.0" />
              </LinearGradient>
            </Defs>

            {/* Horizontal gridlines & Y labels */}
            <SvgText
              x="24"
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
              x="24"
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
              x="24"
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
            <Polygon
              points={currAreaPoints}
              fill="url(#mobile-act-grad)"
            />
            <Polyline
              points={currLinePoints}
              fill="none"
              stroke="#282f2c"
              strokeWidth={2.6}
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Live indicator dot */}
            <Circle
              cx={currLastX}
              cy={currLastY}
              r={6.5}
              fill="none"
              stroke="#f1c75b"
              strokeWidth={2}
            />
            <Circle cx={currLastX} cy={currLastY} r={3} fill="#282f2c" />

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
        <View style={f.row}>
          <Text style={f.h2}>Your fitness journey</Text>
          {sessions.length ? (
            <Text style={f.small}>Last {sessions.length} sessions</Text>
          ) : null}
        </View>
        <View style={s.journey}>
          <View style={[s.stop, { opacity: 0.72 }]}>
            <View
              style={[
                s.tile,
                s.tileAbs,
                {
                  left: PATH_R,
                  backgroundColor: "#f4f7f0",
                  borderStyle: "dashed",
                  borderColor: "#c5d2bb",
                  borderBottomColor: "#b7c4ad",
                },
              ]}
              accessibilityLabel="Upcoming session"
            >
              <View style={s.hollow} />
            </View>
            <View style={[s.stopCopy, s.copyRight]}>
              <Text style={f.kicker}>Up next</Text>
              <Text style={f.rowTitle}>Room for what&apos;s next</Text>
            </View>
          </View>
          <View style={s.stop}>
            <PathCurve d="M 76 0 C 76 28, 24 36, 24 58 S 62 78, 50 100" />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Ember: open today's session"
              style={[
                s.tile,
                s.tileAbs,
                {
                  left: PATH_C,
                  backgroundColor: "#f1c75b",
                  borderColor: "#dfb648",
                  borderBottomColor: "#c99f36",
                  overflow: "visible",
                  width: 82,
                  height: 82,
                  borderRadius: 41,
                  zIndex: 1,
                },
              ]}
              onPress={() => {
                bounce();
                setExpanded("suggestion");
              }}
            >
              <Animated.View
                style={{
                  position: "absolute",
                  bottom: 18,
                  left: "50%",
                  marginLeft: -59,
                  zIndex: 2,
                  transform: [{ translateY: lift }],
                }}
              >
                <Ember size={118} expression="happy" />
              </Animated.View>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                bounce();
                setExpanded("suggestion");
              }}
              style={[s.stopCopy, s.copyCenter]}
            >
              <Text style={f.kicker}>Today</Text>
              <Text style={f.rowTitle}>See today&apos;s session</Text>
            </Pressable>
          </View>
          {sessions.map((a, i) => {
            const toLeft = i % 2 === 0;
            const curve =
              i === 0
                ? "M 50 0 C 50 28, 24 40, 24 100"
                : toLeft
                  ? "M 76 0 C 76 30, 24 42, 24 100"
                  : "M 24 0 C 24 30, 76 42, 76 100";
            return (
              <View key={a.id} style={s.stop}>
                <PathCurve d={curve} />
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setExpanded(a)}
                  accessibilityLabel={`Open ${sportById(a.sport).name} session ${formatVolume(a.sport, a.distanceM, a.movingSec, units)}`}
                  style={[
                    s.tile,
                    s.tileAbs,
                    { left: toLeft ? PATH_L : PATH_R },
                  ]}
                >
                  <View style={s.check}>
                    <Text style={{ fontSize: 9, color: "#26382d" }}>✓</Text>
                  </View>
                  <Text style={s.tileValue}>
                    {formatVolume(a.sport, a.distanceM, a.movingSec, units)}
                  </Text>
                  <Text style={f.small}>
                    {new Date(a.startedAt).toLocaleDateString("en-US", {
                      weekday: "short",
                      timeZone: "UTC",
                    })}
                  </Text>
                </Pressable>
                <View
                  style={[s.stopCopy, toLeft ? s.copyLeft : s.copyRight]}
                >
                  <Text style={f.kicker}>
                    {new Date(a.startedAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      timeZone: "UTC",
                    })}
                  </Text>
                  <Text style={f.rowTitle}>{sportById(a.sport).name}</Text>
                  <Text style={f.small}>
                    {a.verified ? "Verified" : "Open"} · counted
                  </Text>
                </View>
              </View>
            );
          })}
          <View style={s.stop}>
            <PathCurve
              d={
                sessions.length === 0
                  ? "M 50 0 C 22 32, 78 64, 50 100"
                  : sessions.length % 2 === 1
                    ? "M 24 0 C 24 34, 78 58, 50 100"
                    : "M 76 0 C 76 34, 22 58, 50 100"
              }
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Start"
              onPress={bounce}
              style={[
                s.tile,
                s.tileAbs,
                {
                  left: PATH_C,
                  backgroundColor: "#f1f5ec",
                  borderStyle: "dashed",
                  borderColor: "#b7c9a4",
                  borderBottomColor: "#a4b990",
                },
              ]}
            >
              <Text style={{ fontSize: 18 }}>🏁</Text>
              <Text
                style={{
                  fontFamily: "DMSans_700Bold",
                  fontSize: 10,
                  letterSpacing: 0.8,
                  color: "#43543f",
                }}
              >
                START
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
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
  statsBody: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 16,
  },
  statsHours: {
    minWidth: 88,
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
  statsSummary: {
    alignItems: "flex-end",
    gap: 2,
  },
  chartLegend: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#e0e5dc",
  },
  legendItems: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendSwatchCurr: {
    width: 14,
    height: 3,
    borderRadius: 2,
    backgroundColor: "#282f2c",
  },
  legendSwatchPrev: {
    width: 14,
    height: 0,
    borderTopWidth: 2,
    borderTopColor: "#819486",
    borderStyle: "dashed",
  },
  legendText: {
    fontFamily: "DMSans_400Regular",
    fontSize: 11,
    color: "#616c63",
  },
  deltaPill: {
    backgroundColor: "#eef0e9",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  deltaText: {
    fontFamily: "DMSans_700Bold",
    fontSize: 11,
    color: "#282f2c",
  },
  expandPanel: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e0e5dc",
    borderBottomWidth: 3,
    borderRadius: 20,
    padding: 28,
    minHeight: 420,
    gap: 14,
    position: "relative",
    overflow: "hidden",
  },
  expandTitle: {
    fontFamily: "DMSans_400Regular",
    fontSize: 34,
    lineHeight: 40,
    letterSpacing: -1.2,
    color: "#282f2c",
    maxWidth: "85%",
  },
  expandEmber: { position: "absolute", right: -10, bottom: 10 },
  journey: { gap: 0, paddingBottom: 20 },
  stop: {
    height: PATH_ROW,
    position: "relative",
  },
  pathCurve: {
    position: "absolute",
    left: 0,
    width: "100%",
    top: -PATH_ROW / 2,
    height: PATH_ROW,
    zIndex: 0,
  },
  hollow: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2.5,
    borderColor: "#9eb090",
  },
  tile: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 1,
    borderBottomWidth: 5,
    borderColor: "#cdd9c1",
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    gap: 3,
  },
  tileAbs: {
    position: "absolute",
    top: "50%",
    marginTop: -40,
    marginLeft: -40,
    zIndex: 1,
  },
  tileValue: { fontFamily: "DMSans_500Medium", fontSize: 12, color: "#282f2c" },
  check: {
    position: "absolute",
    right: -5,
    top: -8,
    width: 20,
    height: 20,
    borderRadius: 11,
    backgroundColor: "#f1c75b",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#fafaf7",
  },
  stopCopy: {
    position: "absolute",
    top: "50%",
    marginTop: -22,
    maxWidth: 120,
    gap: 3,
    zIndex: 1,
  },
  copyLeft: { left: "24%", marginLeft: 48 },
  copyCenter: { left: "50%", marginLeft: 52 },
  copyRight: { right: "24%", marginRight: 48, alignItems: "flex-end" },
});
