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
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import {
  APP_TIMEZONE,
  buildTodayRoute,
  competeNow,
  competePeriodWindow,
  countsOnTrack,
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
  const weekHours = weekMovingSec / 3600;
  const weekHoursLabel =
    weekHours >= 10
      ? `${Math.round(weekHours)} hr`
      : `${(Math.round(weekHours * 10) / 10).toFixed(1).replace(/\.0$/, "")} hr`;
  const nowDayIso = now.toISOString().slice(0, 10);
  const dayLabels = ["M", "T", "W", "T", "F", "S", "S"];
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart + i * 86_400_000);
    const dayIso = d.toISOString().slice(0, 10);
    const dayActs = weekActivities.filter(
      (a) => a.startedAt.slice(0, 10) === dayIso,
    );
    const dayVolume = dayActs.reduce(
      (acc, a) => acc + (a.movingSec || 0),
      0,
    );
    return {
      key: dayIso,
      label: dayLabels[i],
      isToday: dayIso === nowDayIso,
      hasActivity: dayActs.length > 0,
      volume: dayVolume,
    };
  });
  const maxDayVolume = Math.max(1, ...weekDays.map((d) => d.volume));
  const weekDaysWithPct = weekDays.map((d) => ({
    ...d,
    pct: d.hasActivity
      ? Math.max(20, Math.round((d.volume / maxDayVolume) * 100))
      : 0,
  }));

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
          <View style={s.statsBody}>
            <View style={s.statsHours}>
              <Text style={f.kicker}>This week</Text>
              <Text style={s.statsMain}>{weekHoursLabel}</Text>
            </View>
            <View style={s.miniChart} aria-hidden>
              {weekDaysWithPct.map((d) => (
                <View key={d.key} style={s.miniBarCol}>
                  <View style={s.miniBarTrack}>
                    {d.hasActivity ? (
                      <View
                        style={[
                          s.miniBarFill,
                          { height: `${d.pct}%` },
                          d.isToday ? { backgroundColor: "#26382d" } : null,
                        ]}
                      />
                    ) : (
                      <View style={s.miniBarFlat} />
                    )}
                  </View>
                  <Text
                    style={[
                      s.miniBarDay,
                      d.hasActivity && !d.isToday
                        ? { color: "#5f7a45", fontWeight: "600" }
                        : null,
                      d.isToday
                        ? { color: "#26382d", fontWeight: "700" }
                        : null,
                    ]}
                  >
                    {d.label}
                  </Text>
                </View>
              ))}
            </View>
          </View>
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
                  backgroundColor: "#d4ee89",
                  borderColor: "#b5d55b",
                  borderBottomColor: "#9ebf42",
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
    backgroundColor: "#edf2e8",
    borderWidth: 1,
    borderColor: "#e0e5dd",
    borderRadius: 20,
    padding: 16,
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
    fontSize: 28,
    color: "#26382d",
    letterSpacing: -0.6,
  },
  miniChart: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 6,
    height: 58,
    minWidth: 0,
  },
  miniBarCol: {
    flex: 1,
    alignItems: "center",
    gap: 6,
    height: "100%",
  },
  miniBarTrack: {
    flex: 1,
    width: "100%",
    maxWidth: 22,
    backgroundColor: "transparent",
    borderRadius: 6,
    justifyContent: "flex-end",
    alignItems: "center",
    overflow: "visible",
  },
  miniBarFill: {
    width: "100%",
    backgroundColor: "#a4be60",
    borderRadius: 8,
    minHeight: 8,
  },
  miniBarFlat: {
    width: 14,
    height: 3,
    borderRadius: 2,
    backgroundColor: "#8a9785",
  },
  miniBarDay: {
    fontSize: 10,
    fontFamily: "DMSans_500Medium",
    color: "#768172",
  },
  expandPanel: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e0e5dd",
    borderRadius: 24,
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
    color: "#26382d",
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
  tileValue: { fontFamily: "DMSans_500Medium", fontSize: 12, color: "#26382d" },
  check: {
    position: "absolute",
    right: -5,
    top: -8,
    width: 20,
    height: 20,
    borderRadius: 11,
    backgroundColor: "#d4ee89",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#fafbf8",
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
