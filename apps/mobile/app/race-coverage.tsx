import { useEffect,useState } from "react";
import { ActivityIndicator,Linking,ScrollView,View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { RACE_CATEGORIES,RACE_DISTANCES,raceSourceUrl,type RaceCoverage } from "@fitness-battle/shared";
import { ScreenHeader } from "../src/ui/screen-header";
import { AppText } from "../src/ui/section";
import { FocusButton,useFocusStyles } from "../src/ui/focus";
import { mobileEnv } from "../src/lib/env";
export default function Coverage() {
  const f=useFocusStyles();const router=useRouter();
  const [rows,setRows]=useState<RaceCoverage[] | null>(null);
  const [failed,setFailed]=useState(false);const [retry,setRetry]=useState(0);
  useEffect(() => {
    const controller=new AbortController();setRows(null);setFailed(false);
    fetch(`${mobileEnv.apiUrl}/api/rankings/coverage`,{signal:controller.signal})
      .then(async response => {if(!response.ok) throw new Error();return response.json() as Promise<RaceCoverage[]>;})
      .then(value => {if(!controller.signal.aborted) setRows(value);})
      .catch(() => {if(!controller.signal.aborted) setFailed(true);});
    return () => controller.abort();
  },[retry]);
  return <SafeAreaView style={f.safe} edges={["top","bottom"]}><ScreenHeader title="Results coverage" onBack={() => router.back()} /><ScrollView contentContainerStyle={f.content}>
    <AppText role="body" secondary>Published adult-eligible finishes by edition and category. A complete field requires a source review.</AppText>
    {failed ? <View style={{gap:12}}><AppText role="body">Coverage unavailable.</AppText><FocusButton label="Retry" onPress={() => setRetry(n=>n+1)} /></View> : !rows ? <ActivityIndicator accessibilityLabel="Loading coverage" /> : <View style={{gap:24}}>{rows.map(row => {
      const source=row.evidence_url ? raceSourceUrl(row.evidence_url) : null;
      return <View key={`${row.edition_id}:${row.distance_slug}:${row.sex}`} style={{gap:10}}><AppText role="heading">{row.event_name}</AppText><AppText role="caption" secondary>{RACE_DISTANCES.find(d=>d.stored===row.distance_slug)?.label} · {RACE_CATEGORIES.find(c=>c.value===row.sex)?.label}</AppText><AppText role="label">{row.published_count.toLocaleString()} published results</AppText><AppText role="caption" secondary>{row.complete ? "Complete field reviewed" : row.expected_eligible_count !== null ? `Review needs reconciliation · expected ${row.expected_eligible_count.toLocaleString()} eligible finishes` : "Completeness not yet reviewed"}{row.undated_count>0 ? ` · ${row.undated_count.toLocaleString()} results without dates` : ""}</AppText><FocusButton label="Explore field" secondary onPress={() => router.push({pathname:"/race-rankings",params:{edition:String(row.edition_id),distance:RACE_DISTANCES.find(d=>d.stored===row.distance_slug)?.slug ?? "marathon",sex:row.sex}})} />{source && <FocusButton label="Review source" secondary onPress={()=>{void Linking.openURL(source);}} />}</View>;
    })}{!rows.length && <AppText role="body">No published results yet.</AppText>}</View>}
  </ScrollView></SafeAreaView>;
}
