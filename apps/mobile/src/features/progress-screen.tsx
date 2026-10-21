import { useRouter } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useCompeteStore } from "../lib/compete-store";
import { FocusHeading, FocusSegments, f } from "../ui/focus";
import {
  APP_TIMEZONE,
  formatVolume,
  formatEffort,
  sportById,
  weeklyBoard,
  type ScoreTrack,
  type SportId,
} from "@fitness-battle/shared";
import { TrainingHistory } from "./training-history";
import { AthleteMetrics } from "./athlete-metrics";
import { useState } from "react";
import { useScoreTrackLens } from "../lib/score-track-lens";
export function ProgressScreen() {
  const { state } = useCompeteStore();
  const router = useRouter();
  const [track] = useScoreTrackLens();
  const [sportFilter, setSportFilter] = useState<SportId | "all" | null>(null);
  const [trackFilter, setTrackFilter] = useState<ScoreTrack | "all">("open");
  if (!state) return null;
  const you = weeklyBoard(state, state.primary, track).find((row) => row.you);
  const sports = [
    ...new Set(state.periodResults.map((row) => row.sport)),
  ].sort();
  const history = state.periodResults
    .filter(
      (row) =>
        (sportFilter === "all" ||
          row.sport === (sportFilter ?? state.primary)) &&
        (trackFilter === "all" || row.track === trackFilter),
    )
    .sort((a, b) => b.periodStart.localeCompare(a.periodStart));
  return (
    <SafeAreaView style={f.safe} edges={[]}>
      <ScrollView contentContainerStyle={f.content}>
        <FocusHeading kicker="The long view" title="Your own benchmark." />
        <AthleteMetrics state={state} />
        <View style={f.card}>
          <Text style={f.kicker}>
            This week · {sportById(state.primary).name}
          </Text>
          <View style={[f.row, { flexWrap: "wrap" }]}>
            <View>
              <Text style={f.small}>Distance</Text>
              <Text style={f.rowTitle}>
                {you
                  ? formatVolume(
                      state.primary,
                      you.distanceM,
                      you.movingSec,
                      state.units,
                    )
                  : "—"}
              </Text>
            </View>
            <View>
              <Text style={f.small}>Effort</Text>
              <Text style={f.rowTitle}>
                {you ? formatEffort(you.effort) : "—"}
              </Text>
            </View>
            <View>
              <Text style={f.small}>Place</Text>
              <Text style={f.rowTitle}>
                {you ? `${you.place} / field` : "—"}
              </Text>
            </View>
          </View>
        </View>
        <TrainingHistory state={state} />
        {state.periodResults.length ? <Pressable accessibilityRole="button" style={f.card} onPress={() => router.push("/arena?results=latest")}><Text style={f.rowTitle}>Latest week results ↗</Text></Pressable> : null}
        <Text style={f.h2}>Season history</Text>
        {state.periodResults.length ? (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {(["all", ...sports] as const).map((sport) => (
                  <Pressable
                    key={sport}
                    accessibilityRole="button"
                    accessibilityState={{
                      selected: (sportFilter ?? state.primary) === sport,
                    }}
                    onPress={() => setSportFilter(sport)}
                    style={[
                      f.chip,
                      (sportFilter ?? state.primary) === sport && f.chipActive,
                    ]}
                  >
                    <Text style={f.rowTitle}>
                      {sport === "all" ? "All sports" : sportById(sport).name}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
            <FocusSegments
              label="Season history track"
              value={trackFilter}
              options={[
                { value: "open", label: "All efforts" },
                { value: "verified", label: "Verified" },
                { value: "all", label: "Both tracks" },
              ]}
              onChange={setTrackFilter}
            />
            {!history.length ? (
              <Text style={f.copy}>No closed weeks match these filters.</Text>
            ) : null}
            {history.map((r) => (
              <View key={r.id} style={f.card}>
                <Text style={f.kicker}>
                  {r.sport} · {r.track}
                </Text>
                <Text style={f.h2}>
                  Place {r.place} / {r.fieldSize}
                </Text>
                <Text style={f.copy}>
                  {new Date(r.periodStart).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    timeZone: APP_TIMEZONE,
                  })}{" "}
                  ·{" "}
                  {formatVolume(
                    r.sport,
                    r.distanceM > 0 ? r.distanceM : r.effort,
                    r.movingSec > 0 ? r.movingSec : r.effort,
                    state.units,
                  )}
                </Text>
                <Text style={f.rowTitle}>
                  {r.eloBefore} → {r.eloAfter} Effort Score
                  {r.frozen ? " · frozen" : ""}
                </Text>
              </View>
            ))}
          </>
        ) : (
          <Text style={f.copy}>
            Complete your first competition week to start your season history.
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
