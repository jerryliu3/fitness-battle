import {useEffect,useState} from "react";
import {ActivityIndicator,Linking,ScrollView,View} from "react-native";
import {SafeAreaView} from "react-native-safe-area-context";
import {useRouter} from "expo-router";
import {RACE_DISTANCES,raceEventGroups,type RaceCoverage} from "@fitness-battle/shared";
import {ScreenHeader} from "../src/ui/screen-header";
import {AppText} from "../src/ui/section";
import {FocusButton,useFocusStyles} from "../src/ui/focus";
import {RaceCategoryFilter} from "../src/ui/race-category-filter";
import {mobileEnv} from "../src/lib/env";
export default function Coverage() {
 const f=useFocusStyles(),router=useRouter();
 const [rows,setRows]=useState<RaceCoverage[]|null>(null),[sex,setSex]=useState("all"),[failed,setFailed]=useState(false),[retry,setRetry]=useState(0);
 useEffect(()=>{const controller=new AbortController();setRows(null);setFailed(false);
  fetch(`${mobileEnv.apiUrl}/api/rankings/coverage`,{signal:controller.signal}).then(async r=>{if(!r.ok) throw new Error();return r.json() as Promise<RaceCoverage[]>;}).then(value=>{if(!controller.signal.aborted) setRows(value);}).catch(()=>{if(!controller.signal.aborted) setFailed(true);});return ()=>controller.abort();
 },[retry]);
 const groups=raceEventGroups(rows ?? [],sex);
 return <SafeAreaView style={f.safe} edges={["top","bottom"]}><ScreenHeader title="Events & coverage" onBack={()=>router.back()} /><ScrollView contentContainerStyle={f.content}><AppText role="caption" secondary>Each race appears once per distance. Category filters apply to recorded results; coverage reviews remain category-specific.</AppText><RaceCategoryFilter value={sex} onChange={setSex} />{failed ? <FocusButton label="Retry coverage" onPress={()=>setRetry(n=>n+1)} /> : !rows ? <ActivityIndicator /> : <View style={{gap:24}}>{groups.map(row=><View key={`${row.edition_id}:${row.distance_slug}`} style={{gap:10}}><AppText role="heading">{row.event_name}</AppText><AppText role="caption">{RACE_DISTANCES.find(d=>d.stored===row.distance_slug)?.label} · {row.edition_year}</AppText><AppText role="label">{row.published_count.toLocaleString()} published results</AppText><AppText role="caption" secondary>{row.reviewedCount} of {row.categoryCount} included categories reviewed</AppText><FocusButton label="Explore results" secondary onPress={()=>router.push({pathname:"/race-rankings",params:{edition:String(row.edition_id),distance:RACE_DISTANCES.find(d=>d.stored===row.distance_slug)?.slug ?? "marathon",sex}})} />{row.evidenceUrls.map((url,i)=><FocusButton key={url} label={`Review source${row.evidenceUrls.length>1 ? ` ${i+1}` : ""}`} secondary onPress={()=>{void Linking.openURL(url);}} />)}</View>)}{!groups.length && <AppText role="body">No published results in this category.</AppText>}</View>}</ScrollView></SafeAreaView>;
}
