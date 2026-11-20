import { useEffect, useState } from "react";
import { ActivityIndicator, Linking, ScrollView, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { RACE_DISTANCES, raceEventGroups, type RaceCoverage } from "@fitness-battle/shared";
import { ScreenHeader } from "../src/ui/screen-header";
import { AppText } from "../src/ui/section";
import { FocusButton, useFocusStyles } from "../src/ui/focus";
import { RaceCategoryFilter } from "../src/ui/race-category-filter";
import { mobileEnv } from "../src/lib/env";
import { useThemeColors } from "../src/theme";

export default function Coverage() {
  const f = useFocusStyles(), router = useRouter(), colors = useThemeColors();
  const [rows, setRows] = useState<RaceCoverage[] | null>(null);
  const [sex, setSex] = useState("all");
  const [search, setSearch] = useState("");
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setFailed(false);
    fetch(`${mobileEnv.apiUrl}/api/rankings/coverage`, { signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw new Error();
        return response.json() as Promise<RaceCoverage[]>;
      })
      .then(value => { if (!controller.signal.aborted) setRows(value); })
      .catch(() => { if (!controller.signal.aborted) setFailed(true); });
    return () => controller.abort();
  }, [retry]);

  const groups = raceEventGroups(rows ?? [], sex, search);
  return <SafeAreaView style={f.safe} edges={["top", "bottom"]}>
    <ScreenHeader title="Race events" onBack={() => router.back()} />
    <ScrollView contentContainerStyle={f.content} keyboardShouldPersistTaps="handled">
      <TextInput accessibilityLabel="Race name or year" placeholder="Race name or year" placeholderTextColor={colors.muted}
        style={[f.input, { color: colors.ink }]} maxLength={100} value={search} onChangeText={setSearch} />
      <RaceCategoryFilter value={sex} onChange={setSex} />
      {failed ? <FocusButton label="Retry events" onPress={() => setRetry(n => n + 1)} /> : !rows ? <ActivityIndicator /> :
        <View style={{ gap: 24 }}>
          {groups.map(row => {
            const distance = RACE_DISTANCES.find(option => option.stored === row.distance_slug);
            if (!distance) return null;
            const params = { edition: String(row.edition_id), distance: distance.slug, sex };
            return <View key={`${row.edition_id}:${row.distance_slug}`} style={{ gap: 10 }}>
              <AppText role="heading">{row.event_name}</AppText>
              <AppText role="caption">{distance.label} · {row.edition_year}</AppText>
              <AppText role="label">{row.published_count.toLocaleString()} published finishes</AppText>
              <AppText role="caption" secondary>{row.reviewedCount} of {row.categoryCount} categories reviewed</AppText>
              <FocusButton label="Explore results" secondary onPress={() => router.push({ pathname: "/race-rankings", params })} />
              <FocusButton label="Replay options" secondary onPress={() => router.push({ pathname: "/race-replay", params: { ...params, clock: "chip" } })} />
              {row.evidenceUrls.map((url, i) => <FocusButton key={url} label={`Review source${row.evidenceUrls.length > 1 ? ` ${i + 1}` : ""}`}
                secondary onPress={() => { void Linking.openURL(url); }} />)}
            </View>;
          })}
          {!groups.length && <AppText role="body">No events match these filters.</AppText>}
        </View>}
    </ScrollView>
  </SafeAreaView>;
}
