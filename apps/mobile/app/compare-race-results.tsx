import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Share, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { compareRaceResults, compareRaceSplits, raceClock, raceTimeGap, RACE_DISTANCES, type RaceResultReport, type RaceTimingSplits, type SavedRaceResult } from "@fitness-battle/shared";
import { mobileEnv } from "../src/lib/env";
import { ScreenHeader } from "../src/ui/screen-header";
import { AppText } from "../src/ui/section";
import { FocusButton, useFocusStyles } from "../src/ui/focus";
import { useThemeColors } from "../src/theme";
export default function CompareRaceResults() {
  const params = useLocalSearchParams<{first:string;second:string}>();
  const firstId = typeof params.first === "string" ? Number(params.first) : NaN;
  const secondId = typeof params.second === "string" ? Number(params.second) : NaN;
  const valid = [firstId,secondId].every(id => Number.isSafeInteger(id) && id > 0) && firstId !== secondId;
  const router = useRouter();
  const f = useFocusStyles();
  const colors = useThemeColors();
  const [rows,setRows] = useState<(SavedRaceResult & {event_edition_id:number;sex:string;splits?:RaceTimingSplits | null})[] | null>(null);
  const [failed,setFailed] = useState(false);
  const [retry,setRetry] = useState(0);
  const [shareFailed,setShareFailed] = useState(false);
  useEffect(() => {
    if (!valid) return;
    const controller = new AbortController();
    setRows(null); setFailed(false);
    Promise.all([firstId,secondId].map(async id=>{
      const response=await fetch(`${mobileEnv.apiUrl}/api/rankings/${id}`,{signal:controller.signal});
      if(response.status===404) return null;
      if(!response.ok) throw new Error();
      return response.json() as Promise<RaceResultReport>;
    })).then(reports=>reports.flatMap(report=>report ? [{...report.result,splits:report.splits}] : []))
      .then(value => { if (!controller.signal.aborted) setRows(value); })
      .catch(() => { if (!controller.signal.aborted) setFailed(true); });
    return () => controller.abort();
  }, [firstId,secondId,valid,retry]);
  const first = rows?.find(row => row.id === firstId);
  const second = rows?.find(row => row.id === secondId);
  const comparison = first && second ? compareRaceResults(first,second) : null;
  const checkpoints=first && second ? compareRaceSplits(first,second) : null;
  const delta = comparison?.deltaMs;
  return <SafeAreaView style={f.safe} edges={["top","bottom"]}><ScreenHeader title="Compare results" onBack={() => router.back()} /><ScrollView contentContainerStyle={f.content}>
    {!valid ? <AppText role="body">Choose two different results from your saved list.</AppText> : failed ? <View style={{gap:12}}><AppText role="body">Comparison unavailable.</AppText><FocusButton label="Retry" onPress={() => setRetry(n => n+1)} /></View> : !rows ? <ActivityIndicator accessibilityLabel="Loading comparison" /> : !first || !second ? <AppText role="body">One of these results is no longer available.</AppText> : <View style={{gap:28}}>
      {[first,second].map((row,index) => <View key={row.id} style={{gap:12}}><AppText role="caption" secondary>{RACE_DISTANCES.find(d => d.stored === row.distance_slug)?.label} · {row.edition_year}</AppText><Pressable accessibilityRole="button" onPress={() => router.push({pathname:"/race-result",params:{id:String(row.id)}})}><AppText role="heading">{row.athlete_name}</AppText></Pressable><AppText role="display">{raceClock(row.rank_time_ms)}</AppText><AppText role="caption" secondary>{row.event_name} · {row.rank_clock === "chip" ? "Chip time" : "Official time"}</AppText>{!comparison?.reason && <View style={{height:8,backgroundColor:colors.line,borderRadius:8}}><View style={{height:8,width:`${row.rank_time_ms/Math.max(first.rank_time_ms,second.rank_time_ms)*100}%`,backgroundColor:index === 0 ? colors.tennis : colors.ink,borderRadius:8}} /></View>}</View>)}
      {comparison?.reason ? <AppText role="body">{comparison.reason}</AppText> : delta === 0 ? <AppText role="heading">Equal recorded times</AppText> : <View style={{gap:8}}><AppText role="display">{raceTimeGap(delta ?? 0)}</AppText><AppText role="body">{(delta ?? 0) > 0 ? first.athlete_name : second.athlete_name}’s recorded time is faster.</AppText></View>}
      {first.event_edition_id===second.event_edition_id && first.distance_slug===second.distance_slug && first.splits && second.splits && first.splits.clock===second.splits.clock && <FocusButton label="Replay together" secondary onPress={()=>router.push({pathname:"/race-replay",params:{edition:String(first.event_edition_id),distance:RACE_DISTANCES.find(d=>d.stored===first.distance_slug)?.slug ?? "marathon",sex:"all",clock:first.splits!.clock,ids:`${first.id},${second.id}`}})} />}
      <AppText role="heading">Checkpoint gaps</AppText>
      {checkpoints?.reason ? <AppText role="caption" secondary>{checkpoints.reason}</AppText> : <View style={{gap:16}}><AppText role="caption" secondary>{checkpoints?.clock==="chip" ? "Chip" : "Official"} elapsed times at shared distances. Gaps do not establish live positions or overtakes.</AppText>{checkpoints?.rows.map(row=><View key={row.distanceM} style={{gap:6}}><AppText role="label">{row.label}</AppText><AppText role="caption">{first.athlete_name}: {row.firstMs===null ? "Unavailable" : raceClock(row.firstMs)}</AppText><AppText role="caption">{second.athlete_name}: {row.secondMs===null ? "Unavailable" : raceClock(row.secondMs)}</AppText><AppText role="label">Second − first: {row.deltaMs===null ? "Unavailable" : row.deltaMs===0 ? "Equal" : `${row.deltaMs>0 ? "+" : "−"}${raceTimeGap(row.deltaMs)}`}</AppText></View>)}</View>}
      <AppText role="caption" secondary>Each time retains its source clock. Courses, conditions and fields may differ. This comparison does not adjust performance or establish athlete identity.</AppText>
      <FocusButton label="Share comparison" secondary onPress={() => {setShareFailed(false); void Share.share({message:`${mobileEnv.apiUrl}/rankings/compare?first=${firstId}&second=${secondId}`}).catch(() => setShareFailed(true));}} />
      {shareFailed && <AppText role="caption">The comparison could not be shared. Please try again.</AppText>}
    </View>}
  </ScrollView></SafeAreaView>;
}
