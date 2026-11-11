import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, ScrollView, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { RACE_DISTANCES, RACE_PERCENTILE_FILTERS, RACE_TIMEFRAMES, raceQuery, raceEditionOptions, raceWindowCaption, raceClock, racePercentileBadge, type RaceCoverage, type RaceResult, type RaceResultsPage } from "@fitness-battle/shared";
import { ScreenHeader } from "../src/ui/screen-header";
import { useFocusStyles, FocusButton } from "../src/ui/focus";
import { AppText } from "../src/ui/section";
import { RaceCategoryFilter } from "../src/ui/race-category-filter";
import { EditionAnalytics } from "../src/ui/race-edition-analytics";
import { mobileEnv } from "../src/lib/env";

export default function RaceRankings() {
  const f = useFocusStyles();
  const router = useRouter();
  const list = useRef<FlatList<RaceResult>>(null);
  const params = useLocalSearchParams<{edition?: string; distance?: string; sex?: string}>();
  const initial = raceQuery(new URLSearchParams({edition:params.edition ?? "",sex:params.sex ?? "all"}));
  const [distance, setDistance] = useState(RACE_DISTANCES.find(d => d.slug === params.distance)?.slug ?? "marathon");
  const [sex, setSex] = useState(initial.sex);
  const [percentile, setPercentile] = useState(initial.percentile ?? "all");
  const [edition, setEdition] = useState(params.edition ?? "");
  const [coverage, setCoverage] = useState<RaceCoverage[] | null>(null);
  const [coverageError, setCoverageError] = useState(false);
  const [coverageRetry, setCoverageRetry] = useState(0);
  const [draft, setDraft] = useState("");
  const [query, setQuery] = useState("");
  const [yearDraft, setYearDraft] = useState("");
  const [year, setYear] = useState("");
  const [timeframe,setTimeframe] = useState("all");
  const [fromDraft,setFromDraft] = useState(""); const [from,setFrom] = useState("");
  const [throughDraft,setThroughDraft] = useState(""); const [through,setThrough] = useState("");
  const [validation,setValidation] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<RaceResultsPage | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setCoverageError(false);
    fetch(`${mobileEnv.apiUrl}/api/rankings/coverage`, {signal:controller.signal})
      .then(async response => { if (!response.ok) throw new Error(); return response.json() as Promise<RaceCoverage[]>; })
      .then(rows => { if (!controller.signal.aborted) setCoverage(rows); })
      .catch(() => { if (!controller.signal.aborted) setCoverageError(true); });
    return () => controller.abort();
  }, [coverageRetry]);
  const editions = raceEditionOptions(coverage ?? [], RACE_DISTANCES.find(d => d.slug === distance)!.stored);
  const selectedEdition = editions.find(e => String(e.edition_id) === edition);
  useEffect(() => {
    const params = new URLSearchParams({ distance, sex, edition, q: query, page: String(page), year, timeframe, from, through, percentile });
    const parsed = raceQuery(params);
    if (parsed.dateError || parsed.editionError) {setValidation(parsed.editionError ?? parsed.dateError ?? "");setBusy(false);setData(null);setError(false);return;}
    const controller = new AbortController();
    setBusy(true); setError(false); setData(null);
    fetch(`${mobileEnv.apiUrl}/api/rankings?${params}`, { signal: controller.signal })
      .then(async response => { if (!response.ok) throw new Error("unavailable"); return response.json() as Promise<RaceResultsPage>; })
      .then(result => { if (!controller.signal.aborted) { setData(result); list.current?.scrollToOffset({offset:0,animated:false}); } })
      .catch(() => { if (!controller.signal.aborted) setError(true); })
      .finally(() => { if (!controller.signal.aborted) setBusy(false); });
    return () => controller.abort();
  }, [distance, sex, edition, query, year, timeframe, from, through, percentile, page, retry]);
  function search() {
    const parsed = raceQuery(new URLSearchParams({edition,timeframe,year:yearDraft,from:fromDraft,through:throughDraft}));
    setValidation(parsed.editionError ?? parsed.dateError ?? "");
    if (parsed.dateError || parsed.editionError) return;
    setQuery(draft.trim());setYear(yearDraft);setFrom(fromDraft);setThrough(throughDraft);setPage(1);setRetry(n=>n+1);
  }
  return <SafeAreaView style={f.safe} edges={["top", "bottom"]}>
    <ScreenHeader title="Race rankings" onBack={() => router.back()} />
    <FlatList ref={list} data={data?.rows ?? []} keyExtractor={row => String(row.id)} contentContainerStyle={f.content}
      ListHeaderComponent={<View style={{ gap: 16 }}>
        <View style={f.chipRow}>{RACE_DISTANCES.map(d => <Pressable key={d.slug} accessibilityRole="button" accessibilityState={{selected:distance === d.slug}} onPress={() => { setDistance(d.slug); setEdition(""); setPage(1); }} style={[f.chip, distance === d.slug && f.chipActive]}><AppText role="label">{d.label}</AppText></Pressable>)}</View>
        <RaceCategoryFilter value={sex} onChange={value=>{setSex(value);setPage(1);}} />
        <AppText role="label">Percentile</AppText>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:8}}>
          {RACE_PERCENTILE_FILTERS.map(p => <Pressable key={p.value} accessibilityRole="button" accessibilityState={{selected:percentile===p.value}} onPress={()=>{setPercentile(p.value);setPage(1);}} style={[f.chip,percentile===p.value && f.chipActive]}><AppText role="label">{p.label}</AppText></Pressable>)}
        </ScrollView>
        <AppText role="label">Event edition</AppText>
        {coverageError ? <View style={{gap:8}}><AppText role="caption" secondary>Event selection unavailable.</AppText><FocusButton label="Retry events" secondary onPress={() => setCoverageRetry(n=>n+1)} /></View> : !coverage ? <ActivityIndicator accessibilityLabel="Loading events" /> : null}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:8}}>
          <Pressable accessibilityRole="button" accessibilityState={{selected:!edition}} onPress={() => {setEdition("");setPage(1);}} style={[f.chip,!edition && f.chipActive]}><AppText role="label">All events</AppText></Pressable>
          {editions.map(e => <Pressable key={e.edition_id} accessibilityRole="button" accessibilityState={{selected:edition===String(e.edition_id)}} onPress={() => {setEdition(String(e.edition_id));setPage(1);}} style={[f.chip,edition===String(e.edition_id) && f.chipActive]}><AppText role="label">{e.event_name} · {e.edition_year}</AppText></Pressable>)}
        </ScrollView>
        {!!edition && <AppText role="caption" secondary>{selectedEdition ? `${selectedEdition.event_name} · ${selectedEdition.edition_year}` : "Selected event edition"} · Ranks apply to this edition, category and timeframe.</AppText>}
        {!!edition && <FocusButton label="Replay options" secondary onPress={()=>router.push({pathname:"/race-replay",params:{edition,distance,sex,clock:"chip"}})} />}
        {!!edition && <FocusButton label="Compare years" secondary onPress={()=>router.push({pathname:"/race-edition-history",params:{edition,distance,sex}})} />}
        <TextInput accessibilityLabel="Athlete name or bib" value={draft} maxLength={100} onChangeText={setDraft} onSubmitEditing={search} returnKeyType="search" placeholder="Athlete or bib" style={f.input} />
        <View style={f.chipRow}>{RACE_TIMEFRAMES.map(t => <Pressable key={t.value} accessibilityRole="button" accessibilityState={{selected:timeframe===t.value}} onPress={()=>{setTimeframe(t.value);setPage(1);setValidation("");}} style={[f.chip,timeframe===t.value && f.chipActive]}><AppText role="label">{t.label}</AppText></Pressable>)}</View>
        {timeframe === "year" && <TextInput accessibilityLabel="Edition year" value={yearDraft} onChangeText={setYearDraft} keyboardType="number-pad" maxLength={4} placeholder="Edition year" style={f.input} />}
        {timeframe === "custom" && <><TextInput accessibilityLabel="Start event date in YYYY-MM-DD format" placeholder="From · YYYY-MM-DD" value={fromDraft} onChangeText={setFromDraft} maxLength={10} style={f.input} /><TextInput accessibilityLabel="End event date in YYYY-MM-DD format" placeholder="Through · YYYY-MM-DD" value={throughDraft} onChangeText={setThroughDraft} maxLength={10} style={f.input} /></>}
        {!!validation && <AppText role="caption">{validation}</AppText>}
        <FocusButton label="Find results" onPress={search} />
        <FocusButton label="Saved results" secondary onPress={() => router.push("/saved-race-results")} />
        <FocusButton label="Results coverage" secondary onPress={() => router.push("/race-coverage")} />
        <AppText role="caption" secondary>Chip time where available, otherwise official time.</AppText>
        {!!data && !!raceWindowCaption(data) && <AppText role="caption" secondary>{raceWindowCaption(data)} · Undated results excluded.</AppText>}
        {data?.analytics && <EditionAnalytics key={`${edition}:${sex}:${timeframe}:${year}:${from}:${through}`} analytics={data.analytics} scope={edition ? "edition" : "distance"} />}
        {busy ? <ActivityIndicator accessibilityLabel="Loading race results" /> : error ? <View style={{gap:12}}><AppText role="body">Results are unavailable.</AppText><FocusButton label="Retry" secondary onPress={() => setRetry(n => n + 1)} /></View> : data ? <AppText role="label">{data.total.toLocaleString()} {query ? "matching results" : "published results"}</AppText> : <AppText role="caption" secondary>Choose a timeframe and find results.</AppText>}
      </View>}
      renderItem={({item}) => <Pressable accessibilityRole="button" onPress={() => router.push({pathname:"/race-result",params:{id:String(item.id)}})} style={[f.row, { alignItems:"flex-start", paddingVertical:16 }]}>
        <AppText role="caption" secondary>{item.place.toLocaleString()}</AppText>
        <View style={f.grow}><AppText role="label">{item.athlete_name}</AppText><AppText role="caption" secondary>{item.event_name} · {item.edition_year}</AppText></View>
        <View style={{alignItems:"flex-end"}}><AppText role="label" style={{fontVariant:["tabular-nums"]}}>{raceClock(item.rank_time_ms)}</AppText><AppText role="caption" secondary>{item.percentile != null ? racePercentileBadge(item.percentile) : (item.rank_clock === "chip" ? "Chip" : "Official")}</AppText></View>
      </Pressable>}
      ListEmptyComponent={!busy && !error && !!data ? <AppText role="body" secondary>No results in this field. Try another name, year or category.</AppText> : undefined}
      ListFooterComponent={data && data.total > 0 ? <View style={{gap:12,marginTop:20}}><AppText role="caption" secondary>Page {data.page} of {Math.ceil(data.total / data.pageSize).toLocaleString()}</AppText><View style={f.chipRow}>{data.page > 1 && <FocusButton label="Previous" secondary onPress={() => setPage(data.page - 1)} />}{data.page * data.pageSize < data.total && <FocusButton label="Next" secondary onPress={() => setPage(data.page + 1)} />}</View></View> : undefined}
    />
  </SafeAreaView>;
}
