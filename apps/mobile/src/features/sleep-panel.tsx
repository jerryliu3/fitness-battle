import {
  buildSleepView,
  competeNow,
  formatSleepDuration,
  type Action,
  type CompeteState,
} from "@fitness-battle/shared";
import { Text, View } from "react-native";
import { FocusButton, f } from "../ui/focus";
export function SleepPanel({
  state,
  dispatch,
}: {
  state: CompeteState;
  dispatch: (a: Action) => void;
}) {
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
      <Text style={f.kicker}>Sleep & Recovery</Text>
      <Text style={f.h2}>
        {view.lastNight ? "Last night" : "No night recorded yet"}
      </Text>
      {view.lastNight ? (
        <>
          <Text style={f.massive}>{view.lastNight.score}</Text>
          <Text style={f.copy}>
            sleep score · {formatSleepDuration(view.lastNight.durationMin)}
            {view.lastNight.verified ? "" : " · entered on this device"}
          </Text>
        </>
      ) : (
        <>
          <Text style={f.copy}>
            Sync a sleep tracker from Athlete, or use a clearly labeled sample
            night.
          </Text>
          <FocusButton
            label="Use a sample night"
            secondary
            onPress={() => dispatch({ type: "log-sleep" })}
          />
        </>
      )}
      <View style={f.row}>
        <Text style={f.copy}>Contest score</Text>
        <Text style={f.rowTitle}>
          {view.nightsLogged ? view.contestScore.toFixed(0) : "—"}
        </Text>
      </View>
      {view.nightsLogged ? (
        <Text style={f.small}>
          Avg: {view.mean.toFixed(0)} · nights you miss count against this
          week&apos;s contest score
        </Text>
      ) : null}
      <View style={f.row}>
        <Text style={f.copy}>Nights so far</Text>
        <Text style={f.rowTitle}>
          {view.elapsedNights
            ? `${view.nightsLogged} / ${view.elapsedNights}`
            : "—"}
        </Text>
      </View>
      <View style={f.row}>
        <Text style={f.copy}>Field</Text>
        <Text style={f.rowTitle}>
          {view.place ?? "—"} / {view.fieldSize || "—"}
        </Text>
      </View>
      {view.rows.map((r) => (
        <View key={r.id} style={f.row}>
          <Text style={f.small}>{r.place}</Text>
          <Text style={[f.rowTitle, f.grow]}>
            {r.name}
            {r.you ? " (you)" : ""}
          </Text>
          <Text style={f.rowTitle}>{r.score.toFixed(0)}</Text>
        </View>
      ))}
    </View>
  );
}
