import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { syncAppleHealth, syncHealthConnect } from "../src/lib/device-health";
import { colors, fonts } from "../src/theme";

export default function ConnectionsScreen() {
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function run(kind: "apple" | "android") {
    setBusy(true);
    setNote(null);
    try {
      const result = kind === "apple" ? await syncAppleHealth() : await syncHealthConnect();
      setNote(result.message);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Sync failed";
      setNote(
        message.includes("is not a function")
          ? "Apple Health native module failed to load. Install a fresh TestFlight build."
          : message,
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.kicker}>Trackers</Text>
        <Text style={styles.title}>Phone workouts</Text>
        <Text style={styles.copy}>
          Apple Health and Health Connect stay on the device. A development build
          reads the last 90 days and sends them to the server. Strava, Garmin,
          WHOOP, and Oura connect from the web app.
        </Text>
        <Pressable style={styles.primary} disabled={busy} onPress={() => void run("apple")}>
          <Text style={styles.primaryText}>{busy ? "Syncing…" : "Sync Apple Health"}</Text>
        </Pressable>
        <Pressable style={styles.line} disabled={busy} onPress={() => void run("android")}>
          <Text style={styles.lineText}>Sync Health Connect</Text>
        </Pressable>
        {note ? <Text style={styles.copy}>{note}</Text> : null}
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
  title: { fontFamily: fonts.bodyBold, fontSize: 32, color: colors.ink },
  copy: { fontFamily: fonts.body, color: colors.muted, fontSize: 15, lineHeight: 21 },
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
