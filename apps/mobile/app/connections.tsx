import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { syncAppleHealth, syncHealthConnect } from "../src/lib/device-health";
import { deviceHealthKind } from "../src/lib/platform-providers";
import { colors, fonts } from "../src/theme";

export default function ConnectionsScreen() {
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const kind = deviceHealthKind();

  async function run() {
    if (!kind) {
      setNote("Device health sync is only available on iOS and Android.");
      return;
    }
    setBusy(true);
    setNote(null);
    try {
      const result =
        kind === "apple" ? await syncAppleHealth() : await syncHealthConnect();
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

  const title = kind === "apple" ? "Apple Health" : kind === "android" ? "Health Connect" : "Phone workouts";
  const copy =
    kind === "apple"
      ? "Apple Health stays on this iPhone. A development build reads the last 90 days and sends them to the server. Strava, Garmin, WHOOP, and Oura connect from the web app."
      : kind === "android"
        ? "Health Connect stays on this Android phone. A development build reads the last 90 days and sends them to the server. Strava, Garmin, WHOOP, and Oura connect from the web app."
        : "Device health sync needs an iOS or Android phone.";
  const buttonLabel =
    kind === "apple"
      ? busy
        ? "Syncing…"
        : "Sync Apple Health"
      : kind === "android"
        ? busy
          ? "Syncing…"
          : "Sync Health Connect"
        : null;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.kicker}>Trackers</Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.copy}>{copy}</Text>
        {buttonLabel ? (
          <Pressable style={styles.primary} disabled={busy} onPress={() => void run()}>
            <Text style={styles.primaryText}>{buttonLabel}</Text>
          </Pressable>
        ) : null}
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
});
