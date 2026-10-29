import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import Svg, { Circle, Line, Path, Rect, Text as SvgText } from "react-native-svg";
import { EXPERIENCE_CONCEPTS, experienceConceptId, type ExperienceConceptId } from "@fitness-battle/shared";
import { AnimatedEmber } from "../src/ui/mascot/animated-ember";
import { useReducedMotion } from "../src/ui/use-reduced-motion";
import { FocusButton } from "../src/ui/focus";
import { chartTextProps, textStyle } from "../src/ui/section";
import { SHELL_COLORS as c } from "../src/theme";

/** A memory-only storyboard. It deliberately has no account-store dependency. */
export default function ExperienceLab() {
  const params = useLocalSearchParams<{ flow?: string }>(), router = useRouter();
  const requestedFlow = experienceConceptId(params.flow);
  const [flow, setFlow] = useState<ExperienceConceptId>(requestedFlow);
  const [step, setStep] = useState(0), [sport, setSport] = useState("Running"), [effort, setEffort] = useState(false), [done, setDone] = useState(false);
  useEffect(() => { setFlow(requestedFlow); setStep(0); setDone(false); setEffort(false); }, [requestedFlow]);
  const story = EXPERIENCE_CONCEPTS[flow], beat = story.steps[step];
  function choose(id: ExperienceConceptId) { setFlow(id); setStep(0); setDone(false); setEffort(false); }
  const pair = flow === "overtake" || flow === "onboarding" && step === 2;
  const reduced = useReducedMotion();
  const [travel, setTravel] = useState(0);
  const passed = flow === "overtake" ? step > 1 : effort;
  useEffect(() => {
    const target = passed ? 1 : 0;
    if (reduced) { setTravel(target); return; }
    let frame = 0; const start = Date.now(), from = travel;
    const tick = () => { const p = Math.min(1, (Date.now() - start) / 1100); setTravel(from + (target - from) * (p*p*(3-2*p))); if (p < 1) frame = requestAnimationFrame(tick); };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [passed, reduced]);
  return <SafeAreaView style={{flex:1,backgroundColor:c.paper}} edges={["bottom"]}>
    <ScrollView contentContainerStyle={s.page}>
      <View style={s.row}><Text style={s.kicker}>EXPERIENCE LAB</Text><Pressable accessibilityRole="button" onPress={()=>router.canGoBack()?router.back():router.replace("/today")} style={s.close}><Text style={s.label}>Close preview</Text></Pressable></View>
      <View style={s.row}>{(Object.keys(EXPERIENCE_CONCEPTS) as ExperienceConceptId[]).map(id=><Pressable key={id} accessibilityRole="button" accessibilityState={{selected:flow===id}} onPress={()=>choose(id)} style={[s.tab,flow===id&&s.selected]}><Text style={s.caption}>{EXPERIENCE_CONCEPTS[id].label}</Text></Pressable>)}</View>
      <View style={s.row} accessibilityLabel={`Step ${step+1} of 4`}>{story.steps.map((_,i)=><View key={i} style={[s.progress,{backgroundColor:i<=step?c.tennis:c.line}]}/>)}</View>
      <View style={s.art}>
        {pair ? <Svg width="100%" height={260} viewBox="0 0 360 280" accessibilityLabel={`Sample field: you ${passed?"passed":"are approaching"} Alex. Both racers are visible.`}>
          <Rect x="26" y="10" width="308" height="260" rx="28" fill="#fff5d1"/>
          <Line x1="116" x2="116" y1="30" y2="250" stroke={c.line} strokeDasharray="4 8"/><Line x1="244" x2="244" y1="30" y2="250" stroke={c.line} strokeDasharray="4 8"/>
          <Line x1="45" x2="315" y1="144" y2="144" stroke={c.fieldTeal} strokeDasharray="5 5"/>
          <Rect x="98" y={190-132*travel} width="36" height="52" rx="18" fill={c.tennis} stroke={c.ink} strokeWidth="2"/><SvgText x="116" y={174-132*travel} textAnchor="middle" fill={c.ink} {...chartTextProps("label")}>YOU</SvgText>
          <Rect x="226" y="120" width="36" height="52" rx="18" fill={c.card} stroke={c.muted} strokeWidth="2"/><SvgText x="244" y="104" textAnchor="middle" fill={c.muted}>ALEX</SvgText>
          {passed&&<SvgText x="180" y="238" textAnchor="middle" {...chartTextProps("heading")} fill={c.fieldTeal}>+1 OVERTAKE</SvgText>}
        </Svg> : flow === "week" && step < 3 ? <Svg width="100%" height={260} viewBox="0 0 360 280" accessibilityLabel={step===0?"Three sessions on a weekly trail":step===1?"Third place finish":"12.4 kilometres, three sessions, four week activity streak"}>
          {step===0?<><Path d="M70 240C300 240 300 170 170 160S30 70 280 40" stroke={c.fieldTeal} strokeWidth="8" fill="none"/>{[[70,238],[207,165],[250,45]].map(([x,y],i)=><Circle key={i} cx={x} cy={y} r="22" fill={c.tennis}/>)}</>:step===1?<><Circle cx="180" cy="125" r="88" fill="#fff5d1"/><Circle cx="180" cy="125" r="62" fill={c.tennis}/><SvgText x="180" y="150" textAnchor="middle" {...chartTextProps("hero")} fill={c.ink}>3</SvgText><SvgText x="180" y="245" textAnchor="middle" {...chartTextProps("label")} fill={c.fieldTeal}>YOUR WEEK, SETTLED.</SvgText></>:<>{[0,3.2,0,4,0,0,5.2].map((v,i)=><Rect key={i} x={35+i*43} y={235-v*25} width="24" height={Math.max(4,v*25)} rx="10" fill={v?c.tennis:c.line}/>)}<SvgText x="35" y="60" {...chartTextProps("hero")} fill={c.ink}>12.4 km</SvgText></>}
        </Svg> : <View style={s.ember}><AnimatedEmber size={230} label="Ember, your tiny teammate"/></View>}
      </View>
      <Text style={s.kicker}>{done?"PREVIEW COMPLETE":beat.eyebrow}</Text>
      <Text accessibilityRole="header" style={s.title}>{done?"That’s the feeling.":beat.title}</Text>
      <Text style={s.body}>{done?"Try another moment or replay this one.":beat.body}</Text>
      {!done&&flow==="onboarding"&&step===1&&<View style={s.sports}>{["Running","Cycling","Walking","Strength"].map(item=><Pressable key={item} accessibilityRole="button" accessibilityState={{selected:sport===item}} onPress={()=>setSport(item)} style={[s.sport,sport===item&&s.selected]}><Text style={s.label}>{sport===item?"✓ ":""}{item}</Text></Pressable>)}</View>}
      {!done&&flow==="onboarding"&&step===2&&<FocusButton secondary label={effort?"Reset sample session":"Add a sample session"} onPress={()=>setEffort(!effort)}/>}
      {!done&&flow==="overtake"&&step===3&&<Text style={s.stat}>#4 → #3     ·     +1 overtake</Text>}
      {!done&&flow==="week"&&step===2&&<Text style={s.stat}>4-week streak     ·     3 active days</Text>}
      <View style={s.actions}><FocusButton label={done?"Replay concept":beat.action} onPress={()=>done?choose(flow):step===3?setDone(true):setStep(step+1)}/>{step>0&&!done&&<FocusButton secondary label="Previous step" onPress={()=>setStep(step-1)}/>}</View>
      <Text style={s.disclosure}>CONCEPT PREVIEW · FICTIONAL DATA · NO ACCOUNT CHANGES</Text>
    </ScrollView>
  </SafeAreaView>;
}
const s = StyleSheet.create({
  page:{padding:22,gap:16,maxWidth:520,width:"100%",alignSelf:"center",flexGrow:1},row:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",gap:8},close:{minHeight:44,justifyContent:"center"},kicker:{...textStyle("caption"),color:c.fieldTeal},label:{...textStyle("label"),color:c.ink},caption:{...textStyle("caption"),color:c.ink},tab:{flex:1,borderWidth:1,borderColor:c.line,borderRadius:12,minHeight:48,alignItems:"center",justifyContent:"center",padding:6},selected:{backgroundColor:"#fff5d1",borderColor:c.tennis},progress:{height:7,borderRadius:4,flex:1,marginTop:8},art:{height:260,alignItems:"center",justifyContent:"center"},ember:{width:250,height:250,borderRadius:125,backgroundColor:"#fff5d1",alignItems:"center",justifyContent:"center"},title:{...textStyle("display"),color:c.ink},body:{...textStyle("body"),color:c.muted},sports:{flexDirection:"row",flexWrap:"wrap",gap:10},sport:{width:"47%",minHeight:58,borderWidth:1,borderColor:c.line,borderRadius:12,alignItems:"center",justifyContent:"center"},stat:{...textStyle("heading"),color:c.fieldTeal,paddingVertical:16},actions:{marginTop:"auto",paddingTop:16,gap:10},disclosure:{...textStyle("caption"),textAlign:"center",color:c.muted},
});
