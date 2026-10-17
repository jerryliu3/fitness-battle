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
import {
  buildTodayRoute,
  competeNow,
  countsOnTrack,
  formatVolume,
  sportById,
  type Activity,
} from "@fitness-battle/shared";
import { useCompeteStore } from "../../src/lib/compete-store";
import { Ember } from "../../src/ui/mascot/ember";
import { FocusHeading, f } from "../../src/ui/focus";

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
                timeZone: "UTC",
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
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open today's exercise suggestion"
          onPress={() => {
            bounce();
            setExpanded("suggestion");
          }}
          style={s.suggestion}
        >
          <View style={{ width: "74%", gap: 18, zIndex: 1 }}>
            <Text style={f.kicker}>Today&apos;s suggestion</Text>
            <Text style={s.suggestionTitle}>{route.suggestion.title}</Text>
            <Text style={f.small}>
              {route.suggestion.minutes
                ? `${route.suggestion.minutes} min · `
                : ""}
              Your next move
            </Text>
          </View>
          <View style={s.heroEmber}>
            <Ember size={135} expression="happy" />
          </View>
        </Pressable>
        <View style={f.row}>
          <Text style={f.h2}>Your recent rhythm</Text>
          {sessions.length ? (
            <Text style={f.small}>Last {sessions.length} sessions</Text>
          ) : null}
        </View>
        <View style={s.journey}>
          <View style={s.future}>
            <Text style={{ fontSize: 36, color: "#b7c2af" }}>○</Text>
            <Text style={f.small}>Tomorrow{"\n"}Room for what&apos;s next</Text>
          </View>
          <View style={[s.stop, { paddingLeft: "12%" }]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Ember: open today's recommendation"
              style={[s.tile, { backgroundColor: "#d4ee89", overflow: "visible" }]}
              onPress={() => {
                bounce();
                setExpanded("suggestion");
              }}
            >
              <Animated.View
                style={{
                  position: "absolute",
                  bottom: 6,
                  left: -15,
                  transform: [{ translateY: lift }],
                }}
              >
                <Ember size={108} expression="happy" />
              </Animated.View>
            </Pressable>
            <View style={s.stopCopy}>
              <Text style={f.kicker}>Today</Text>
              <Text style={f.rowTitle}>You are here</Text>
              <Text style={f.small}>Tap Ember for{"\n"}your next move</Text>
            </View>
          </View>
          {sessions.map((a, i) => (
            <View
              key={a.id}
              style={[s.stop, { paddingLeft: i % 2 ? "5%" : "26%" }]}
            >
              <View
                style={[
                  s.connector,
                  i % 2 ? { transform: [{ scaleX: -1 }], left: "35%" } : null,
                ]}
              />
              <Pressable
                accessibilityRole="button"
                onPress={() => setExpanded(a)}
                accessibilityLabel={`Open ${sportById(a.sport).name} session`}
                style={s.tile}
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
              <View style={s.stopCopy}>
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
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  suggestion: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e0e5dd",
    borderRadius: 27,
    padding: 26,
    minHeight: 245,
    position: "relative",
    overflow: "hidden",
  },
  suggestionTitle: {
    fontFamily: "DMSans_400Regular",
    fontSize: 29,
    lineHeight: 34,
    letterSpacing: -1,
    color: "#26382d",
  },
  heroEmber: { position: "absolute", right: -5, bottom: 12 },
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
  future: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 14,
    padding: 15,
    marginBottom: 20,
  },
  stop: {
    height: 150,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    position: "relative",
  },
  tile: {
    width: 83,
    height: 74,
    borderRadius: 19,
    borderWidth: 1,
    borderBottomWidth: 5,
    borderColor: "#cdd9c1",
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    gap: 5,
    transform: [{ rotate: "-6deg" }],
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
  stopCopy: { maxWidth: 120, gap: 3 },
  connector: {
    position: "absolute",
    left: "18%",
    width: "43%",
    height: 105,
    top: -30,
    borderLeftWidth: 3,
    borderBottomWidth: 3,
    borderColor: "#dce3d6",
    borderStyle: "dashed",
    borderBottomLeftRadius: 60,
  },
});
