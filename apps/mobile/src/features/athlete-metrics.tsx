import { Text, View } from "react-native";
import Svg, { Line, Polyline, Circle } from "react-native-svg";
import {
  countsOnTrack,
  initialsFromName,
  rankForElo,
  type CompeteState,
} from "@fitness-battle/shared";
import { FocusButton, f } from "../ui/focus";
import { useRouter } from "expo-router";

function seasonSummary(state: CompeteState) {
  const counted = state.activities.filter((a) => countsOnTrack(a, "open"));
  const km = counted.reduce((t, a) => t + a.distanceM, 0) / 1000;
  const weeks = state.periodResults.filter(
    (r) => r.sport === state.primary && r.track === "open",
  ).length;
  return { km, sessions: counted.length, weeks };
}

export function AthleteMetrics({ state }: { state: CompeteState }) {
  const router = useRouter();
  const rating = state.ratings.find((r) => r.sport === state.primary);
  const elo = rating?.openElo ?? 1000;
  const season = seasonSummary(state);
  const settledWeeks = season.weeks;
  const values = state.periodResults
    .filter((r) => r.sport === state.primary && r.track === "open")
    .slice()
    .sort((a, b) => a.periodStart.localeCompare(b.periodStart))
    .map((r) => r.eloAfter);
  if (!values.length || values.at(-1) !== elo) values.push(elo);
  const low = Math.min(...values) - 20,
    high = Math.max(...values) + 20;
  const points = values
    .map(
      (v, i) =>
        `${values.length === 1 ? 160 : (i / (values.length - 1)) * 320},${105 - ((v - low) / (high - low)) * 85}`,
    )
    .join(" ");
  return (
    <>
      <View style={{ alignItems: "center", gap: 12, marginVertical: 18 }}>
        <View
          style={{
            width: 86,
            height: 86,
            borderRadius: 44,
            backgroundColor: "#26382d",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Text
            style={{
              fontFamily: "DMSans_400Regular",
              fontSize: 29,
              color: "#d4ee89",
            }}
          >
            {initialsFromName(state.name)}
          </Text>
        </View>
        <Text style={f.kicker}>Athlete · {state.city || "Your own pace"}</Text>
        <Text style={f.title}>{state.name}</Text>
        <Text style={f.copy}>Your own kind of progress.</Text>
      </View>
      <View
        style={[f.card, { backgroundColor: "#edf2e8", borderColor: "#d7e0d0" }]}
        accessibilityLabel="Your season so far"
      >
        <Text style={f.kicker}>Your season so far</Text>
        <View style={[f.row, { marginTop: 12 }]}>
          <View style={{ flex: 1, alignItems: "center", gap: 4 }}>
            <Text style={f.h2}>{season.km.toFixed(1)}</Text>
            <Text style={f.small}>km counted</Text>
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
      <View style={f.card}>
        <View style={f.row}>
          <View>
            <Text style={f.kicker}>{rankForElo(elo).name} · Open Elo</Text>
            <Text style={f.massive}>{elo}</Text>
          </View>
          <View>
            <Text style={[f.h2, { textAlign: "right" }]}>
              {rating?.verifiedElo ?? 1000}
            </Text>
            <Text style={f.small}>GPS-verified Elo</Text>
          </View>
        </View>
        <Svg
          width="100%"
          height={130}
          viewBox="0 0 325 125"
          accessible
          accessibilityLabel={
            values.length > 1
              ? "Settled weekly Elo trend"
              : "Current Elo; no closed weeks yet"
          }
        >
          <Line x1={0} x2={320} y1={35} y2={35} stroke="#e0e5dd" />
          <Line x1={0} x2={320} y1={75} y2={75} stroke="#e0e5dd" />
          {values.length === 1 ? (
            <Circle cx={160} cy={62} r={5} fill="#26382d" />
          ) : (
            <Polyline
              points={points}
              fill="none"
              stroke="#26382d"
              strokeWidth={3}
              strokeLinejoin="round"
            />
          )}
        </Svg>
        <Text style={f.small}>
          {settledWeeks > 0
            ? `${settledWeeks} settled weeks · your own progress over time`
            : "Your history starts with your first completed week."}
        </Text>
      </View>
      <FocusButton
        label="Your benchmarks · pace & rankings"
        secondary
        onPress={() => router.push("/benchmarks")}
      />
    </>
  );
}
