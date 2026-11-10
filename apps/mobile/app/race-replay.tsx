import {useEffect,useMemo,useRef,useState} from "react";
import {ActivityIndicator,Linking,Pressable,ScrollView,View} from "react-native";
import {SafeAreaView} from "react-native-safe-area-context";
import {useLocalSearchParams,useRouter} from "expo-router";
import {RACE_CATEGORIES,RACE_DISTANCES,compileReplayRunner,loadReplayField,raceClock,raceSourceUrl,replayFeatures,replayTimeline,validateReplayCourse,type ReplayData,type ReplayPage} from "@fitness-battle/shared";
import {mobileEnv} from "../src/lib/env";
import {ScreenHeader} from "../src/ui/screen-header";
import {AppText} from "../src/ui/section";
import {FocusButton,useFocusStyles} from "../src/ui/focus";
import {ReplayMap} from "../src/ui/race-replay-map";
import {useThemeColors} from "../src/theme";
import {useSceneActive} from "../src/ui/use-scene-active";
import {useReducedMotion} from "../src/ui/use-reduced-motion";
import {useRaceFavorites} from "../src/lib/race-favorites";
export default function RaceReplay() {
  const params=useLocalSearchParams<{edition:string;distance:string;sex:string;clock:string;ids?:string}>(),router=useRouter(),f=useFocusStyles();
  const colors=useThemeColors(),saved=useRaceFavorites(),active=useSceneActive(),reduced=useReducedMotion();
  const [ids,setIds]=useState<string|null>(params.ids ?? ""),[attempt,setAttempt]=useState(0),[data,setData]=useState<ReplayData|null>(null),[error,setError]=useState("");
  const [busy,setBusy]=useState(false),[progress,setProgress]=useState(0),[time,setTime]=useState(0),[playing,setPlaying]=useState(false),[wall,setWall]=useState(false),[speed,setSpeed]=useState(128);
  const abort=useRef<AbortController|null>(null),[seekWidth,setSeekWidth]=useState(1),[focused,setFocused]=useState<number|null>(null);
  const distance=RACE_DISTANCES.find(d=>d.slug===params.distance)?.stored ?? "";
  const [category,setCategory]=useState(params.sex ?? "all"),[clock,setClock]=useState(params.clock ?? "chip");
  const scopeKey=new URLSearchParams({edition:params.edition,distance:params.distance,sex:category,clock}).toString();
  useEffect(()=>{const controller=new AbortController();abort.current=controller;setData(null);setBusy(true);setError("");setProgress(0);setTime(0);setPlaying(false);setWall(false);
    void loadReplayField(async after=>{const query=new URLSearchParams(scopeKey);query.set("after",String(after));if(ids!==null) query.set("ids",ids);
      const response=await fetch(`${mobileEnv.apiUrl}/api/rankings/replay?${query}`,{signal:controller.signal});if(!response.ok) throw new Error(response.status===404 ? "Reviewed course and timing profiles are not available for this field." : "Replay could not load.");return response.json() as Promise<ReplayPage>;
    },()=>controller.signal.aborted,setProgress).then(value=>{if(!controller.signal.aborted){if(!validateReplayCourse(value.course,distance)) throw new Error("Course alignment needs review.");setData(value);}}).catch(e=>{if(!controller.signal.aborted) setError(e instanceof Error ? e.message : "Replay unavailable.");}).finally(()=>{if(!controller.signal.aborted) setBusy(false);});
    return ()=>controller.abort();
  },[scopeKey,ids,attempt,distance]);
  const runners=useMemo(()=>data?.runners.flatMap(r=>{const compiled=compileReplayRunner(r,distance);return compiled ? [compiled] : [];}) ?? [],[data,distance]);
  const timeline=useMemo(()=>replayTimeline(runners,wall),[runners,wall]);
  const features=useMemo(()=>data ? replayFeatures(data.course,runners,time,timeline.origin) : {type:"FeatureCollection" as const,features:[]},[data,runners,time,timeline.origin]);
  useEffect(()=>{if(!active || reduced) setPlaying(false);},[active,reduced]);
  useEffect(()=>{if(!playing || !active || reduced) return;let previous=Date.now();const timer=setInterval(()=>{const now=Date.now(),delta=Math.max(0,Math.min(now-previous,1000))*speed;previous=now;setTime(value=>Math.min(timeline.duration,value+delta));},runners.length>1000 ? 500 : 200);return ()=>clearInterval(timer);},[playing,active,reduced,speed,timeline.duration,runners.length]);
  useEffect(()=>{if(time>=timeline.duration) setPlaying(false);},[time,timeline.duration]);
  const seek=(next:number)=>{setPlaying(false);setTime(Math.max(0,Math.min(timeline.duration,next)));};
  const focusedRunner=useMemo(()=>runners.find(r=>r.id===focused),[runners,focused]);
  const source=data ? raceSourceUrl(data.course.sourceUrl) : null;
  return <SafeAreaView style={f.safe} edges={["top","bottom"]}><ScreenHeader title="Race replay" onBack={()=>router.back()} /><ScrollView contentContainerStyle={f.content} onScrollBeginDrag={()=>setPlaying(false)}>
    <AppText role="caption" secondary>Estimated positions between recorded checkpoints, along a reviewed edition course. These are not runner GPS tracks or exact overtakes. Missing timing intervals are hidden.</AppText>
    <AppText role="caption" secondary>Only saved results from this edition, category and clock can appear.</AppText>
    <View style={f.chipRow}>{[{value:"all",label:"All categories"},...RACE_CATEGORIES].map(c=><Pressable key={c.value} accessibilityRole="button" accessibilityState={{selected:category===c.value}} onPress={()=>setCategory(c.value)} style={[f.chip,category===c.value && f.chipActive]}><AppText role="label">{c.label}</AppText></Pressable>)}</View>
    <View style={f.chipRow}>{[{value:"chip",label:"Chip timing"},{value:"gun",label:"Official timing"}].map(c=><Pressable key={c.value} accessibilityRole="button" accessibilityState={{selected:clock===c.value}} onPress={()=>setClock(c.value)} style={[f.chip,clock===c.value && f.chipActive]}><AppText role="label">{c.label}</AppText></Pressable>)}</View>
    <FocusButton label="Load entire timing field" secondary disabled={busy} onPress={()=>setIds(null)} />
    <FocusButton label="Follow saved runners" secondary disabled={busy || !saved.ready || !saved.ids.length} onPress={()=>setIds(saved.ids.join(","))} />
    {!!params.ids && <FocusButton label="Selected runners" secondary disabled={busy} onPress={()=>setIds(params.ids ?? "")} />}
    {busy && <><ActivityIndicator /><AppText role="caption">Loading {progress.toLocaleString()} timing profiles…</AppText><FocusButton label="Cancel loading" secondary onPress={()=>{abort.current?.abort();setBusy(false);setError("Replay loading cancelled.");}} /></>}
    {!!error && <><AppText role="body">{error}</AppText><FocusButton label="Retry replay" onPress={()=>setAttempt(n=>n+1)} /></>}
    {data && <View style={{gap:16}}><AppText role="caption" secondary>{runners.length.toLocaleString()} loaded profiles · {data.totalAvailable.toLocaleString()} available in this category and clock. {features.features.length.toLocaleString()} positions available at this time. {data.runners.length-runners.length>0 ? `${data.runners.length-runners.length} profiles need reconciliation.` : ""}</AppText>
      <ReplayMap course={data.course} features={features} focused={focused} onSelect={setFocused} onError={()=>setPlaying(false)} />
      <AppText role="heading">{timeline.origin!==null ? new Date(timeline.origin+time).toLocaleString() : raceClock(time)}</AppText>
      <FocusButton label={playing ? "Pause" : "Play"} disabled={reduced || !runners.length} onPress={()=>{if(time>=timeline.duration) setTime(0);setPlaying(v=>!v);}} />
      <Pressable accessibilityRole="adjustable" accessibilityLabel="Replay time" accessibilityValue={{min:0,max:Math.ceil(timeline.duration/1000),now:Math.floor(time/1000)}} accessibilityActions={[{name:"increment"},{name:"decrement"}]} onAccessibilityAction={e=>seek(time+(e.nativeEvent.actionName==="increment" ? 60000 : -60000))} onLayout={e=>setSeekWidth(Math.max(1,e.nativeEvent.layout.width))} onPress={e=>seek(e.nativeEvent.locationX/seekWidth*timeline.duration)} style={{height:44,justifyContent:"center"}}><View pointerEvents="none" style={{height:6,backgroundColor:colors.line,borderRadius:3}}><View style={{height:6,width:`${timeline.duration ? time/timeline.duration*100 : 0}%`,backgroundColor:colors.tennis,borderRadius:3}} /></View></Pressable>
      <View style={f.chipRow}>{[16,64,128,512].map(value=><Pressable key={value} accessibilityRole="button" accessibilityState={{selected:speed===value}} onPress={()=>setSpeed(value)} style={[f.chip,speed===value && f.chipActive]}><AppText role="label">{value}×</AppText></Pressable>)}</View>
      <FocusButton label={wall ? "Use elapsed comparison" : "Use race-day time"} secondary disabled={!timeline.wallAvailable} onPress={()=>{setWall(v=>!v);setTime(0);setPlaying(false);}} />
      <AppText role="caption" secondary>{wall ? "Race-day time" : `${clock==="gun" ? "Official" : "Chip"} elapsed comparison`}. {!timeline.wallAvailable ? "Race-day time needs an actual start timestamp for every loaded runner." : ""} {reduced ? "Reduced Motion is on. Use the timeline to inspect positions." : ""}</AppText>
      {focusedRunner && <AppText role="label">{focusedRunner.name}</AppText>}{runners.length<=100 && <View style={f.chipRow}>{runners.map(r=><Pressable key={r.id} accessibilityRole="button" accessibilityState={{selected:focused===r.id}} onPress={()=>setFocused(r.id)} style={[f.chip,focused===r.id && f.chipActive]}><AppText role="label">{r.name}</AppText></Pressable>)}</View>}
      <AppText role="caption" secondary>{data.course.attribution}</AppText>{source && <FocusButton label="Course source" secondary onPress={()=>{void Linking.openURL(source);}} />}
    </View>}
  </ScrollView></SafeAreaView>;
}
