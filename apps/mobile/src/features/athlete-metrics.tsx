import {
  countsOnTrack,
  distanceUnitLabel,
  formatDistanceM,
  type CompeteState,
} from "@fitness-battle/shared";
import { useRouter } from "expo-router";
import { Text, View } from "react-native";
import { FocusButton, f } from "../ui/focus";
import { EffortTrend } from "./effort-trend";
import { ProfilePhoto } from "./profile-photo";

function seasonSummary(state: CompeteState) {
  const counted = state.activities.filter((a) => countsOnTrack(a, "open"));
  const meters = counted.reduce((t, a) => t + a.distanceM, 0);
  const weeks = state.periodResults.filter(
    (r) => r.sport === state.primary && r.track === "open",
  ).length;
  return { meters, sessions: counted.length, weeks };
}

export function AthleteMetrics({
  state,
  email,
  demoMode,
  onEdit,
}: {
  state: CompeteState;
  email?: string | null;
  demoMode?: boolean;
  onEdit?: () => void;
}) {
  const router = useRouter();
  const season = seasonSummary(state);
  const unit = distanceUnitLabel(state.units);
  return (
    <>
      <View
        style={[
          f.card,
          {
            flexDirection: "row",
            alignItems: "center",
            gap: 16,
            marginVertical: 8,
          },
        ]}
      >
        <ProfilePhoto state={state} />
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={f.kicker}>{state.city || "Your own pace"}</Text>
          <Text style={f.title}>{state.name}</Text>
          {email ? (
            <Text style={f.small}>
              {email}
              {demoMode ? " · demo" : ""}
            </Text>
          ) : null}
        </View>
      </View>
      <View
        style={[f.card, { backgroundColor: "#eef0e9", borderColor: "#e0e5dc" }]}
        accessibilityLabel="Your season so far"
      >
        <Text style={f.kicker}>Your season so far</Text>
        <View style={[f.row, { marginTop: 12 }]}>
          <View style={{ flex: 1, alignItems: "center", gap: 4 }}>
            <Text style={f.h2}>
              {formatDistanceM(season.meters, state.units)}
            </Text>
            <Text style={f.small}>{unit} counted</Text>
          </View>
          <View style={{ flex: 1, alignItems: "center", gap: 4 }}>
            <Text style={f.h2}>{season.sessions}</Text>
            <Text style={f.small}>sessions</Text>
          </View>
          <View style={{ flex: 1, alignItems: "center", gap: 4 }}>
            <Text style={f.h2}>{season.weeks}</Text>
            <Text style={f.small}>settled weeks</Text>
          </View>
        </View>
      </View>
      {onEdit ? (
        <FocusButton label="Edit profile" secondary onPress={onEdit} />
      ) : null}
      <EffortTrend state={state} />
      <FocusButton
        label="Your benchmarks · pace & rankings"
        secondary
        onPress={() => router.push("/benchmarks")}
      />
    </>
  );
}
