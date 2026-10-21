import { APP_TIMEZONE, roundReveal, roundEnrollment, sportById, type Action, type CompeteState, type PeriodResult } from "@fitness-battle/shared";
import { usePathname, useRouter, useGlobalSearchParams } from "expo-router";
import { useState } from "react";
import { Modal, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WeeklySocialActions } from "./weekly-social";
import { ResultCard } from "./result-card";
import { FocusButton, f } from "../ui/focus";
function Round({ state, rows, onClose }: { state: CompeteState; rows: PeriodResult[]; onClose: () => void }) {
  const [next, setNext] = useState(false);
  const router = useRouter();
  return <Modal visible presentationStyle="fullScreen" animationType="none" onRequestClose={onClose}>
    <SafeAreaView style={f.safe}><ScrollView contentContainerStyle={f.content}>
      <FocusButton label="Close results" secondary onPress={onClose}/>
      <Text style={f.kicker}>Round complete · {next ? "2 / 2" : "1 / 2"}</Text>
      <Text style={f.title}>{next ? "Keep it going." : "Your week, settled."}</Text>
      {!next ? <>
        {rows.map(result => <View key={result.id}><ResultCard result={result} units={state.units} /><WeeklySocialActions result={result} units={state.units} /></View>)}
        <FocusButton label="Next round →" onPress={() => setNext(true)}/>
      </> : <>
        {rows.map((result) => {
          const enrollment = roundEnrollment(state, result);
          return <Text key={result.id} style={f.copy}>{sportById(result.sport).name}: {enrollment.startsAt
            ? `Your current round ${enrollment.status === "upcoming" ? "starts" : "started"} ${enrollment.startsAt.toLocaleString("en-US", { timeZone: APP_TIMEZONE, timeZoneName: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}. ${enrollment.renews ? "Renews after this round." : "Stops after this round."}`
            : "You’re not registered for another round. Update sport settings to join again."}</Text>;
        })}
        <FocusButton label="Update sport settings" secondary onPress={() => { onClose(); router.push("/settings"); }}/>
        <FocusButton label="Back to Compete" onPress={onClose}/>
      </>}
    </ScrollView></SafeAreaView>
  </Modal>;
}
export function RoundTakeover({ state, ready, dispatch }: { state: CompeteState; ready: boolean; dispatch: (action: Action) => void }) {
  const path = usePathname();
  const router = useRouter();
  const replay = useGlobalSearchParams().results === "latest";
  const reveal = roundReveal(replay ? { ...state, periodResults: state.periodResults.map(row => ({ ...row, acknowledgedAt: null })) } : state);
  if (!ready || path !== "/arena" || !reveal) return null;
  return <Round key={reveal.key} state={state} rows={reveal.results} onClose={() => { dispatch({ type: "acknowledge-reveal", revealIds: reveal.ids }); if (replay) router.replace("/arena"); }}/>;
}
