import { useRouter } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useCompeteStore } from "../lib/compete-store";
import { FocusDisclosure, FocusHeading, f } from "../ui/focus";
import { AwardShelf } from "../ui/award-shelf";
import {
  awardCards,
  formatVolume,
  formatEffort,
  sportById,
  weeklyBoard,
} from "@fitness-battle/shared";
import { WeeklyChapters } from "./weekly-chapters";
import { TrainingHistory } from "./training-history";
import { AthleteMetrics } from "./athlete-metrics";
import { useScoreTrackLens } from "../lib/score-track-lens";
export function ProgressScreen() {
  const { state } = useCompeteStore();
  const router = useRouter();
  const [track] = useScoreTrackLens();
  if (!state) return null;
  const board = weeklyBoard(state, state.primary, track);
  const you = board.find((row) => row.you);
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
                {you ? `${you.place} / ${board.length}` : "—"}
              </Text>
            </View>
          </View>
        </View>
        <TrainingHistory state={state} />
        {state.periodResults.length ? <Pressable accessibilityRole="button" style={f.card} onPress={() => router.push("/arena?results=latest")}><Text style={f.rowTitle}>Latest week results ↗</Text></Pressable> : null}
        <WeeklyChapters state={state} />
        {awardCards(state).length > 0 ? (
          <FocusDisclosure title="Past competitions & awards">
            <AwardShelf cards={awardCards(state)} />
          </FocusDisclosure>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
