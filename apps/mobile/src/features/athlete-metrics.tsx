import { EffortTrend } from "./effort-trend";
import { ProfilePhoto } from "./profile-photo";
import { Image, Text, View } from "react-native";
import Svg, { Line, Polyline, Circle } from "react-native-svg";
import {
  countsOnTrack,
  distanceUnitLabel,
  formatDistanceM,
  initialsFromName,
  rankForElo,
  type CompeteState,
} from "@fitness-battle/shared";
import { FocusButton, f } from "../ui/focus";
import { useRouter } from "expo-router";

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
  const rating = state.ratings.find((r) => r.sport === state.primary);
  const elo = rating?.openElo ?? 0;
  const verifiedElo = rating?.verifiedElo ?? 0;
  const season = seasonSummary(state);
  const unit = distanceUnitLabel(state.units);
  const settledWeeks = season.weeks;
  const values = state.periodResults
    .filter((r) => r.sport === state.primary && r.track === "open")
    .slice()
    .sort((a, b) => a.periodStart.localeCompare(b.periodStart))
    .map((r) => r.eloAfter);
  if (!values.length || values.at(-1) !== elo) values.push(elo);
  const low = Math.max(0, Math.min(...values) - 20),
    high = Math.max(values.length ? low + 40 : 40, Math.max(...values) + 20);
  const points = values
    .map(
      (v, i) =>
        `${values.length === 1 ? 160 : (i / (values.length - 1)) * 320},${105 - ((v - low) / (high - low)) * 85}`,
    )
    .join(" ");
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
          <Text style={f.kicker}>
            Athlete · {state.city || "Your own pace"}
          </Text>
          <Text style={f.title}>{state.name}</Text>
          {email ? (
            <Text style={f.small}>
              {email}
              {demoMode ? " · demo" : ""}
            </Text>
          ) : null}
          <Text style={f.copy}>Your own kind of progress.</Text>
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
