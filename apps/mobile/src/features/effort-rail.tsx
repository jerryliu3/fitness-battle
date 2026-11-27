import { MedalGoldFill } from "../ui/medal-gold-fill";
import { AnchoredMenu, useAnchoredMenu } from "../ui/anchored-menu";
import { activeMultiplier, endOfZonedDay } from "@fitness-battle/shared";
import { createThemedStyles, useThemedStyles } from "../theme";
import { textStyle } from "../ui/section";
import { useEffect, useRef, useState } from "react";
import { Animated, Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import {
  ELO_CAP,
  ELO_UNRANKED,
  competeNow,
  competitionTrack,
  competitionTrackLabel,
  effortPointProgress,
  formatEffortScore,
  formatVolume,
  periodEffort,
  rankForElo,
  sportById,
  weeklyPeriodBounds,
} from "@fitness-battle/shared";
import { mobileEnv } from "../lib/env";
import { useCompeteStore } from "../lib/compete-store";
import { useReducedMotion } from "../ui/use-reduced-motion";

export function EffortRail({ compact = false }: { compact?: boolean }){
const s=useThemedStyles(sThemes);

  const {state,accountKey,canWrite,saveError}=useCompeteStore();
  const router=useRouter(), reduced=useReducedMotion();
  const boostMenu = useAnchoredMenu({ minWidth: 104, estimatedHeight: 40, placement: "below" });
    const [,refreshClock]=useState(0);
  useEffect(()=>{
    let timer:ReturnType<typeof setTimeout>;
    const schedule=()=>{timer=setTimeout(()=>{refreshClock(value=>value+1);schedule();},Math.max(1,endOfZonedDay(new Date()).getTime()-Date.now()));};
    schedule();return()=>clearTimeout(timer);
  },[]);
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
  if (!model) return null;
  const now = new Date();
  const boost = activeMultiplier(state.effortAccounts?.[state.primary]?.starter ??
    (mobileEnv.previewEffortBoost ? {
      multiplier: 3,
      startsAt: new Date(now.getTime() - 5 * 86400000).toISOString(),
      boostEndsAt: new Date(now.getTime() + 25 * 86400000).toISOString(),
    } : undefined), now);
  const boostDays = boost ? Math.max(1, Math.ceil((boost.endsAt.getTime() - now.getTime()) / 86_400_000)) : 0;
  const remaining=model.live ? `${model.remaining} points` : formatVolume(model.sport,model.sport==="strength"?0:model.remaining,model.sport==="strength"?model.remaining:0,state.units);
  const openProgress = () => router.navigate("/you?view=effort");
  const progressLabel = `${sportById(model.sport).name} ${competitionTrackLabel(model.sport)} Effort Score ${model.score}. ${remaining} to next point. Open Progress`;
  const trackEl = (
    <View accessible accessibilityRole="progressbar" accessibilityLabel="Progress to next rank" accessibilityValue={{min:0,max:100,now:Math.round(model.fraction*100)}} style={compact ? s.trackCompact : s.track}>
      <Animated.View style={[s.fill,{width:fill.interpolate({inputRange:[0,1],outputRange:["0%","100%"]})}]}><MedalGoldFill radius={8} /></Animated.View>
    </View>
  );
  const gainEl = gain>0?<Animated.View accessibilityLiveRegion="polite" style={[s.gain,{opacity:reduced?1:burst.interpolate({inputRange:[0,.2,.8,1],outputRange:[0,1,1,0]}),transform:[{translateY:reduced?0:burst.interpolate({inputRange:[0,1],outputRange:[4,-18]})}]}]}><MedalGoldFill radius={8} /><Text style={s.gainText}>+{gain}{reduced?"":"  ✦ ✧ ✦"}</Text></Animated.View>:null;

  if (compact) {
    return (
      <View style={[s.rail, s.railCompact]}>
        <View style={s.row}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={progressLabel}
            onPress={openProgress}
            style={({ pressed }) => [s.compactScoreTap, pressed && { opacity: 0.78 }]}
          >
            <Text style={[s.score, { flexShrink: 0 }]}>{formatEffortScore(model.score)}</Text>
            <Text style={[s.caption, { flexShrink: 1 }]} numberOfLines={1}>Effort Score</Text>
          </Pressable>
        </View>
        <View style={s.row}>
          <Pressable style={s.compactTrackTap} accessibilityRole="button" accessibilityLabel={progressLabel} onPress={openProgress}>
            {trackEl}
          </Pressable>
          {boost && (
            <View ref={boostMenu.anchorRef} collapsable={false} style={{ flexShrink: 0 }}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${boost.label} Effort Boost`}
                accessibilityState={{ expanded: boostMenu.open }}
                hitSlop={6}
                onPress={boostMenu.toggle}
                style={({ pressed }) => [s.multiplierBtn, pressed && { opacity: 0.78 }]}
              >
                <Text style={s.multiplier} numberOfLines={1}>{boost.label.replace("×", "x")} boost</Text>
              </Pressable>
            </View>
          )}
        </View>
        {gainEl}
        {boost && (
          <AnchoredMenu
            open={boostMenu.open}
            onClose={boostMenu.close}
            menuLayout={boostMenu.menuLayout}
            dimBackdrop={false}
            accessibilityLabel="Close Effort Boost details"
            style={s.boostPopup}
          >
            <Text style={s.boostPopupBody}>{boostDays} {boostDays === 1 ? "day" : "days"} left</Text>
          </AnchoredMenu>
        )}
      </View>
    );
  }

  return <Pressable style={s.rail} accessibilityRole="button" accessibilityLabel={progressLabel} onPress={openProgress}>
    <View style={s.row}><Text style={s.caption}>{sportById(model.sport).name} · {model.officialRank ?? rankForElo(model.score).name}</Text><Text style={s.score} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>{formatEffortScore(model.score)} <Text style={s.caption}>Effort Score</Text></Text></View>
    {trackEl}
    <View style={s.row}><Text style={s.caption}>{model.earned?`${competitionTrackLabel(model.sport)} · +${model.earned} this week`:model.live ? "Live · Finalized weekly" : competitionTrackLabel(model.sport)}</Text><Text style={s.caption}>{model.capped?"Maximum score":`${remaining} left`}</Text></View>
    {gainEl}
  </Pressable>;
}
const sThemes = createThemedStyles(themeColors=>{const c=themeColors;return {rail:{marginHorizontal:0,marginBottom:0,padding:10,gap:5,borderWidth:1,borderColor:c.line,borderRadius:12,backgroundColor:c.card,minHeight:64},railCompact:{borderWidth:0,backgroundColor:"transparent",padding:0,gap:4,minHeight:0,justifyContent:"center",flex:1,width:"100%"},row:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",gap:6},compactScoreTap:{flexDirection:"row",alignItems:"baseline",gap:4,flexShrink:1,flex:1,minWidth:0},compactTrackTap:{flex:1,minWidth:0},caption:{ ...textStyle("caption"), color: c.muted },score:{ ...textStyle("label"), color: c.ink, fontVariant: ["tabular-nums"] },track:{height:24,borderRadius:8,backgroundColor:c.soft,overflow:"hidden"},trackCompact:{height:20,borderRadius:8,backgroundColor:c.soft,overflow:"hidden",width:"100%",alignSelf:"stretch"},fill:{height:"100%",borderRadius:8,minHeight:20},gain:{position:"absolute",right:8,top:0,borderRadius:8,paddingHorizontal:8,paddingVertical:4},multiplierBtn:{borderRadius:6,backgroundColor:c.tennis,paddingHorizontal:6,paddingVertical:2},multiplier:{...textStyle("label"),color:c.textOnAction,fontVariant:["tabular-nums"]},boostPopup:{paddingHorizontal:12,paddingVertical:10},boostPopupBody:{...textStyle("caption"),color:c.muted},gainText:{...textStyle("label"),color:c.textOnAction}};});
