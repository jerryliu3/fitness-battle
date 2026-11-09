import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { raceClock, type SavedRaceResult } from "@fitness-battle/shared";
import { useRaceFavorites } from "../src/lib/race-favorites";
import { mobileEnv } from "../src/lib/env";
import { ScreenHeader } from "../src/ui/screen-header";
import { useFocusStyles, FocusButton } from "../src/ui/focus";
import { AppText } from "../src/ui/section";
export default function SavedRaceResults() {
  const f = useFocusStyles();
  const router = useRouter();
  const saved = useRaceFavorites();
  const ids = saved.ids.join(",");
  const [rows,setRows] = useState<SavedRaceResult[]>([]);
  const [busy,setBusy] = useState(true);
  const [failed,setFailed] = useState(false);
  const [retry,setRetry] = useState(0);
  useFocusEffect(useCallback(() => {
    if (!saved.ready) return;
    if (!ids) { setRows([]); setBusy(false); setFailed(false); return; }
    const controller = new AbortController();
    setBusy(true); setFailed(false); setRows([]);
    fetch(`${mobileEnv.apiUrl}/api/rankings/saved?ids=${ids}`,{signal:controller.signal})
      .then(async response => { if (!response.ok) throw new Error(); return response.json() as Promise<SavedRaceResult[]>; })
      .then(value => { if (!controller.signal.aborted) setRows(value); })
      .catch(() => { if (!controller.signal.aborted) setFailed(true); })
      .finally(() => { if (!controller.signal.aborted) setBusy(false); });
    return () => controller.abort();
  }, [ids,saved.ready,retry]));
  return <SafeAreaView style={f.safe} edges={["top","bottom"]}><ScreenHeader title="Saved results" onBack={() => router.back()} /><ScrollView contentContainerStyle={f.content}>
    <AppText role="caption" secondary>Saved on this device</AppText>
    {saved.error && <View style={{gap:12}}><AppText role="body">{saved.error}</AppText>{!saved.ready && <FocusButton label="Retry" onPress={() => void saved.reload()} />}</View>}
    {busy && !saved.error ? <ActivityIndicator accessibilityLabel="Loading saved results" /> : failed ? <View style={{gap:12}}><AppText role="body">Saved results are unavailable.</AppText><FocusButton label="Retry" onPress={() => setRetry(n => n+1)} /></View> : <View style={{gap:16}}>
      {!saved.ids.length && <AppText role="body" secondary>Save a result from its race report to find it here.</AppText>}
      {saved.ids.map(id => { const row = rows.find(r => r.id === id); return <View key={id} style={{gap:12}}>{row ? <Pressable accessibilityRole="button" onPress={() => router.push({pathname:"/race-result",params:{id:String(id)}})} style={f.row}><View style={f.grow}><AppText role="label">{row.athlete_name}</AppText><AppText role="caption" secondary>{row.event_name} · {row.edition_year}</AppText></View><AppText role="label">{raceClock(row.rank_time_ms)}</AppText></Pressable> : <AppText role="body" secondary>Result unavailable</AppText>}<FocusButton label="Remove" secondary disabled={saved.busy} onPress={() => void saved.toggle(id)} /></View>; })}
    </View>}
  </ScrollView></SafeAreaView>;
}
