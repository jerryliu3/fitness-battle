import {
  activityEffort,
  BENCHMARKS,
  buildSplitBoard,
  competeNow,
  formatClockTime,
  formatPts,
  sourceFromLinks,
  sportById,
  yourBenchmarkSeconds,
  type ScoreTrack,
} from "@fitness-battle/shared";
import { router } from "expo-router";
import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useCompete } from "../../src/lib/compete-context";
import {
  Card,
  Chip,
  ChipRow,
  Copy,
  GhostButton,
  Kicker,
  LineButton,
  LoadingCopy,
  ProductHeader,
  Title,
} from "../../src/ui/primitives";
import { ui } from "../../src/ui/styles";

export default function SplitsScreen() {
  const { state } = useCompete();
  const [track, setTrack] = useState<ScoreTrack>("open");

  if (!state) return <LoadingCopy label="Loading splits…" />;

  const now = competeNow(state);
  const sport = state.primary;
  const spec = sportById(sport);
  const shownTrack: ScoreTrack = spec.gps ? track : "open";
  const board = buildSplitBoard(state, sport, shownTrack, now);
  const source = sourceFromLinks(state.links);
  const benchmark =
    sport === "running" || sport === "cycling" ? BENCHMARKS[sport][0] : null;
  const estimate = benchmark
    ? yourBenchmarkSeconds(state, sport, benchmark.meters)
    : null;

  return (
    <SafeAreaView style={ui.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={ui.scroll}>
        <ProductHeader sourceStatus={source.status} sourceLabel={source.label} />
        <View style={{ gap: 8 }}>
          <Kicker>
            {board.periodLabel} / {spec.name}
          </Kicker>
          <Title line1="YOUR" line2="SPLITS." />
          <Copy>
            The work behind the line. Each counted session is a numbered split
            for this week.
          </Copy>
        </View>

        {spec.gps ? (
          <ChipRow>
            {(
              [
                ["open", "All efforts"],
                ["verified", "Verified only"],
              ] as const
            ).map(([id, label]) => (
              <Chip
                key={id}
                label={label}
                on={shownTrack === id}
                onPress={() => setTrack(id)}
              />
            ))}
          </ChipRow>
        ) : null}

        <Card>
          {board.weekActivities.length === 0 ? (
            <Copy>No counted sessions this week yet. Sync a tracker or import history.</Copy>
          ) : (
            board.weekActivities.map((activity, index) => (
              <View key={activity.id} style={ui.row}>
                <Text style={ui.place}>{index + 1}</Text>
                <View style={ui.grow}>
                  <Text style={ui.strong}>{activity.sport}</Text>
                  <Text style={ui.small}>
                    {new Date(activity.startedAt).toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                      timeZone: "UTC",
                    })}{" "}
                    · +{formatPts(activityEffort(activity))} pts
                    {activity.verified ? " · verified" : ""}
                  </Text>
                </View>
              </View>
            ))
          )}
        </Card>

        <Card>
          {benchmark && estimate != null ? (
            <>
              <Kicker>Separate from weekly effort</Kicker>
              <Text style={ui.cardTitle}>
                Estimated {benchmark.label}: {formatClockTime(estimate)}
              </Text>
              <Copy>
                Absolute pace lives on its own board. It does not move Elo or
                this week’s effort track.
              </Copy>
            </>
          ) : (
            <>
              <Text style={ui.cardTitle}>Pace board</Text>
              <Copy>
                Absolute times stay separate from weekly effort. Open pace when
                you want completion speed, not volume.
              </Copy>
            </>
          )}
          <LineButton label="Open pace board" onPress={() => router.push("/pace")} />
        </Card>

        <GhostButton
          label={`${source.label} · manage source`}
          onPress={() => router.push("/you")}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
