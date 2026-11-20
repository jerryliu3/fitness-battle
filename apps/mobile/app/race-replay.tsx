import {useEffect,useMemo,useRef,useState} from "react";
import {ActivityIndicator,Linking,Pressable,ScrollView,StyleSheet,View} from "react-native";
import {useSafeAreaInsets} from "react-native-safe-area-context";
import {useLocalSearchParams,useRouter} from "expo-router";
import {RACE_CATEGORIES,RACE_DISTANCES,compileReplayRunner,loadReplayField,raceClock,raceSourceUrl,replayFeatures,replayFrameInterval,replayTelemetry,replayTimeline,validateReplayCourse,type ReplayData,type ReplayPage} from "@fitness-battle/shared";
import {mobileEnv} from "../src/lib/env";
import {GlassDismissButton} from "../src/ui/screen-header";
import {AppIcon} from "../src/ui/app-icon";
import {FieldFollowChip} from "../src/ui/field-follow-chip";
import {FieldOverlayView} from "../src/ui/field-overlay-motion";
import {AppText} from "../src/ui/section";
import {FocusButton,FocusSheet,useFocusStyles} from "../src/ui/focus";
import {ReplayMap} from "../src/ui/race-replay-map";
import {useThemeColors} from "../src/theme";
import {useSceneActive} from "../src/ui/use-scene-active";
import {useReducedMotion} from "../src/ui/use-reduced-motion";
import {SearchField} from "../src/ui/search-field";
import {useRaceFavorites} from "../src/lib/race-favorites";
export default function RaceReplay() {
  const params=useLocalSearchParams<{edition:string;distance:string;sex:string;clock:string;ids?:string}>(),router=useRouter(),f=useFocusStyles();
  const insets=useSafeAreaInsets();
  const colors=useThemeColors(),saved=useRaceFavorites(),active=useSceneActive(),reduced=useReducedMotion();
  const [ids,setIds]=useState<string|null>(params.ids ?? ""),[attempt,setAttempt]=useState(0),[data,setData]=useState<ReplayData|null>(null),[error,setError]=useState("");
  const [busy,setBusy]=useState(false),[progress,setProgress]=useState(0),[time,setTime]=useState(0),[playing,setPlaying]=useState(false),[wall,setWall]=useState(false),[speed,setSpeed]=useState(64);
  const abort=useRef<AbortController|null>(null),[seekWidth,setSeekWidth]=useState(1),[focused,setFocused]=useState<number|null>(null);
  const [profileId,setProfileId]=useState<number|null>(null),[tilted,setTilted]=useState(false);
  const [following,setFollowing]=useState(false),[dockHeight,setDockHeight]=useState(144);
  const [picker,setPicker]=useState(false),[search,setSearch]=useState("");
  const trackSaved=useRef(false);
  const [tracked,setTracked]=useState(()=>(params.ids ?? "").split(",").filter(Boolean).map(Number).slice(0,4));
  const distance=RACE_DISTANCES.find(d=>d.slug===params.distance)?.stored ?? "";
  const [category,setCategory]=useState(params.sex ?? "all"),[clock,setClock]=useState(params.clock ?? "chip");
  const scopeKey=new URLSearchParams({edition:params.edition,distance:params.distance,sex:category,clock}).toString();
  useEffect(()=>{setData(null);setTime(0);setWall(false);setFocused(null);setFollowing(false);setProfileId(null);},[scopeKey]);
  useEffect(()=>{const controller=new AbortController();abort.current=controller;setBusy(true);setError("");setProgress(0);setPlaying(false);
    void loadReplayField(async after=>{const query=new URLSearchParams(scopeKey);query.set("after",String(after));if(ids) query.set("ids",ids);
      const response=await fetch(`${mobileEnv.apiUrl}/api/rankings/replay?${query}`,{signal:controller.signal});if(!response.ok) throw new Error(response.status===404 ? "Reviewed course and timing profiles are not available for this field." : "Replay could not load.");const page=await response.json() as ReplayPage;
      return ids==="" ? {...page,next:null} : page;
    },()=>controller.signal.aborted,setProgress).then(value=>{if(!controller.signal.aborted){if(!validateReplayCourse(value.course,distance)) throw new Error("Course alignment needs review.");setData(previous=>previous?.version===value.version ? {...value,course:previous.course} : value);
      const available=new Set(value.runners.map(runner=>runner.id));
      if(trackSaved.current) {
        trackSaved.current=false;
        setTracked((ids ?? "").split(",").map(Number).filter(id=>available.has(id)).slice(0,4));
      } else {
        setTracked(current=>current.filter(id=>available.has(id)));
      }}}).catch(e=>{if(!controller.signal.aborted) setError(e instanceof Error ? e.message : "Replay unavailable.");}).finally(()=>{if(!controller.signal.aborted) setBusy(false);});
    return ()=>controller.abort();
  },[scopeKey,ids,attempt,distance]);
  const runners=useMemo(()=>data?.runners.flatMap(r=>{const compiled=compileReplayRunner(r,distance);return compiled ? [compiled] : [];}) ?? [],[data,distance]);
  const timeline=useMemo(()=>replayTimeline(runners,wall),[runners,wall]);
  const features=useMemo(()=>data ? replayFeatures(data.course,runners,time,timeline.origin) : {type:"FeatureCollection" as const,features:[]},[data,runners,time,timeline.origin]);
  useEffect(()=>{if(!active || reduced) setPlaying(false);},[active,reduced]);
  useEffect(()=>{
    if(!playing || !active || reduced) return;
    let previous=performance.now(),lastPaint=previous,elapsed=0,frame=0;
    const interval=replayFrameInterval(runners.length);
    function advance(now:number) {
      elapsed+=Math.max(0,Math.min(now-previous,250))*speed;
      previous=now;
      if(now-lastPaint>=interval) {
        const delta=elapsed;
        setTime(value=>Math.min(timeline.duration,value+delta));
        elapsed=0;lastPaint=now;
      }
      frame=requestAnimationFrame(advance);
    }
    frame=requestAnimationFrame(advance);
    return ()=>cancelAnimationFrame(frame);
  },[playing,active,reduced,speed,timeline.duration,runners.length]);
  useEffect(()=>{
    if(time>=timeline.duration) setPlaying(false);
    if(data && time>timeline.duration) setTime(timeline.duration);
  },[data,time,timeline.duration]);
  const seek=(next:number)=>{setPlaying(false);setTime(Math.max(0,Math.min(timeline.duration,next)));};
  const source=data ? raceSourceUrl(data.course.sourceUrl) : null;
  const trackedRunners=useMemo(()=>tracked.flatMap(id=>runners.find(r=>r.id===id) ?? []),[runners,tracked]);
  const roster=useMemo(()=>runners.filter(r=>r.name.toLowerCase().includes(search.trim().toLowerCase())).slice(0,100),[runners,search]);
  const palette=[colors.tennis,"#4ed1fc","#fc8d66","#dba9ff"];
  const cameraRunner=runners.find(runner=>runner.id===focused) ?? trackedRunners[0] ?? runners[0];
  function deselectRunner(id:number) {
    setTracked(current=>current.filter(value=>value!==id));
    if(focused===id) setFocused(null);
    if(profileId===id) setProfileId(null);
    if(cameraRunner?.id===id) setFollowing(false);
  }
  const profileRunner=runners.find(runner=>runner.id===profileId);
  const profileMetrics=profileRunner ? replayTelemetry(profileRunner,time,timeline.origin) : null;
  const glass={backgroundColor:`${colors.card}df`,borderColor:colors.line,borderWidth:1};
  const profile = profileRunner && <View style={{...glass,minWidth:154,borderRadius:14,paddingLeft:12,paddingRight:4,paddingBottom:9}}>
      <View style={{flexDirection:"row",alignItems:"center",gap:6}}>
        <AppText role="label" style={{flexShrink:1}}>{profileRunner.name}</AppText>
        <Pressable accessibilityRole="button" accessibilityLabel={`Deselect ${profileRunner.name}`} onPress={()=>deselectRunner(profileRunner.id)}
          style={{width:44,height:44,alignItems:"center",justifyContent:"center"}}><AppText role="label">×</AppText></Pressable>
      </View>
      <AppText role="caption" secondary>{profileMetrics ? `${raceClock(profileMetrics.elapsedMs)} elapsed · ${(profileMetrics.distanceM/1000).toFixed(2)} km` : "Position unavailable"}</AppText>
    </View>;
  return <View style={{flex:1,backgroundColor:colors.paper}}>
    <View style={StyleSheet.absoluteFill}>

      {data ? <ReplayMap course={data.course} features={features} tracked={tracked} focused={focused} profileId={profileId} profile={profile} followId={following ? cameraRunner?.id ?? null : null} tilted={tilted} overlayTop={insets.top+56} overlayBottom={dockHeight+insets.bottom+16} onSelect={id=>{setFocused(id);setProfileId(id);}} onError={()=>setPlaying(false)} /> :
        <View style={{flex:1,justifyContent:"center",padding:20,gap:12}}>
          {busy ? <><ActivityIndicator /><AppText role="caption">Loading {progress.toLocaleString()} timing profiles…</AppText><FocusButton label="Cancel loading" secondary onPress={()=>{abort.current?.abort();setBusy(false);setError("Replay loading cancelled.");}} /></> :
            <><AppText role="body">{error || "Course unavailable"}</AppText><FocusButton label="Retry replay" onPress={()=>setAttempt(n=>n+1)} /></>}
        </View>}
    </View>
    <FieldOverlayView hidden={false} pointerEvents="box-none" style={{position:"absolute",left:14,right:14,top:insets.top+6,flexDirection:"row",alignItems:"center",gap:8}}>
      <GlassDismissButton label="Close race replay" onPress={()=>router.canGoBack() ? router.back() : router.replace("/race-coverage")} />
      <View pointerEvents="none" style={{...glass,borderRadius:22,paddingHorizontal:13,paddingVertical:8}}>
        <AppText role="label" accessibilityRole="header">Race replay</AppText>
      </View>

    </FieldOverlayView>
    <View pointerEvents="box-none" style={{position:"absolute",right:14,top:insets.top+86,gap:8,alignItems:"center"}}>
      {cameraRunner && <FieldFollowChip following={following} athleteName={cameraRunner.name} onPress={()=>setFollowing(value=>!value)} />}
      <Pressable accessibilityRole="button" accessibilityLabel="3D map" accessibilityState={{selected:tilted}} disabled={!data}
        onPress={()=>setTilted(value=>!value)} style={{...glass,width:44,height:44,borderRadius:22,alignItems:"center",justifyContent:"center",backgroundColor:tilted ? colors.tennis : glass.backgroundColor}}>
        <AppText role="label" style={tilted ? {color:colors.textOnAction} : undefined}>3D</AppText>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Replay runners" onPress={()=>{setPlaying(false);setPicker(true);}}
        style={{...glass,width:44,height:44,borderRadius:22,alignItems:"center",justifyContent:"center"}}>
        <AppIcon name="crew" size={21} />
      </Pressable>
    </View>
    <FieldOverlayView hidden={false} pointerEvents="box-none" onLayout={event=>setDockHeight(event.nativeEvent.layout.height)}
      style={{position:"absolute",left:12,right:12,bottom:insets.bottom+8,gap:6}}>
    {data && busy && <AppText role="caption" secondary>Loading {progress.toLocaleString()} timing profiles…</AppText>}
    {data && error && <AppText role="caption" secondary>{error}</AppText>}
    {trackedRunners.length>0 && <View style={{flexShrink:0}}>
      <ScrollView horizontal accessibilityLabel="Tracked runner metrics" contentContainerStyle={{paddingHorizontal:1,gap:8,paddingVertical:2}}>
        {trackedRunners.map(r=>{
          const metrics=replayTelemetry(r,time,timeline.origin);
          return <View key={r.id}
            style={{padding:10,width:214,borderWidth:1,borderColor:focused===r.id ? colors.ink : colors.line,borderRadius:14,backgroundColor:glass.backgroundColor}}>
            <View style={{flexDirection:"row",alignItems:"center"}}>
            <Pressable onPress={()=>setFocused(r.id)} accessibilityRole="button" accessibilityState={{selected:focused===r.id}} style={{flex:1,flexDirection:"row",gap:7,alignItems:"center"}}>
              <View style={{width:9,height:9,borderRadius:5,backgroundColor:palette[tracked.indexOf(r.id)]}} />
              <AppText role="label" numberOfLines={1} style={{flex:1}}>{r.name}</AppText>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel={`Deselect ${r.name}`} hitSlop={8} onPress={()=>deselectRunner(r.id)} style={{width:28,height:28,alignItems:"center",justifyContent:"center"}}><AppText role="label">×</AppText></Pressable>
            </View>
            <AppText role="caption" secondary style={{marginTop:4}}>
              {metrics ? `${raceClock(metrics.elapsedMs)} · ${(metrics.distanceM/1000).toFixed(2)} km` : "Position unavailable"}
              {metrics?.currentPaceMsPerKm!=null ? ` · Pace ${raceClock(metrics.currentPaceMsPerKm)}/km` : ""}
            </AppText>
          </View>;
        })}
      </ScrollView>
    </View>}
    <View style={{...glass,borderRadius:20,paddingHorizontal:12,paddingTop:6,gap:2}}>
      <View style={{flexDirection:"row",alignItems:"center",justifyContent:"space-between",gap:8}}>
        <FocusButton label={playing ? "Pause" : "Play"} disabled={reduced || !runners.length} onPress={()=>{if(time>=timeline.duration) setTime(0);setPlaying(v=>!v);}} />
        <AppText role="heading">{timeline.origin!==null ? new Date(timeline.origin+time).toLocaleTimeString() : raceClock(time)}</AppText>
        <View style={{width:44}} />
      </View>
      <View accessible accessibilityRole="adjustable" accessibilityLabel="Replay time" accessibilityValue={{min:0,max:Math.ceil(timeline.duration/1000),now:Math.floor(time/1000)}} accessibilityActions={[{name:"increment"},{name:"decrement"}]} onAccessibilityAction={e=>seek(time+(e.nativeEvent.actionName==="increment" ? 60000 : -60000))} onLayout={e=>setSeekWidth(Math.max(1,e.nativeEvent.layout.width))} onStartShouldSetResponder={()=>!!runners.length} onResponderGrant={e=>seek(e.nativeEvent.locationX/seekWidth*timeline.duration)} onResponderMove={e=>seek(e.nativeEvent.locationX/seekWidth*timeline.duration)} style={{height:44,justifyContent:"center"}}><View pointerEvents="none" style={{height:6,backgroundColor:colors.line,borderRadius:3}}><View style={{height:6,width:`${timeline.duration ? time/timeline.duration*100 : 0}%`,backgroundColor:colors.tennis,borderRadius:3}} /></View></View>
      {reduced && <AppText role="caption" secondary>Use the timeline to inspect positions with Reduced Motion on.</AppText>}
    </View>
    </FieldOverlayView>
    <FocusSheet open={picker} onClose={()=>setPicker(false)} title="Replay runners">
      <View style={{gap:12}}>
        <View style={f.chipRow}>{[{value:"all",label:"All categories"},...RACE_CATEGORIES].map(c=><Pressable key={c.value} accessibilityRole="button" accessibilityState={{selected:category===c.value}} onPress={()=>{setCategory(c.value);trackSaved.current=false;setIds("");setTracked([]);}} style={[f.chip,category===c.value && f.chipActive]}><AppText role="label">{c.label}</AppText></Pressable>)}</View>
        <View style={f.chipRow}>{[{value:"chip",label:"Chip timing"},{value:"gun",label:"Official timing"}].map(c=><Pressable key={c.value} accessibilityRole="button" accessibilityState={{selected:clock===c.value}} onPress={()=>{setClock(c.value);trackSaved.current=false;setIds("");setTracked([]);}} style={[f.chip,clock===c.value && f.chipActive]}><AppText role="label">{c.label}</AppText></Pressable>)}</View>
        <AppText role="label">Playback speed</AppText>
        <View style={f.chipRow}>{[1,4,16,32,64,128,256].map(value=><Pressable key={value} accessibilityRole="button" accessibilityState={{selected:speed===value}} onPress={()=>setSpeed(value)} style={[f.chip,speed===value && f.chipActive]}><AppText role="label">{value}×</AppText></Pressable>)}</View>
        {timeline.wallAvailable && <FocusButton label={wall ? "Use chip elapsed time" : "Use race-day time"} secondary onPress={()=>{setWall(v=>!v);setTime(0);setPlaying(false);}} />}
        {(!data || data.runners.length<data.totalAvailable) && <FocusButton label="Load timed field" secondary disabled={busy} onPress={()=>{trackSaved.current=false;setIds(null);}} />}
        {!!saved.ids.length && <FocusButton label="Load saved in this race" secondary disabled={busy || !saved.ready} onPress={()=>{const selection=saved.ids.join(",");
          if(ids===selection && data) {
            const available=new Set(data.runners.map(runner=>runner.id));
            setTracked(saved.ids.filter(id=>available.has(id)).slice(0,4));
          } else {
            trackSaved.current=true;
            setIds(selection);
          }}} />}
        <SearchField accessibilityLabel="Find a loaded runner" placeholder="Search by name" value={search} onChangeText={setSearch} />
        <AppText role="caption" secondary>Track up to four runners. {runners.length.toLocaleString()} loaded{data ? ` of ${data.totalAvailable.toLocaleString()}` : ""}.</AppText>
        <FocusButton label="Back to replay" onPress={()=>setPicker(false)} />
        {roster.map(r=><Pressable key={r.id} accessibilityRole="checkbox" accessibilityState={{checked:tracked.includes(r.id),disabled:!tracked.includes(r.id) && tracked.length>=4}}
          disabled={!tracked.includes(r.id) && tracked.length>=4}
          onPress={()=>{setTracked(current=>current.includes(r.id) ? current.filter(id=>id!==r.id) : [...current,r.id]);setFocused(r.id);}}
          style={{paddingVertical:10,flexDirection:"row",justifyContent:"space-between",gap:8,borderBottomWidth:1,borderColor:colors.line}}>
          <AppText role="label" style={{flex:1}}>{tracked.includes(r.id) ? "✓ " : ""}{r.name}</AppText><AppText role="caption">{raceClock(r.splits.finishMs)}</AppText>
        </Pressable>)}
        <AppText role="caption" secondary>Positions and pace are estimated between timing checkpoints.</AppText>
        {source && <FocusButton label="Course source" secondary onPress={()=>{void Linking.openURL(source);}} />}
      </View>
    </FocusSheet>
  </View>;
}
