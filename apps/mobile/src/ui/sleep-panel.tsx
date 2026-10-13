import {
  buildSleepView,
  formatSleepDuration,
  type CompeteState,
} from "@fitness-battle/shared";
import { Text, View } from "react-native";
import {
  Card,
  Chip,
  ChipRow,
  Copy,
  GhostButton,
  Kicker,
  Note,
  PrimaryButton,
} from "./primitives";
import { ui } from "./styles";

export function SleepPanel({
  state,
  now,
  onJoin,
  onSample,
  onLeave,
}: {
  state: CompeteState;
  now: Date;
  onJoin: () => void;
  onSample: () => void;
  onLeave: () => void;
}) {
  const rating = state.healthRatings.find((item) => item.metric === "sleep");
  if (!rating) return null;

  const view = buildSleepView({
    name: state.name,
    nights: state.sleepNights,
    rating,
    results: state.healthResults,
    now,
  });

  if (!view.optedIn) {
    return (
      <Card style={ui.empty}>
        <Text style={ui.cardTitle}>You are not on the sleep board</Text>
        <Copy>
          Sleep scores last night and your week average. It does not use
          distance.
        </Copy>
        <PrimaryButton label="Join sleep this week" onPress={onJoin} />
      </Card>
    );
  }

  return (
    <Card>
      <Kicker>Sleep</Kicker>
      <Text style={ui.cardTitle}>
        Last night {view.lastNight ? view.lastNight.score : "—"}
      </Text>
      <Copy>
        {view.lastNight
          ? `${formatSleepDuration(view.lastNight.durationMin)} · ${view.lastNight.source}`
          : "No night logged yet. Sync a tracker or record a sample."}
      </Copy>
      {view.rows.length > 0 ? (
        <View style={{ gap: 6 }}>
          {view.rows.slice(0, 8).map((row) => (
            <View key={row.id} style={[ui.row, row.you ? ui.youRow : null]}>
              <Text style={ui.place}>{row.place}</Text>
              <View style={ui.grow}>
                <Text style={ui.strong}>{row.name}</Text>
                <Text style={ui.small}>
                  Night {row.lastNight ?? "—"} · week {row.mean}
                </Text>
              </View>
            </View>
          ))}
        </View>
      ) : (
        <Note>Board fills once rivals have nights in this wave.</Note>
      )}
      <ChipRow>
        <Chip label="Sample night" onPress={onSample} />
      </ChipRow>
      <GhostButton label="Leave sleep board" onPress={onLeave} />
    </Card>
  );
}
