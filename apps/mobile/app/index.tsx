import {
  currentPeriodBounds,
  daysLeft,
  formatClock,
  freshState,
  lessonFor,
  migrateCompeteState,
  rankForElo,
  reduceCompete,
  rollClock,
  SPORTS,
  weeklyBoard,
  type CompeteState,
  type SportId,
} from "@fitness-battle/shared";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { colors, fonts } from "../src/theme";
import { AceStrip } from "../src/ui/ace-strip";

const KEY = "fb-compete-v1";

export default function HomeScreen() {
  const [state, setState] = useState<CompeteState | null>(null);

  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(KEY).then((raw) => {
      if (!alive) return;
      let next = rollClock(freshState());
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as CompeteState;
          if (parsed.version === 1) next = rollClock(migrateCompeteState(parsed));
        } catch {
          next = rollClock(freshState());
        }
      }
      AsyncStorage.setItem(KEY, JSON.stringify(next));
      setState(next);
    });
    return () => {
      alive = false;
    };
  }, []);

  function dispatch(action: Parameters<typeof reduceCompete>[1]) {
    setState((prev) => {
      if (!prev) return prev;
      const next = reduceCompete(prev, action);
      AsyncStorage.setItem(KEY, JSON.stringify(next));
      return next;
    });
  }

  if (!state) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.copy}>Loading your week…</Text>
      </SafeAreaView>
    );
  }

  const now = new Date();
  const period = currentPeriodBounds(state.clock.kind, now);
  const rating = state.ratings.find((item) => item.sport === state.primary);
  const lesson = lessonFor(state.primary, now);
  const done = state.lessonDoneOn === now.toISOString().slice(0, 10);
  const board = rating?.optedIn
    ? weeklyBoard(state, state.primary, "open", now).slice(0, 5)
    : [];

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.kicker}>{formatClock(period)}</Text>
        <Text style={styles.title}>Keep each other moving.</Text>
        <Text style={styles.copy}>
          {daysLeft(period, now)} days left. {rankForElo(rating?.openElo ?? 1000).name}{" "}
          · {rating?.openElo ?? 1000}
        </Text>

        <AceStrip
          kicker="YOUR WEEK"
          title="One move at a time."
          detail="Make a little progress today."
        />

        <View style={[styles.card, styles.lesson]}>
          <Text style={styles.kicker}>Today’s lesson</Text>
          <Text style={styles.cardTitle}>
            {lesson.title} · {lesson.minutes} min
          </Text>
          <Text style={styles.copy}>{lesson.detail}</Text>
          <Pressable
            style={styles.primary}
            disabled={done}
            onPress={() => dispatch({ type: "complete-lesson" })}
          >
            <Text style={styles.primaryText}>
              {done ? "Done for today" : "Mark done"}
            </Text>
          </Pressable>
        </View>

        {SPORTS.map((sport) => {
          const joined = state.ratings.find((row) => row.sport === sport.id)?.optedIn;
          return (
            <Pressable
              key={sport.id}
              style={joined ? styles.line : styles.primary}
              onPress={() =>
                dispatch({
                  type: joined ? "set-primary" : "opt-in",
                  sport: sport.id as SportId,
                })
              }
            >
              <Text style={joined ? styles.lineText : styles.primaryText}>
                {joined ? `${sport.name} · this week` : `Compete in ${sport.name}`}
              </Text>
            </Pressable>
          );
        })}

        <Pressable style={styles.line} onPress={() => router.push("/connections")}>
          <Text style={styles.lineText}>Phone health sync</Text>
        </Pressable>

        {board.length > 0 ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>This week</Text>
            {board.map((row) => (
              <Text key={row.id} style={styles.copy}>
                {row.place}. {row.name} · {row.effort.toFixed(1)}
              </Text>
            ))}
            <Pressable
              style={styles.line}
              onPress={() =>
                dispatch({ type: "duel", sport: state.primary, mode: "auto" })
              }
            >
              <Text style={styles.lineText}>Auto match a 1v1</Text>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  scroll: { padding: 20, gap: 12 },
  kicker: {
    fontFamily: fonts.bodyMedium,
    color: colors.muted,
    fontSize: 13,
    textTransform: "uppercase",
  },
  title: {
    fontFamily: fonts.bodyBold,
    fontSize: 32,
    color: colors.ink,
    letterSpacing: -0.5,
  },
  copy: {
    fontFamily: fonts.body,
    color: colors.muted,
    fontSize: 15,
    lineHeight: 21,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 16,
    gap: 8,
  },
  lesson: { backgroundColor: colors.greenSoft, borderColor: "transparent" },
  cardTitle: { fontFamily: fonts.bodyBold, fontSize: 18, color: colors.ink },
  primary: {
    backgroundColor: colors.blue,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryText: { color: "white", fontFamily: fonts.bodyBold },
  line: {
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  lineText: { color: colors.ink, fontFamily: fonts.bodyBold },
});
