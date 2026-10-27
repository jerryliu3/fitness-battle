import { SectionStack, AppText, SectionHeader } from "../ui/section";
import { MotionStep } from "../ui/motion-step";
import { Achievements } from "./club-achievements";
import { WeekRecap } from "./club-week-recap";
import { useEffect, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useCompeteStore } from "../lib/compete-store";
import { FocusSegments, f } from "../ui/focus";
import { AwardShelf } from "../ui/award-shelf";
import {
  awardCards,
  formatVolume,
  formatEffort,
  sportById,
  weeklyBoard,
} from "@fitness-battle/shared";
import { TrainingHistory } from "./training-history";
import { AthleteMetrics } from "./athlete-metrics";
import { useScoreTrackLens } from "../lib/score-track-lens";
export function ProgressScreen() {
  const { state } = useCompeteStore();
  const router = useRouter();
  const params=useLocalSearchParams<{view?:string}>();
  const [section,setSection]=useState<"overview"|"effort">("overview");
  useEffect(()=>{if(params.view==="effort")setSection("effort");},[params.view]);
  const [track] = useScoreTrackLens();
  if (!state) return null;
  const board = weeklyBoard(state, state.primary, track);
  const you = board.find((row) => row.you);
  return (
    <SafeAreaView style={f.safe} edges={[]}>
      <ScrollView contentContainerStyle={f.content}>
<SectionStack divided={false}>
        <FocusSegments variant="tabs" label="Progress view" value={section} options={[{value:"overview",label:"Overview"},{value:"effort",label:"Effort score"}]} onChange={setSection}/>
        <MotionStep identity={section}>
        <View style={{display:section==="effort"?"flex":"none",gap:28}}>
        <AthleteMetrics state={state} />
        <View style={f.section}>
          <Text style={f.kicker}>
            This week · {sportById(state.primary).name}
          </Text>
          <View style={[f.row, { flexWrap: "wrap" }]}>
            <View>
              <AppText role="caption" secondary >Distance</AppText>
              <AppText role="metric" >
                {you
                  ? formatVolume(
                      state.primary,
                      you.distanceM,
                      you.movingSec,
                      state.units,
                    )
                  : "—"}
              </AppText>
            </View>
            <View>
              <AppText role="caption" secondary >Effort</AppText>
              <AppText role="metric" >
                {you ? formatEffort(you.effort) : "—"}
              </AppText>
            </View>
            <View>
              <AppText role="caption" secondary >Place</AppText>
              <AppText role="metric" >
                {you ? `${you.place} / ${board.length}` : "—"}
              </AppText>
            </View>
          </View>
        </View>
        </View>
        <View style={{display:section==="overview"?"flex":"none",gap:28}}><TrainingHistory state={state}><Achievements state={state}/></TrainingHistory><WeekRecap state={state}/>
        {state.periodResults.length ? <Pressable accessibilityRole="button" style={f.section} onPress={() => router.push("/arena?results=latest")}><AppText role="label" >Latest week results ↗</AppText></Pressable> : null}
        <View style={f.section}>
          <Pressable accessibilityRole="button" onPress={() => router.push("/progress-history")}>
            <SectionHeader title="Past weeks & awards"/>
            <AppText role="body" secondary >Closed competition weeks, chapter history, and your award shelf.</AppText>
            <AppText role="label" >View all →</AppText>
          </Pressable>
          {awardCards(state).length > 0 ? <AwardShelf cards={awardCards(state).slice(0, 3)} /> : null}
        </View>
        </View>
        </MotionStep>
      </SectionStack>
</ScrollView>
    </SafeAreaView>
  );
}
