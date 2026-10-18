import {
  BENCHMARKS,
  formatClockTime,
  paceBoard,
  rankForElo,
  type PaceScope,
} from "@fitness-battle/shared";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useCompeteStore } from "../src/lib/compete-store";
import { mobileEnv } from "../src/lib/env";
import { FocusButton, FocusHeading, f } from "../src/ui/focus";
export default function Benchmarks() {
  const { state } = useCompeteStore();
  const router = useRouter();
  const [sport, setSport] = useState<"running" | "cycling">("running");
  const [distance, setDistance] = useState("");
  const [scope, setScope] = useState<PaceScope>("global");
  if (!state) return null;
  const options = BENCHMARKS[sport];
  const benchmark = options.find((b) => b.id === distance) ?? options[0]!;
  const rows = paceBoard(state, sport, benchmark, scope);
  return (
    <SafeAreaView style={f.safe}>
      <ScrollView contentContainerStyle={f.content}>
        <FocusButton label="Back" secondary onPress={() => router.back()} />
        <FocusHeading
          kicker="Beyond this week"
          title="Your benchmarks."
          body="Distance times, separate from weekly volume and effort score."
        />
        <View style={f.chipRow}>
          {(["running", "cycling"] as const).map((s) => (
            <Pressable
              key={s}
              accessibilityRole="button"
              onPress={() => {
                setSport(s);
                setDistance("");
              }}
              style={[f.chip, sport === s && f.chipActive]}
            >
              <Text style={f.rowTitle}>
                {s === "running" ? "Running" : "Cycling"}
              </Text>
            </Pressable>
          ))}
        </View>
        <View style={f.chipRow}>
          {options.map((b) => (
            <Pressable
              key={b.id}
              accessibilityRole="button"
              onPress={() => setDistance(b.id)}
              style={[f.chip, b.id === benchmark.id && f.chipActive]}
            >
              <Text style={f.rowTitle}>{b.label}</Text>
            </Pressable>
          ))}
        </View>
        <View style={f.chipRow}>
          {(["global", "local", "category"] as const).map((s) => (
            <Pressable
              key={s}
              accessibilityRole="button"
              onPress={() => setScope(s)}
              style={[f.chip, scope === s && f.chipActive]}
            >
              <Text style={f.rowTitle}>
                {s === "category"
                  ? `Your tier · ${rankForElo(state.ratings.find((r) => r.sport === sport)?.openElo ?? 500).name}`
                  : s}
              </Text>
            </Pressable>
          ))}
        </View>
        {scope === "category" ? (
          <Text style={f.copy}>
            Compared with athletes in your current effort score tier.
          </Text>
        ) : null}
        <View style={f.card}>
          {rows.slice(0, 20).map((r) => (
            <View key={r.id} style={f.row}>
              <Text style={f.small}>{r.place}</Text>
              <Text style={[f.rowTitle, f.grow]}>{r.name}</Text>
              <Text style={f.rowTitle}>{formatClockTime(r.seconds)}</Text>
            </View>
          ))}
          {!rows.some((r) => r.you) && (
            <Text style={f.copy}>
              You appear after a synced activity covers {benchmark.label}.
              Longer efforts are scaled to the distance.
            </Text>
          )}
        </View>
        <Text style={f.small}>
          Practice peer times are synthetic. Published race results are kept
          separate.
        </Text>
        <FocusButton
          label="Published race rankings"
          secondary
          onPress={() =>
            void WebBrowser.openBrowserAsync(`${mobileEnv.apiUrl}/rankings`)
          }
        />
      </ScrollView>
    </SafeAreaView>
  );
}
