import { Achievements } from "./club-achievements";
import { WeekRecap } from "./club-week-recap";
import { useEffect, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useCompeteStore } from "../lib/compete-store";
import { FocusDisclosure, FocusHeading, FocusSegments, f } from "../ui/focus";
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
  const params=useLocalSearchParams<{view?:string}>();
  const [section,setSection]=useState<"overview"|"effort"|"history">("overview");
  useEffect(()=>{if(params.view==="effort")setSection("effort");},[params.view]);
  const [track] = useScoreTrackLens();
  if (!state) return null;
  const board = weeklyBoard(state, state.primary, track);
  const you = board.find((row) => row.you);
  return (
    <SafeAreaView style={f.safe} edges={[]}>
      <ScrollView contentContainerStyle={f.content}>
        <FocusHeading kicker="Every effort adds up" title="Progress" body="A little further. A little more you." />
        <FocusSegments label="Progress view" value={section} options={[{value:"overview",label:"Overview"},{value:"effort",label:"Effort score"},{value:"history",label:"History"}]} onChange={setSection}/>
        <View style={{display:section==="effort"?"flex":"none",gap:18}}>
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
        </View>
        <View style={{display:section==="overview"?"flex":"none",gap:18}}><TrainingHistory state={state}><Achievements state={state}/></TrainingHistory><WeekRecap state={state}/></View>
        <View style={{display:section==="history"?"flex":"none",gap:18}}>
        {state.periodResults.length ? <Pressable accessibilityRole="button" style={f.card} onPress={() => router.push("/arena?results=latest")}><Text style={f.rowTitle}>Latest week results ↗</Text></Pressable> : null}
        <WeeklyChapters state={state} />
        {awardCards(state).length > 0 ? (
          <FocusDisclosure title="Past competitions & awards">
            <AwardShelf cards={awardCards(state)} />
          </FocusDisclosure>
        ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
