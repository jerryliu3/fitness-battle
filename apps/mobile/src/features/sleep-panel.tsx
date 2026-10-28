import { AthleteProfileSheet, type AthleteProfileSelection } from "./athlete-profile-sheet";
import { useState } from "react";
import { SectionHeader, AppText } from "../ui/section";
import {
  buildSleepView,
  competeNow,
  formatSleepDuration,
  isSampleSleepNight,
  type Action,
  type CompeteState,
} from "@fitness-battle/shared";
import { Pressable, Text, View } from "react-native";
import { f } from "../ui/focus";
export function SleepPanel({
  state,
  dispatch,
}: {
  state: CompeteState;
  dispatch: (a: Action) => void;
}) {
  const [athlete, setAthlete] = useState<AthleteProfileSelection | null>(null);
  const rating = state.healthRatings.find((r) => r.metric === "sleep");
  if (!rating?.optedIn) return null;
  const view = buildSleepView({
    name: state.name,
    nights: state.sleepNights,
    rating,
    results: state.healthResults,
    now: competeNow(state),
  });
  return (
    <View style={f.card}>
      <Text style={f.kicker}>Recovery</Text>
      <SectionHeader title={view.lastNight ? "Latest sleep" : "No night recorded yet"}/>
      {view.lastNight ? (
        <>
          <AppText role="caption" secondary>{isSampleSleepNight(state, view.lastNight) ? "Sample reading · " : ""}Wake date {view.lastNight.day}. Weekly standings count nights in the current competition week.</AppText>
          <Text style={f.massive}>{view.lastNight.score}</Text>
          <AppText role="body" secondary >
            sleep score · {formatSleepDuration(view.lastNight.durationMin)}
            {view.lastNight.verified ? "" : " · entered on this device"}
          </AppText>
        </>
      ) : (
        <>
          <AppText role="body" secondary >
            Connect a supported sleep tracker in Athlete → Data Sync.
          </AppText>

        </>
      )}
      <View style={f.row}>
        <AppText role="body" secondary >Contest score</AppText>
        <AppText role="label" >
          {view.nightsLogged ? view.contestScore.toFixed(0) : "—"}
        </AppText>
      </View>
      {view.nightsLogged ? (
        <AppText role="caption" secondary >
          Avg: {view.mean.toFixed(0)} · nights you miss count against this
          week&apos;s contest score
        </AppText>
      ) : null}
      <View style={f.row}>
        <AppText role="body" secondary >Nights so far</AppText>
        <AppText role="label" >
          {view.elapsedNights
            ? `${view.nightsLogged} / ${view.elapsedNights}`
            : "—"}
        </AppText>
      </View>
      <View style={f.row}>
        <AppText role="body" secondary >Field</AppText>
        <AppText role="label" >
          {view.place ?? "—"} / {view.fieldSize || "—"}
        </AppText>
      </View>
      {view.rows.map((r) => (
        <Pressable key={r.id} style={f.row} accessibilityRole="button" accessibilityLabel={`View ${r.name} profile`} onPress={() => setAthlete({ id: r.id, name: r.name, you: r.you, sample: !r.you, contextLabel: "Recovery this week", contextValue: `${r.score.toFixed(0)} contest score`, contextDetail: `Place ${r.place}` })}>
          <AppText role="body" secondary >{r.place}</AppText>
          <AppText role="label" style={f.grow}>
            {r.name}
            {r.you ? " (you)" : ""}
          </AppText>
          <AppText role="label" >{r.score.toFixed(0)}</AppText>
        </Pressable>
      ))}
      <AthleteProfileSheet athlete={athlete} onClose={() => setAthlete(null)} />
    </View>
  );
}
