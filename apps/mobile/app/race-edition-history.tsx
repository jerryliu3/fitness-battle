import {useEffect,useState} from "react";
import {ActivityIndicator,ScrollView,View} from "react-native";
import {SafeAreaView} from "react-native-safe-area-context";
import {useLocalSearchParams,useRouter} from "expo-router";
import {raceClock,type RaceEditionTrend} from "@fitness-battle/shared";
import {ScreenHeader} from "../src/ui/screen-header";
import {AppText} from "../src/ui/section";
import {FocusButton,useFocusStyles} from "../src/ui/focus";
import {mobileEnv} from "../src/lib/env";
export default function EditionHistory() {
  const params=useLocalSearchParams<{edition:string;distance:string;sex:string}>(),router=useRouter(),f=useFocusStyles();
  const [rows,setRows]=useState<RaceEditionTrend[] | null>(null),[failed,setFailed]=useState(false),[retry,setRetry]=useState(0);
  useEffect(()=>{const controller=new AbortController();setRows(null);setFailed(false);
    fetch(`${mobileEnv.apiUrl}/api/rankings/history?${new URLSearchParams({edition:params.edition,distance:params.distance,sex:params.sex})}`,{signal:controller.signal})
      .then(async r=>{if(!r.ok) throw new Error();return r.json() as Promise<RaceEditionTrend[]>;})
      .then(value=>{if(!controller.signal.aborted) setRows(value);}).catch(()=>{if(!controller.signal.aborted) setFailed(true);});
    return ()=>controller.abort();
  },[params.edition,params.distance,params.sex,retry]);
  return <SafeAreaView style={f.safe} edges={["top","bottom"]}><ScreenHeader title="Across editions" onBack={()=>router.back()} /><ScrollView contentContainerStyle={f.content}><AppText role="caption" secondary>Published records for the same event and category. Counts can reflect import coverage; courses, conditions and clock mixes may change.</AppText>{failed ? <FocusButton label="Retry history" onPress={()=>setRetry(n=>n+1)} /> : !rows ? <ActivityIndicator /> : <View style={{gap:24}}>{rows.map(row=><View key={row.edition_id} style={{gap:10}}><AppText role="heading">{row.event_name} · {row.edition_year}</AppText><AppText role="label">Median {raceClock(row.median_ms)}</AppText><AppText role="caption">{row.total.toLocaleString()} published finishes · Fastest {raceClock(row.fastest_ms)}</AppText><AppText role="caption" secondary>{row.chip_count.toLocaleString()} chip · {row.official_count.toLocaleString()} official times</AppText><FocusButton label="Explore edition" secondary onPress={()=>router.push({pathname:"/race-rankings",params:{edition:String(row.edition_id),distance:params.distance,sex:params.sex}})} /></View>)}{!rows.length && <AppText role="body">No published editions in this field.</AppText>}</View>}</ScrollView></SafeAreaView>;
}
