import { buildTodayRoute, type CheckpointDisc } from "@fitness-battle/shared";
import { useState } from "react";
import { ScrollView, StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useCompeteStore } from "../../src/lib/compete-store";
import { CheckpointRoute } from "../../src/ui/checkpoints";
import { DetailSheet } from "../../src/ui/detail-sheet";
import { AnimatedEmber } from "../../src/ui/mascot/animated-ember";
import { SHELL_COLORS } from "../../src/theme";

export default function TodayScreen() {
  const { state } = useCompeteStore();
  const [disc, setDisc] = useState<CheckpointDisc | null>(null);

  if (!state) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.copy}>Loading your week…</Text>
      </SafeAreaView>
    );
  }

  const route = buildTodayRoute(state);
  const sheetBody =
    disc?.role === "today"
      ? `${disc.detail} ${route.suggestion.reason}`
      : (disc?.detail ?? "");

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.kicker}>Today</Text>
        <CheckpointRoute route={route} onOpen={setDisc} />
      </ScrollView>
      <DetailSheet
        open={disc != null && disc.role !== "future"}
        title={disc?.role === "today" ? disc.title : (disc?.title ?? "Session")}
        body={sheetBody}
        onClose={() => setDisc(null)}
      >
        {disc?.role === "today" ? <AnimatedEmber action="wave" size={72} loop={false} /> : null}
      </DetailSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: SHELL_COLORS.paper },
  scroll: { paddingHorizontal: 16, paddingBottom: 24 },
  kicker: {
    fontFamily: "DMSans_700Bold",
    fontSize: 13,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: SHELL_COLORS.muted,
    marginBottom: 8,
  },
  copy: {
    fontFamily: "DMSans_400Regular",
    color: SHELL_COLORS.muted,
    padding: 20,
  },
});
