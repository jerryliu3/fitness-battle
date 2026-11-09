import { useEffect, useState } from "react";
import { ActivityIndicator, Linking, Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { raceClock, raceSourceUrl, type RaceResultReport } from "@fitness-battle/shared";
import { useFocusStyles, FocusButton } from "../src/ui/focus";
import { AppText } from "../src/ui/section";
import { ScreenHeader } from "../src/ui/screen-header";
import { useThemeColors } from "../src/theme";
import { mobileEnv } from "../src/lib/env";

export default function RaceResult() {
  const f = useFocusStyles();
  const colors = useThemeColors();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [report, setReport] = useState<RaceResultReport | null>(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [showValues, setShowValues] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    setReport(null); setError(""); setShowValues(false);
    fetch(`${mobileEnv.apiUrl}/api/rankings/${encodeURIComponent(id)}`, { signal:controller.signal })
      .then(async response => { if (!response.ok) throw new Error(response.status === 404 ? "Result not found." : "Result unavailable."); return response.json() as Promise<RaceResultReport>; })
      .then(value => { if (!controller.signal.aborted) setReport(value); })
      .catch(e => { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : "Result unavailable."); });
    return () => controller.abort();
  }, [id, retry]);
  const r = report?.result;
  const source = r ? raceSourceUrl(r.source_url) : null;
  const peak = Math.max(...(report?.bins.map(b => b.count) ?? []), 1);
  return <SafeAreaView style={f.safe} edges={["top","bottom"]}>
    <ScreenHeader title="Race report" onBack={() => router.back()} />
    <ScrollView contentContainerStyle={f.content}>
      {!report ? error ? <View style={{gap:16}}><AppText role="body">{error}</AppText><FocusButton label="Retry" onPress={() => setRetry(n => n+1)} /></View> : <ActivityIndicator accessibilityLabel="Loading result" /> : <View style={{gap:24}}>
        <View style={{gap:12}}><AppText role="caption" secondary>{report.result.event_name} · {report.result.edition_year}</AppText><AppText role="display">{report.result.athlete_name}</AppText><AppText role="display" style={{fontVariant:["tabular-nums"]}}>{raceClock(report.result.rank_time_ms)}</AppText><AppText role="caption" secondary>{report.result.rank_clock === "chip" ? "Chip time" : "Official time"}</AppText></View>
        <View style={f.row}><View style={f.grow}><AppText role="caption" secondary>Recorded field rank</AppText><AppText role="label">{report.place.toLocaleString()} / {report.total.toLocaleString()}</AppText></View><View><AppText role="caption" secondary>Field median</AppText><AppText role="label">{raceClock(report.medianMs)}</AppText></View></View>
        <AppText role="label">Your place in the field</AppText>
        <AppText role="caption" secondary>Published results from this edition and category. Import completeness has not been verified; these are not official placements or worldwide percentiles.</AppText>
        <View accessibilityLabel="Finish-time distribution" style={{height:160,flexDirection:"row",alignItems:"flex-end",gap:2}}>{Array.from({length:Math.max(...report.bins.map(b => b.bucket),0)+1},(_,index) => {
          const bin = report.bins.find(b => b.bucket === index);
          const selected = Math.floor((report.result.rank_time_ms-report.minimumMs)/report.binWidthMs) === index;
          return <View key={index} style={{flex:1,height:`${(bin?.count ?? 0)/peak*100}%`,backgroundColor:selected ? colors.tennis : colors.line,borderRadius:3}} />;
        })}</View>
        <FocusButton secondary label={showValues ? "Hide distribution values" : "Inspect distribution"} onPress={() => setShowValues(v => !v)} />
        {showValues && report.bins.map(b => <AppText key={b.bucket} role="caption">{raceClock(report.minimumMs+b.bucket*report.binWidthMs)}–{raceClock(report.minimumMs+(b.bucket+1)*report.binWidthMs)} · {b.count.toLocaleString()} results</AppText>)}
        <AppText role="label">Nearby finishers</AppText>
        {report.neighbors.map(n => <Pressable accessibilityRole="button" key={n.id} onPress={() => router.replace({pathname:"/race-result",params:{id:String(n.id)}})} style={f.row}><AppText role="label" style={f.grow}>{n.athlete_name}</AppText><AppText role="label">{raceClock(n.rank_time_ms)}</AppText></Pressable>)}
        <AppText role="caption" secondary>{report.result.attribution}</AppText>
        {source && <FocusButton label="View source" secondary onPress={() => { void Linking.openURL(source); }} />}
      </View>}
    </ScrollView>
  </SafeAreaView>;
}
