import { WeekChart } from "../../src/features/week-chart";
import { LatestActivity } from "../../src/features/club-latest-activity";
import type { Activity } from "@fitness-battle/shared";

import { RivalCard } from "../../src/features/club-rival-card";

import { APP_TIMEZONE, buildTodayRoute, competeNow, countsOnTrack, dayKey, primaryFreezePeriodStart } from "@fitness-battle/shared";
import { useState, useCallback, useEffect } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { SessionStage } from "../../src/features/session-stage";
import { HomeActivityActions } from "../../src/features/home-activity-actions";
import { Journey } from "../../src/features/journey";
import { useCompeteStore } from "../../src/lib/compete-store";
import { FocusDisclosure, FocusSheet, f } from "../../src/ui/focus";
export default function Home() {
  const router = useRouter();
  const { state, dispatch, accountKey } = useCompeteStore();
  const [removed,setRemoved]=useState<Activity|null>(null);
  const [latest,setLatest]=useState<Activity|null>(null);
  const [expanded, setExpanded] = useState<"suggestion" | null>(null);
  useEffect(()=>{setLatest(null);setRemoved(null);},[accountKey]);
  useFocusEffect(useCallback(()=>()=>{setExpanded(null);setLatest(null);},[]));
  if (!state)
    return (
      <SafeAreaView style={f.safe}>
        <Text style={f.copy}>Loading your week…</Text>
      </SafeAreaView>
    );
  const route = buildTodayRoute(state);
  const now = competeNow(state);
  const counted = state.activities.filter(
    (a) => countsOnTrack(a, "open") && new Date(a.startedAt) <= now,
  );
  const units = state.units;
  return (
    <SafeAreaView style={f.safe} edges={[]}>
      <View style={s.homeStage}>
        <ScrollView
          style={s.homeOverlayScroll}
          contentContainerStyle={s.homeOverlayContent}
          showsVerticalScrollIndicator={false}
        >
          {removed?<View style={f.row}><Text accessibilityLiveRegion="polite" style={f.copy}>Session removed.</Text><Pressable accessibilityRole="button" onPress={()=>{dispatch({type:"set-disposition",activityId:removed.id,disposition:removed.disposition});setRemoved(null);}} style={{minHeight:44,justifyContent:"center"}}><Text style={f.rowTitle}>Undo</Text></Pressable></View>:null}
          {state.frozenPeriods.includes(primaryFreezePeriodStart(state)) ? (
            <Text style={f.copy}>
              ❄ Week frozen · Your effort score is protected through next
              Monday.
            </Text>
          ) : null}
          <WeekChart state={state} onOpen={() => router.push("/week")} />
          <RivalCard state={state} />
          <LatestActivity state={state} onOpen={setLatest} />
          <FocusDisclosure title="Your activity journey">
          <View style={s.homeJourneyLayer} pointerEvents="box-none">
            <Journey
              activities={counted}
              units={units}
              onToday={() => setExpanded("suggestion")}
            />
          </View>
          </FocusDisclosure>
        </ScrollView>
      </View>
      <FocusSheet open={Boolean(latest)} title="Your activity" onClose={()=>setLatest(null)}>{latest?<SessionStage state={state} activities={[latest]} onRemove={id=>{setRemoved(latest);dispatch({type:"set-disposition",activityId:id,disposition:"excluded"});setLatest(null);}}/>:null}</FocusSheet>
      <FocusSheet
        open={expanded === "suggestion"}
        title="Today"
        onClose={() => setExpanded(null)}
      >
        <SessionStage state={state} activities={counted.filter(a=>dayKey(new Date(a.startedAt),APP_TIMEZONE)===dayKey(now,APP_TIMEZONE))} suggestion={route.suggestion} actions={<HomeActivityActions/>} onRemove={activityId=>dispatch({type:"set-disposition",activityId,disposition:"excluded"})}/>
      </FocusSheet>
    </SafeAreaView>
  );
}
const s = StyleSheet.create({
  homeStage: {
    flex: 1,
    position: "relative",
  },
  homeJourneyLayer: {
    width: "100%",
  },
  homeOverlayScroll: {
    flex: 1,
  },
  homeOverlayContent: {
    paddingHorizontal: 22,
    paddingTop: 4,
    paddingBottom: 120,
    gap: 18,
  },
});
