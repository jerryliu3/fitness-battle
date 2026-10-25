import { textStyle } from "../ui/section";
import { useEffect, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { competitionTrack, competitionTrackLabel, effortPointProgress, formatVolume, rankForElo, sportById } from "@fitness-battle/shared";
import { useCompeteStore } from "../lib/compete-store";
import { useReducedMotion } from "../ui/use-reduced-motion";
import { SHELL_COLORS as c } from "../theme";
export function EffortRail({ compact = false }: { compact?: boolean }){
  const {state,accountKey,canWrite,saveError}=useCompeteStore();
  const router=useRouter(), reduced=useReducedMotion();
  const model=state?effortPointProgress(state,state.primary,competitionTrack(state.primary)):null;
  const previous=useRef<{scope:string;score:number}|null>(null), fill=useRef(new Animated.Value(0)).current, burst=useRef(new Animated.Value(0)).current;
  const [gain,setGain]=useState(0);
  const scope=`${accountKey}:${state?.primary}:${state ? competitionTrack(state.primary) : "open"}`;
  useEffect(()=>{
    if(!model||!canWrite){previous.current=null;setGain(0);return;}
    const last=previous.current, changed=last?.scope===scope;
    previous.current={scope,score:model.score};
    const delta=changed&&!saveError?Math.max(0,model.score-last.score):0;
    setGain(delta);
    const progress=Animated.timing(fill,{toValue:model.fraction,duration:reduced||!changed?0:650,useNativeDriver:false});progress.start();
    burst.setValue(0);
    const animation=Animated.timing(burst,{toValue:1,duration:reduced?0:1300,useNativeDriver:true});
    if(delta)animation.start();
    const timer=setTimeout(()=>setGain(0),1500);
    return()=>{clearTimeout(timer);progress.stop();animation.stop();};
  },[scope,model?.score,model?.fraction,canWrite,saveError,reduced,fill,burst]);
  if(!state||!model||!canWrite)return null;
  const remaining=formatVolume(model.sport,model.sport==="strength"?0:model.remaining,model.sport==="strength"?model.remaining:0,state.units);
  return <Pressable style={[s.rail, compact && { borderWidth: 0, backgroundColor: "transparent", padding: 0, minHeight: 44, justifyContent: "center" }]} accessibilityRole="button" accessibilityLabel={`${sportById(model.sport).name} ${competitionTrackLabel(model.sport)} Effort Score ${model.score}. ${remaining} to next point. Open Progress`} onPress={()=>router.navigate("/you?view=effort")}>
    <View style={s.row}>{!compact && <Text style={s.caption}>{sportById(model.sport).name} · {rankForElo(model.score).name}</Text>}{compact ? <View style={{ flexDirection: "row", alignItems: "baseline", gap: 4, flexShrink: 1 }}><Text style={[s.score, { flexShrink: 0 }]}>{model.score.toLocaleString()}</Text><Text style={[s.caption, { flexShrink: 1 }]} numberOfLines={1}>Effort Score</Text></View> : <Text style={s.score} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>{model.score.toLocaleString()} <Text style={s.caption}>Effort Score</Text></Text>}</View>
    <View accessible accessibilityRole="progressbar" accessibilityLabel="Progress to next Effort Score point" accessibilityValue={{min:0,max:100,now:Math.round(model.fraction*100)}} style={s.track}><Animated.View style={[s.fill,{width:fill.interpolate({inputRange:[0,1],outputRange:["0%","100%"]})}]}/><Text style={s.remaining}>{model.capped?"Maximum score":`${remaining} left`}</Text></View>
    {!compact && <View style={s.row}><Text style={s.caption}>{saveError?"Changes not saved":model.earned?`${competitionTrackLabel(model.sport)} · +${model.earned} this week`:competitionTrackLabel(model.sport)}</Text></View>}
    {gain>0?<Animated.View accessibilityLiveRegion="polite" style={[s.gain,{opacity:reduced?1:burst.interpolate({inputRange:[0,.2,.8,1],outputRange:[0,1,1,0]}),transform:[{translateY:reduced?0:burst.interpolate({inputRange:[0,1],outputRange:[4,-18]})}]}]}><Text style={s.gainText}>+{gain}{reduced?"":"  ✦ ✧ ✦"}</Text></Animated.View>:null}
  </Pressable>;
}
const s=StyleSheet.create({rail:{marginHorizontal:0,marginBottom:0,padding:10,gap:5,borderWidth:1,borderColor:c.line,borderRadius:12,backgroundColor:c.card,minHeight:64},row:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",gap:8},caption:{ ...textStyle("caption"), color: c.muted },score:{ ...textStyle("label"), color: c.ink, fontVariant: ["tabular-nums"] },remaining:{position:"absolute",left:8,right:8,top:4,...textStyle("label"),color:c.ink},track:{height:24,borderRadius:8,backgroundColor:c.soft,overflow:"hidden"},fill:{height:24,borderRadius:8,backgroundColor:c.tennis},gain:{position:"absolute",right:8,top:0,backgroundColor:c.tennis,borderRadius:8,paddingHorizontal:8,paddingVertical:4},gainText:{...textStyle("label"),color:c.ink}});
