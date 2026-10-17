import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useCompeteStore } from "../src/lib/compete-store";
import { FocusButton, FocusHeading, f } from "../src/ui/focus";
import { AthleteMetrics } from "../src/features/athlete-metrics";
export default function Progress() {
  const { state } = useCompeteStore();
  const router = useRouter();
  if (!state) return null;
  return (
    <SafeAreaView style={f.safe}>
      <ScrollView contentContainerStyle={f.content}>
        <FocusButton
          label="Back to Athlete"
          secondary
          onPress={() => router.back()}
        />
        <FocusHeading kicker="The long view" title="Your own benchmark." />
        <AthleteMetrics state={state} />
        <View style={f.card}>
          <Text style={f.kicker}>Counted training</Text>
          <Text style={f.massive}>
            {state.activities.filter((a) => a.disposition === "counted").length}
          </Text>
          <Text style={f.copy}>Sessions in your activity history</Text>
        </View>
        <Text style={f.h2}>Season history</Text>
        {state.periodResults.length ? (
          state.periodResults
            .slice()
            .sort((a, b) => b.periodStart.localeCompare(a.periodStart))
            .map((r) => (
              <View key={r.id} style={f.card}>
                <Text style={f.kicker}>
                  {r.sport} · {r.track}
                </Text>
                <Text style={f.h2}>
                  Place {r.place} / {r.fieldSize}
                </Text>
                <Text style={f.copy}>
                  {new Date(r.periodStart).toLocaleDateString()} ·{" "}
                  {r.effort.toFixed(1)} effort
                </Text>
                <Text style={f.rowTitle}>
                  {r.eloBefore} → {r.eloAfter} Effort Score{r.frozen ? " · frozen" : ""}
                </Text>
              </View>
            ))
        ) : (
          <Text style={f.copy}>
            Complete your first competition week to start your season history.
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
