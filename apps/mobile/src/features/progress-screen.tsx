import { SectionStack, AppText, SectionHeader } from "../ui/section";
import { MotionStep } from "../ui/motion-step";
import { Achievements } from "./club-achievements";
import { useEffect, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useCompeteStore } from "../lib/compete-store";
import { FocusSegments, f } from "../ui/focus";
import { AwardShelf } from "../ui/award-shelf";
import {
  awardCards,
} from "@fitness-battle/shared";
import { TrainingHistory } from "./training-history";
import { AthleteMetrics } from "./athlete-metrics";
import { AthleteTelemetryMatrix } from "./athlete-telemetry-matrix";
export function ProgressScreen() {
  const { state } = useCompeteStore();
  const router = useRouter();
  const params=useLocalSearchParams<{view?:string}>();
  const [section,setSection]=useState<"overview"|"effort">("overview");
  useEffect(()=>{if(params.view==="effort")setSection("effort");},[params.view]);
  if (!state) return null;
  return (
    <SafeAreaView style={f.safe} edges={[]}>
      <ScrollView contentContainerStyle={f.content}>
<SectionStack divided={false}>
        <FocusSegments variant="tabs" label="Progress view" value={section} options={[{value:"overview",label:"Overview"},{value:"effort",label:"Effort score"}]} onChange={setSection}/>
        <MotionStep identity={section}>
        <View style={{display:section==="effort"?"flex":"none",gap:28}}>
        <AthleteMetrics state={state} />
        </View>
        <View style={{display:section==="overview"?"flex":"none",gap:28}}><TrainingHistory state={state}><Achievements state={state}/></TrainingHistory>
        <View style={f.section}>
          <Pressable accessibilityRole="button" onPress={() => router.push("/progress-history")}>
            <SectionHeader title="Past weeks & awards"/>
            <AppText role="body" secondary >Closed competition weeks, chapter history, and your award shelf.</AppText>
            <AppText role="label" >View all →</AppText>
          </Pressable>
          {awardCards(state).length > 0 ? <AwardShelf cards={awardCards(state).slice(0, 3)} /> : null}
        </View>
        <AthleteTelemetryMatrix state={state} />
        </View>
        </MotionStep>
      </SectionStack>
</ScrollView>
    </SafeAreaView>
  );
}
