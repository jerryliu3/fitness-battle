import { createThemedStyles, useThemedStyles } from "../theme";
import { textStyle } from "../ui/section";
import { useEffect, useRef, useState } from "react";
import { Animated, Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { ELO_UNRANKED, competitionTrack, competitionTrackLabel, effortPointProgress, formatEffortScore, formatVolume, rankForElo, sportById } from "@fitness-battle/shared";
import { useCompeteStore } from "../lib/compete-store";
import { useReducedMotion } from "../ui/use-reduced-motion";

export function EffortRail({ compact = false }: { compact?: boolean }){
const s=useThemedStyles(sThemes);

  const {state,accountKey,canWrite,saveError}=useCompeteStore();
  const router=useRouter(), reduced=useReducedMotion();
  const model=state?effortPointProgress(state,state.primary,competitionTrack(state.primary)):null;
  const previous=useRef<{scope:string;score:number}|null>(null), fill=useRef(new Animated.Value(0)).current, burst=useRef(new Animated.Value(0)).current;
  const [gain,setGain]=useState(0);
  const scope=`${accountKey}:${state?.primary}:${state ? competitionTrack(state.primary) : "open"}`;
  useEffect(()=>{
    if(!model){previous.current=null;setGain(0);return;}
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
  if (!state) return null;
  if (!model && compact) {
    const sport = state.primary;
    const track = competitionTrack(sport);
    const rating = state.ratings.find((r) => r.sport === sport);
    const score = rating ? (track === "verified" ? rating.verifiedElo : rating.openElo) : ELO_UNRANKED;
    const joined = Boolean(rating?.optedIn);
    return (
      <Pressable
        style={[s.rail, s.railCompact]}
        accessibilityRole="button"
        accessibilityLabel={`${sportById(sport).name} Effort Score ${score}. Open Progress`}
        onPress={() => router.navigate("/you?view=effort")}
      >
        <View style={s.row}>
          <Text style={[s.score, { flexShrink: 0 }]}>{formatEffortScore(score)}</Text>
          <Text style={[s.caption, { flexShrink: 1 }]} numberOfLines={1}>
            Effort Score
          </Text>
        </View>
        <View
          accessible
          accessibilityRole="progressbar"
          accessibilityLabel="Progress to next Effort Score point"
          accessibilityValue={{ min: 0, max: 100, now: 0 }}
          style={s.trackCompact}
        >
          <View style={[s.fill, { width: "0%" }]} />
          <Text style={s.remaining}>{joined ? "Log activity this week" : "Join a field"}</Text>
        </View>
      </Pressable>
    );
  }
  if (!model) return null;
  const remaining=formatVolume(model.sport,model.sport==="strength"?0:model.remaining,model.sport==="strength"?model.remaining:0,state.units);
  return <Pressable style={[s.rail, compact && s.railCompact]} accessibilityRole="button" accessibilityLabel={`${sportById(model.sport).name} ${competitionTrackLabel(model.sport)} Effort Score ${model.score}. ${remaining} to next point. Open Progress`} onPress={()=>router.navigate("/you?view=effort")}>
    <View style={s.row}>{!compact && <Text style={s.caption}>{sportById(model.sport).name} · {rankForElo(model.score).name}</Text>}{compact ? <View style={{ flexDirection: "row", alignItems: "baseline", gap: 4, flexShrink: 1 }}><Text style={[s.score, { flexShrink: 0 }]}>{formatEffortScore(model.score)}</Text><Text style={[s.caption, { flexShrink: 1 }]} numberOfLines={1}>Effort Score</Text></View> : <Text style={s.score} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>{formatEffortScore(model.score)} <Text style={s.caption}>Effort Score</Text></Text>}</View>
    <View accessible accessibilityRole="progressbar" accessibilityLabel="Progress to next Effort Score point" accessibilityValue={{min:0,max:100,now:Math.round(model.fraction*100)}} style={compact ? s.trackCompact : s.track}><Animated.View style={[s.fill,{width:fill.interpolate({inputRange:[0,1],outputRange:["0%","100%"]})}]}/><Text style={s.remaining}>{model.capped?"Maximum score":`${remaining} left`}</Text></View>
    {!compact && <View style={s.row}><Text style={s.caption}>{model.earned?`${competitionTrackLabel(model.sport)} · +${model.earned} this week`:competitionTrackLabel(model.sport)}</Text></View>}
    {gain>0?<Animated.View accessibilityLiveRegion="polite" style={[s.gain,{opacity:reduced?1:burst.interpolate({inputRange:[0,.2,.8,1],outputRange:[0,1,1,0]}),transform:[{translateY:reduced?0:burst.interpolate({inputRange:[0,1],outputRange:[4,-18]})}]}]}><Text style={s.gainText}>+{gain}{reduced?"":"  ✦ ✧ ✦"}</Text></Animated.View>:null}
  </Pressable>;
}
const sThemes = createThemedStyles(themeColors=>{const c=themeColors;return {rail:{marginHorizontal:0,marginBottom:0,padding:10,gap:5,borderWidth:1,borderColor:c.line,borderRadius:12,backgroundColor:c.card,minHeight:64},railCompact:{borderWidth:0,backgroundColor:"transparent",padding:0,gap:4,minHeight:0,justifyContent:"center",flex:1},row:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",gap:8},caption:{ ...textStyle("caption"), color: c.muted },score:{ ...textStyle("label"), color: c.ink, fontVariant: ["tabular-nums"] },remaining:{position:"absolute",left:8,right:8,top:4,...textStyle("caption"),color:c.ink},track:{height:24,borderRadius:8,backgroundColor:c.soft,overflow:"hidden"},trackCompact:{height:20,borderRadius:8,backgroundColor:c.soft,overflow:"hidden",width:"100%"},fill:{height:"100%",borderRadius:8,backgroundColor:c.tennis},gain:{position:"absolute",right:8,top:0,backgroundColor:c.tennis,borderRadius:8,paddingHorizontal:8,paddingVertical:4},gainText:{...textStyle("label"),color:c.ink}};});
