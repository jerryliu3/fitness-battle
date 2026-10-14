import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  DISTANCES,
  clockLabel,
  createRankingsClient,
  distanceSlug,
  formatRaceTime,
  type LeaderboardRow,
} from "../../src/lib/rankings";
import {
  Card,
  Copy,
  GhostButton,
  Kicker,
  LoadingCopy,
  Note,
  Title,
} from "../../src/ui/primitives";
import { ui } from "../../src/ui/styles";

async function loadBoard(
  distance: string,
  sex: string,
): Promise<LeaderboardRow[]> {
  const client = createRankingsClient();
  if (!client) return [];
  const { data, error } = await client.rpc("rankings_top", {
    p_distance: distance,
    p_sex: sex,
    p_limit: 200,
  });
  if (error || !data) return [];
  return data as LeaderboardRow[];
}

function Board({ title, rows }: { title: string; rows: LeaderboardRow[] }) {
  return (
    <Card>
      <Text style={ui.cardTitle}>{title}</Text>
      {rows.length === 0 ? (
        <Note>No results yet.</Note>
      ) : (
        rows.slice(0, 50).map((row, index) => (
          <View key={row.id} style={ui.row}>
            <Text style={ui.place}>{index + 1}</Text>
            <View style={ui.grow}>
              <Text style={ui.strong}>{row.athlete_name}</Text>
              <Text style={ui.small}>
                {row.event_name} {row.edition_year} · {clockLabel(row.rank_clock)}
              </Text>
            </View>
            <Text style={ui.strong}>{formatRaceTime(row.rank_time_ms)}</Text>
          </View>
        ))
      )}
    </Card>
  );
}

export default function DistanceBoardScreen() {
  const { distance } = useLocalSearchParams<{ distance: string }>();
  const slug = typeof distance === "string" ? distance : "";
  const stored = distanceSlug(slug);
  const label = DISTANCES.find((item) => item.slug === slug)?.label;
  const [women, setWomen] = useState<LeaderboardRow[] | null>(null);
  const [men, setMen] = useState<LeaderboardRow[] | null>(null);

  useEffect(() => {
    if (!stored) return;
    void Promise.all([loadBoard(stored, "female"), loadBoard(stored, "male")]).then(
      ([w, m]) => {
        setWomen(w);
        setMen(m);
      },
    );
  }, [stored]);

  if (!stored || !label) {
    return (
      <SafeAreaView style={ui.safe}>
        <Copy>Unknown distance.</Copy>
        <GhostButton label="All distances" onPress={() => router.push("/rankings")} />
      </SafeAreaView>
    );
  }

  if (women == null || men == null) {
    return <LoadingCopy label="Loading board…" />;
  }

  const sources = [
    ...new Set([...women, ...men].map((row) => row.attribution)),
  ];

  return (
    <SafeAreaView style={ui.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={ui.scroll}>
        <GhostButton
          label="← All distances"
          onPress={() => router.push("/rankings")}
          onPlum
        />
        <Kicker>{label}</Kicker>
        <Title line1={label} />
        <Copy>
          {women[0] || men[0]
            ? "Fastest published finishers. Chip time when the source has one, otherwise the official time."
            : "No finishers are published for this distance yet."}
        </Copy>
        <Board title="Women" rows={women} />
        <Board title="Men" rows={men} />
        {sources.length > 0 ? <Note>{sources.join(" · ")}</Note> : null}
      </ScrollView>
    </SafeAreaView>
  );
}
