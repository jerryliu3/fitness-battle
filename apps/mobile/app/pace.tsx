import {
  BENCHMARKS,
  formatClockTime,
  paceBoard,
  type Benchmark,
  type PaceScope,
} from "@fitness-battle/shared";
import { router } from "expo-router";
import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useCompete } from "../src/lib/compete-context";
import {
  Card,
  Chip,
  ChipRow,
  Copy,
  GhostButton,
  Kicker,
  LoadingCopy,
  Note,
  Title,
} from "../src/ui/primitives";
import { ui } from "../src/ui/styles";

export default function PaceScreen() {
  const { state } = useCompete();
  const [sport, setSport] = useState<"running" | "cycling">("running");
  const [scope, setScope] = useState<PaceScope>("global");
  const [benchmark, setBenchmark] = useState<Benchmark>(BENCHMARKS.running[0]!);

  if (!state) return <LoadingCopy label="Loading pace…" />;

  const options = BENCHMARKS[sport];
  const selected = options.find((item) => item.id === benchmark.id) ?? options[0]!;
  const rows = paceBoard(state, sport, selected, scope);
  const you = rows.find((row) => row.you);

  return (
    <SafeAreaView style={ui.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={ui.scroll}>
        <GhostButton label="← Back" onPress={() => router.back()} onPlum />
        <View style={{ gap: 8 }}>
          <Kicker>Speed, not effort</Kicker>
          <Title line1="ABSOLUTE" line2="TIMES." />
          <Copy>
            This board is completion time for a distance. It does not move your
            Elo or the weekly effort track. Local uses your city. Category uses
            your current rank band.
          </Copy>
        </View>

        <ChipRow>
          {(["running", "cycling"] as const).map((id) => (
            <Chip
              key={id}
              label={id === "running" ? "Running" : "Cycling"}
              on={sport === id}
              onPress={() => {
                setSport(id);
                setBenchmark(BENCHMARKS[id][0]!);
              }}
            />
          ))}
        </ChipRow>
        <ChipRow>
          {options.map((item) => (
            <Chip
              key={item.id}
              label={item.label}
              on={selected.id === item.id}
              onPress={() => setBenchmark(item)}
            />
          ))}
        </ChipRow>
        <ChipRow>
          {(
            [
              ["global", "Global"],
              ["local", "Local"],
              ["category", "Category"],
            ] as const
          ).map(([id, label]) => (
            <Chip
              key={id}
              label={label}
              on={scope === id}
              onPress={() => setScope(id)}
            />
          ))}
        </ChipRow>

        <Card>
          {rows.length === 0 ? (
            <Copy>No one in this slice yet.</Copy>
          ) : (
            rows.slice(0, 20).map((row) => (
              <View key={row.id} style={[ui.row, row.you ? ui.youRow : null]}>
                <Text style={ui.place}>{row.place}</Text>
                <View style={ui.grow}>
                  <Text style={ui.strong}>{row.name}</Text>
                  <Text style={ui.small}>{row.city}</Text>
                </View>
                <Text style={ui.strong}>{formatClockTime(row.seconds)}</Text>
              </View>
            ))
          )}
          {!you ? (
            <Note>
              You are not on this list until a synced effort covers {selected.label}.
              Longer activities are scaled back to the distance.
            </Note>
          ) : null}
        </Card>

        <GhostButton
          label="Race rankings →"
          onPress={() => router.push("/rankings")}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
