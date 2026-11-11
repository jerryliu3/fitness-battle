import {useEffect,useState} from "react";
import {ActivityIndicator,FlatList,View} from "react-native";
import {SafeAreaView} from "react-native-safe-area-context";
import {useLocalSearchParams,useRouter} from "expo-router";
import {raceClock,RACE_DISTANCES,type RaceAthleteHistory} from "@fitness-battle/shared";
import {ScreenHeader} from "../src/ui/screen-header";
import {AppText} from "../src/ui/section";
import {FocusButton,useFocusStyles} from "../src/ui/focus";
import {mobileEnv} from "../src/lib/env";
export default function AthleteHistory() {
  const {id}=useLocalSearchParams<{id:string}>(),router=useRouter(),f=useFocusStyles();
  const [data,setData]=useState<RaceAthleteHistory | null>(null),[page,setPage]=useState(1),[failed,setFailed]=useState(false),[retry,setRetry]=useState(0);
  useEffect(()=>{const controller=new AbortController();setData(null);setFailed(false);
    fetch(`${mobileEnv.apiUrl}/api/rankings/athlete/${encodeURIComponent(id)}?page=${page}`,{signal:controller.signal}).then(async r=>{if(!r.ok) throw new Error();return r.json() as Promise<RaceAthleteHistory>;}).then(value=>{if(!controller.signal.aborted) setData(value);}).catch(()=>{if(!controller.signal.aborted) setFailed(true);});
    return ()=>controller.abort();
  },[id,page,retry]);
  return <SafeAreaView style={f.safe} edges={["top","bottom"]}><ScreenHeader title="Athlete history" onBack={()=>router.back()} /><FlatList key={`${id}:${page}`} contentContainerStyle={f.content} data={data?.rows ?? []} keyExtractor={row=>String(row.id)} ListHeaderComponent={<View style={{gap:16}}>{failed ? <FocusButton label="Retry history" onPress={()=>setRetry(n=>n+1)} /> : !data ? <ActivityIndicator /> : <><AppText role="display">{data.name}</AppText><AppText role="caption" secondary>{data.total} reviewed, linked performances. History may be incomplete; bests describe these published records, separated by distance and clock.</AppText>{data.bests.map(best=><View key={`${best.distance_slug}:${best.rank_clock}`}><AppText role="label">{RACE_DISTANCES.find(d=>d.stored===best.distance_slug)?.label} · {best.rank_clock}</AppText><AppText role="heading">{raceClock(best.time_ms)}</AppText>{best.best_percentile != null && <AppText role="caption" secondary>Top {(100 - best.best_percentile).toFixed(1)}% career peak</AppText>}</View>)}</>}</View>} renderItem={({item})=><View style={{gap:8,paddingVertical:16}}><AppText role="label">{item.event_name} · {item.result_date ?? item.edition_year}</AppText><AppText role="caption">{RACE_DISTANCES.find(d=>d.stored===item.distance_slug)?.label} · {item.rank_clock} · {raceClock(item.rank_time_ms)}{item.percentile != null ? ` · Top ${(100 - item.percentile).toFixed(1)}%` : ""}</AppText><FocusButton label="View performance" secondary onPress={()=>router.push({pathname:"/race-result",params:{id:String(item.id)}})} /></View>} ListFooterComponent={data ? <View style={{gap:12}}><AppText role="caption">Page {data.page} of {Math.ceil(data.total/data.pageSize)}</AppText>{data.page>1 && <FocusButton label="Previous" secondary onPress={()=>setPage(data.page-1)} />}{data.page*data.pageSize<data.total && <FocusButton label="Next" secondary onPress={()=>setPage(data.page+1)} />}</View> : undefined} /></SafeAreaView>;
}
