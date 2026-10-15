import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useCompeteStore } from "../src/lib/compete-store";
import { syncAppleHealth, syncHealthConnect } from "../src/lib/device-health";
import {
  CLOUD_OAUTH_PROVIDERS,
  startCloudTrackerConnect,
  type CloudOAuthProvider,
} from "../src/lib/tracker-connect";
import { colors, fonts } from "../src/theme";

const CLOUD_LABELS: Record<CloudOAuthProvider, string> = {
  strava: "Connect Strava",
  garmin: "Connect Garmin",
  whoop: "Connect WHOOP",
  oura: "Connect Oura",
};

export default function ConnectionsScreen() {
  const { dispatch } = useCompeteStore();
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

  async function connectCloud(provider: CloudOAuthProvider) {
    setBusy(true);
    setNote(null);
    try {
      const result = await startCloudTrackerConnect(provider);
      if (result.stub) dispatch({ type: "link", provider });
      setNote(result.message);
    } catch (error) {
      setNote(error instanceof Error ? error.message : "Could not start connect.");
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
          reads the last 90 days and sends them to the server.
        </Text>
        <Pressable style={styles.primary} disabled={busy} onPress={() => void run("apple")}>
          <Text style={styles.primaryText}>{busy ? "Syncing…" : "Sync Apple Health"}</Text>
        </Pressable>
        <Pressable style={styles.line} disabled={busy} onPress={() => void run("android")}>
          <Text style={styles.lineText}>Sync Health Connect</Text>
        </Pressable>

        <Text style={styles.subtitle}>Cloud trackers</Text>
        <Text style={styles.copy}>
          Opens your browser to authorize. When you finish, Overtaek opens again
          if the app is installed.
        </Text>
        {CLOUD_OAUTH_PROVIDERS.map((provider) => (
          <Pressable
            key={provider}
            style={styles.line}
            disabled={busy}
            onPress={() => void connectCloud(provider)}
          >
            <Text style={styles.lineText}>{CLOUD_LABELS[provider]}</Text>
          </Pressable>
        ))}
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
  subtitle: {
    marginTop: 12,
    fontFamily: fonts.bodyBold,
    fontSize: 18,
    color: colors.ink,
  },
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
