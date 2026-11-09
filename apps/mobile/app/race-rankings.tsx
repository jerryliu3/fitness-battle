import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { RACE_DISTANCES, RACE_CATEGORIES, raceClock, type RaceResult, type RaceResultsPage } from "@fitness-battle/shared";
import { ScreenHeader } from "../src/ui/screen-header";
import { useFocusStyles, FocusButton } from "../src/ui/focus";
import { AppText } from "../src/ui/section";
import { mobileEnv } from "../src/lib/env";

export default function RaceRankings() {
  const f = useFocusStyles();
  const router = useRouter();
  const list = useRef<FlatList<RaceResult>>(null);
  const [distance, setDistance] = useState("marathon");
  const [sex, setSex] = useState("female");
  const [draft, setDraft] = useState("");
  const [query, setQuery] = useState("");
  const [yearDraft, setYearDraft] = useState("");
  const [year, setYear] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<RaceResultsPage | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setBusy(true); setError(false); setData(null);
    const params = new URLSearchParams({ distance, sex, q: query, page: String(page), year });
    fetch(`${mobileEnv.apiUrl}/api/rankings?${params}`, { signal: controller.signal })
      .then(async response => { if (!response.ok) throw new Error("unavailable"); return response.json() as Promise<RaceResultsPage>; })
      .then(result => { if (!controller.signal.aborted) { setData(result); list.current?.scrollToOffset({offset:0,animated:false}); } })
      .catch(() => { if (!controller.signal.aborted) setError(true); })
      .finally(() => { if (!controller.signal.aborted) setBusy(false); });
    return () => controller.abort();
  }, [distance, sex, query, year, page, retry]);
  function search() {
    const parsed = Number(yearDraft);
    if (yearDraft && (!Number.isInteger(parsed) || parsed < 1900 || parsed > 2100)) return;
    setQuery(draft.trim()); setYear(yearDraft); setPage(1); setRetry(n => n + 1);
  }
  return <SafeAreaView style={f.safe} edges={["top", "bottom"]}>
    <ScreenHeader title="Race rankings" onBack={() => router.back()} />
    <FlatList ref={list} data={data?.rows ?? []} keyExtractor={row => String(row.id)} contentContainerStyle={f.content}
      ListHeaderComponent={<View style={{ gap: 16 }}>
        <View style={f.chipRow}>{RACE_DISTANCES.map(d => <Pressable key={d.slug} accessibilityRole="button" accessibilityState={{selected:distance === d.slug}} onPress={() => { setDistance(d.slug); setPage(1); }} style={[f.chip, distance === d.slug && f.chipActive]}><AppText role="label">{d.label}</AppText></Pressable>)}</View>
        <View style={f.chipRow}>{RACE_CATEGORIES.map(c => <Pressable key={c.value} accessibilityRole="button" accessibilityState={{selected:sex === c.value}} onPress={() => { setSex(c.value); setPage(1); }} style={[f.chip, sex === c.value && f.chipActive]}><AppText role="label">{c.label}</AppText></Pressable>)}</View>
        <TextInput accessibilityLabel="Athlete name or bib" value={draft} maxLength={100} onChangeText={setDraft} onSubmitEditing={search} returnKeyType="search" placeholder="Athlete or bib" style={f.input} />
        <TextInput accessibilityLabel="Edition year, blank for all years" value={yearDraft} onChangeText={setYearDraft} keyboardType="number-pad" maxLength={4} placeholder="All years" style={f.input} />
        {yearDraft && (!Number.isInteger(Number(yearDraft)) || Number(yearDraft) < 1900 || Number(yearDraft) > 2100) ? <AppText role="caption">Enter a year from 1900 to 2100.</AppText> : null}
        <FocusButton label="Find results" onPress={search} />
        <AppText role="caption" secondary>Chip time where available, otherwise official time.</AppText>
        {busy ? <ActivityIndicator accessibilityLabel="Loading race results" /> : error ? <View style={{gap:12}}><AppText role="body">Results are unavailable.</AppText><FocusButton label="Retry" secondary onPress={() => setRetry(n => n + 1)} /></View> : <AppText role="label">{data?.total.toLocaleString()} {query ? "matching results" : "published results"}</AppText>}
      </View>}
      renderItem={({item}) => <Pressable accessibilityRole="button" onPress={() => router.push({pathname:"/race-result",params:{id:String(item.id)}})} style={[f.row, { alignItems:"flex-start", paddingVertical:16 }]}>
        <AppText role="caption" secondary>{item.place.toLocaleString()}</AppText>
        <View style={f.grow}><AppText role="label">{item.athlete_name}</AppText><AppText role="caption" secondary>{item.event_name} · {item.edition_year}</AppText></View>
        <View><AppText role="label" style={{fontVariant:["tabular-nums"]}}>{raceClock(item.rank_time_ms)}</AppText><AppText role="caption" secondary>{item.rank_clock === "chip" ? "Chip" : "Official"}</AppText></View>
      </Pressable>}
      ListEmptyComponent={!busy && !error ? <AppText role="body" secondary>No results in this field. Try another name, year or category.</AppText> : undefined}
      ListFooterComponent={data && data.total > 0 ? <View style={{gap:12,marginTop:20}}><AppText role="caption" secondary>Page {data.page} of {Math.ceil(data.total / data.pageSize).toLocaleString()}</AppText><View style={f.chipRow}>{data.page > 1 && <FocusButton label="Previous" secondary onPress={() => setPage(data.page - 1)} />}{data.page * data.pageSize < data.total && <FocusButton label="Next" secondary onPress={() => setPage(data.page + 1)} />}</View></View> : undefined}
    />
  </SafeAreaView>;
}
