import {
  duelViews,
  competeNow,
  SPORTS,
  type SportId,
} from "@fitness-battle/shared";
import { Button } from "heroui-native/button";
import { Input } from "heroui-native/input";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { mobileEnv } from "../../src/lib/env";
import { useCompeteStore } from "../../src/lib/compete-store";
import { DetailSheet } from "../../src/ui/detail-sheet";
import { SHELL_COLORS, SHELL_RADIUS } from "../../src/theme";

export default function FieldScreen() {
  const { state, dispatch } = useCompeteStore();
  const [code, setCode] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const [crewOpen, setCrewOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!state) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.copy}>Loading the field…</Text>
      </SafeAreaView>
    );
  }

  const now = competeNow(state);
  const duels = duelViews(state, now);
  const primary = SPORTS.find((sport) => sport.id === state.primary) ?? SPORTS[0]!;
  const optedIn = Boolean(
    state.ratings.find((row) => row.sport === state.primary)?.optedIn,
  );

  async function joinCrew() {
    setBusy(true);
    setNote(null);
    try {
      const response = await fetch(`${mobileEnv.apiUrl}/api/crews/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });
      if (!response.ok) {
        setNote("Crews join from a signed-in account. Practice 1v1 stays on this phone.");
        return;
      }
      setNote("Joined. Open Field again after the crew seats this week.");
      setCrewOpen(false);
    } catch {
      setNote("Could not reach crews. Practice 1v1 stays on this phone.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.kicker}>Field</Text>
        <Text style={styles.title}>{primary.name}</Text>
        {optedIn ? (
          <Button
            onPress={() =>
              dispatch({ type: "duel", sport: state.primary, mode: "auto" })
            }
          >
            Practice a 1v1
          </Button>
        ) : (
          <Button onPress={() => dispatch({ type: "opt-in", sport: state.primary })}>
            Join this week
          </Button>
        )}

        <Pressable
          accessibilityRole="button"
          onPress={() => setCrewOpen(true)}
          style={styles.row}
        >
          <Text style={styles.rowTitle}>Join a crew</Text>
          <Text style={styles.copy}>Invite code</Text>
        </Pressable>

        {SPORTS.filter((sport) => sport.id !== state.primary).map((sport) => {
          const joined = state.ratings.find((row) => row.sport === sport.id)?.optedIn;
          return (
            <Pressable
              key={sport.id}
              accessibilityRole="button"
              onPress={() =>
                dispatch({
                  type: joined ? "set-primary" : "opt-in",
                  sport: sport.id as SportId,
                })
              }
              style={styles.row}
            >
              <Text style={styles.rowTitle}>
                {joined ? sport.name : `Compete in ${sport.name}`}
              </Text>
            </Pressable>
          );
        })}

        <Text style={styles.section}>Matchups</Text>
        {duels.length === 0 ? (
          <Text style={styles.copy}>No practice 1v1 this week.</Text>
        ) : (
          duels.map((duel) => (
            <View key={duel.duel.id} style={styles.row}>
              <Text style={styles.rowTitle}>{duel.duel.rivalName}</Text>
              <Text style={styles.copy}>
                You {duel.youEffort.toFixed(1)} · {duel.duel.rivalName}{" "}
                {duel.rivalEffort.toFixed(1)}
              </Text>
            </View>
          ))
        )}
        {note ? <Text style={styles.copy}>{note}</Text> : null}
      </ScrollView>
      <DetailSheet
        open={crewOpen}
        title="Join a crew"
        body="Enter the invite code from someone already in the crew."
        onClose={() => setCrewOpen(false)}
      >
        <Input
          value={code}
          onChangeText={setCode}
          autoCapitalize="characters"
          accessibilityLabel="Crew invite code"
          placeholder="Invite code"
        />
        <Button isDisabled={busy || code.trim().length === 0} onPress={() => void joinCrew()}>
          Join crew
        </Button>
      </DetailSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: SHELL_COLORS.paper },
  scroll: { padding: 16, gap: 12, paddingBottom: 28 },
  kicker: {
    fontFamily: "DMSans_700Bold",
    fontSize: 13,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: SHELL_COLORS.muted,
  },
  title: {
    fontFamily: "DMSans_700Bold",
    fontSize: 32,
    color: SHELL_COLORS.ink,
    letterSpacing: -0.5,
  },
  section: {
    marginTop: 8,
    fontFamily: "DMSans_700Bold",
    color: SHELL_COLORS.ink,
    fontSize: 16,
  },
  row: {
    minHeight: 52,
    justifyContent: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: SHELL_RADIUS.control,
    backgroundColor: SHELL_COLORS.card,
    borderWidth: 1,
    borderColor: SHELL_COLORS.line,
    gap: 2,
  },
  rowTitle: { fontFamily: "DMSans_700Bold", color: SHELL_COLORS.ink, fontSize: 16 },
  copy: { fontFamily: "DMSans_400Regular", color: SHELL_COLORS.muted, fontSize: 14 },
});
