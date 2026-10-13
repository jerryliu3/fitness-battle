import { useEffect, useState } from "react";
import { ScrollView, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import {
  DISTANCES,
  createRankingsClient,
} from "../../src/lib/rankings";
import {
  Card,
  Copy,
  GhostButton,
  Kicker,
  LineButton,
  Note,
  Title,
} from "../../src/ui/primitives";
import { ui } from "../../src/ui/styles";

export default function RankingsHomeScreen() {
  const [counts, setCounts] = useState<Map<string, number>>(new Map());
  const [configured, setConfigured] = useState(true);

  useEffect(() => {
    const client = createRankingsClient();
    if (!client) {
      setConfigured(false);
      return;
    }
    void client
      .from("rankings_distance_stats")
      .select("distance_slug, result_count")
      .then(({ data }) => {
        const next = new Map<string, number>();
        for (const row of data ?? []) {
          next.set(
            row.distance_slug as string,
            Number(row.result_count) || 0,
          );
        }
        setCounts(next);
      });
  }, []);

  return (
    <SafeAreaView style={ui.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={ui.scroll}>
        <GhostButton label="← Fitness Battle" onPress={() => router.push("/")} />
        <Kicker>Race Rankings</Kicker>
        <Title line1="Road" line2="leaderboards." />
        <Copy>
          Finishers from audited public results, split by distance and sex.
          People under 18 are not stored.
        </Copy>

        {DISTANCES.map((distance) => {
          const stored =
            distance.slug === "half-marathon" ? "half_marathon" : distance.slug;
          const count = counts.get(stored) ?? 0;
          return (
            <Card key={distance.slug}>
              <Text style={ui.cardTitle}>{distance.label}</Text>
              <Copy>
                {count > 0
                  ? `${count} ${count === 1 ? "result" : "results"}`
                  : "No results yet"}
              </Copy>
              {count > 0 ? (
                <LineButton
                  label="Open board"
                  onPress={() =>
                    router.push({
                      pathname: "/rankings/[distance]",
                      params: { distance: distance.slug },
                    })
                  }
                />
              ) : null}
            </Card>
          );
        })}

        <Note>
          A distance page shows the fastest 200 women and 200 men.
          {!configured
            ? " The rankings database is not configured in this environment."
            : ""}
        </Note>
      </ScrollView>
    </SafeAreaView>
  );
}
