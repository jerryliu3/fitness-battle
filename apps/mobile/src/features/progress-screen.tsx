import { SectionStack, Section, TextAction } from "../ui/section";
import { MotionStep } from "../ui/motion-step";
import { Achievements } from "./club-achievements";
import { useEffect, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ScrollView, View } from "react-native";
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
  const { state, accountKey } = useCompeteStore();
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
        <Section
          title="Past weeks & awards"
          action={
            <TextAction
              label="View all"
              accessibilityLabel="View all past weeks and awards"
              onPress={() => router.push("/progress-history")}
            />
          }
        >
          {awardCards(state).length > 0 ? <AwardShelf cards={awardCards(state).slice(0, 3)} /> : null}
        </Section>
        <AthleteTelemetryMatrix state={state} signedOut={accountKey === "device"} />
        </View>
        </MotionStep>
      </SectionStack>
</ScrollView>
    </SafeAreaView>
  );
}
