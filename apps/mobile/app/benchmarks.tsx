import { SectionStack, AppText } from "../src/ui/section";
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
import { Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useCompeteStore } from "../src/lib/compete-store";
import { mobileEnv } from "../src/lib/env";
import { ScreenHeader } from "../src/ui/screen-header";
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
    <SafeAreaView style={f.safe} edges={["top", "bottom"]}>
      <ScreenHeader title="Beyond this week" onBack={() => router.canGoBack() ? router.back() : router.replace("/arena")} />
      <ScrollView contentContainerStyle={f.content}>
<SectionStack divided={false}>
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
              <AppText role="label" >
                {s === "running" ? "Running" : "Cycling"}
              </AppText>
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
              <AppText role="label" >{b.label}</AppText>
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
              <AppText role="label" >
                {s === "category"
                  ? `Your tier · ${rankForElo(state.ratings.find((r) => r.sport === sport)?.openElo ?? 500).name}`
                  : s}
              </AppText>
            </Pressable>
          ))}
        </View>
        {scope === "category" ? (
          <AppText role="body" secondary >
            Compared with athletes in your current effort score tier.
          </AppText>
        ) : null}
        <View style={f.card}>
          {rows.slice(0, 20).map((r) => (
            <View key={r.id} style={f.row}>
              <AppText role="body" secondary >{r.place}</AppText>
              <AppText role="label" style={f.grow}>{r.name}</AppText>
              <AppText role="label" >{formatClockTime(r.seconds)}</AppText>
            </View>
          ))}
          {!rows.some((r) => r.you) && (
            <AppText role="body" secondary >
              You appear after a synced activity covers {benchmark.label}.
              Longer efforts are scaled to the distance.
            </AppText>
          )}
        </View>
        <AppText role="caption" secondary >
          Published race results are kept separate.
        </AppText>
        <FocusButton
          label="Published race rankings"
          secondary
          onPress={() =>
            void WebBrowser.openBrowserAsync(`${mobileEnv.apiUrl}/rankings`)
          }
        />
      </SectionStack>
</ScrollView>
    </SafeAreaView>
  );
}
