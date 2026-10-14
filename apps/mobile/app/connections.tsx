import { router } from "expo-router";
import { useState } from "react";
import { ScrollView, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useCompete } from "../src/lib/compete-context";
import { syncAppleHealth, syncHealthConnect } from "../src/lib/device-health";
import {
  Card,
  Copy,
  GhostButton,
  Kicker,
  LineButton,
  Note,
  PrimaryButton,
  Title,
} from "../src/ui/primitives";
import { ui } from "../src/ui/styles";

/** Deep-link friendly phone health screen; full connections also live on Athlete. */
export default function ConnectionsScreen() {
  const { dispatch } = useCompete();
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function run(kind: "apple" | "android") {
    setBusy(true);
    setNote(null);
    try {
      const result =
        kind === "apple" ? await syncAppleHealth() : await syncHealthConnect();
      setNote(result.message);
      if (result.ok) {
        dispatch({
          type: "apply-sync",
          provider: kind === "apple" ? "apple_health" : "google_health",
          activities: [],
          linkStatus: "connected",
        });
      }
    } catch (error) {
      setNote(error instanceof Error ? error.message : "Sync failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={ui.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={ui.scroll}>
        <GhostButton label="← You" onPress={() => router.push("/you")} onPlum />
        <Kicker>Trackers</Kicker>
        <Title line1="Phone" line2="workouts." />
        <Copy>
          Apple Health and Health Connect stay on the device. A development or
          store build reads the last 90 days and sends them to the server.
          Strava, Garmin, WHOOP, and Oura connect from You.
        </Copy>
        <Card>
          <PrimaryButton
            label={busy ? "Syncing…" : "Sync Apple Health"}
            disabled={busy}
            onPress={() => void run("apple")}
          />
          <LineButton
            label="Sync Health Connect"
            disabled={busy}
            onPress={() => void run("android")}
          />
          {note ? <Note onCard>{note}</Note> : null}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
