import { useEffect, useRef, useState } from "react";
import { Animated, LayoutAnimation, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { SPORTS, type SportId, type UnitSystem } from "@fitness-battle/shared";
import { useReducedMotion } from "../ui/use-reduced-motion";
import { AppText } from "../ui/section";
import { SportIcon } from "../ui/sport-icon";
import { StandardLineChart } from "../ui/standard-line-chart";
import { SHELL_COLORS as c } from "../theme";
const panel={padding:24,borderRadius:24,backgroundColor:c.card,borderWidth:1,borderColor:c.line,gap:12};
export function OnboardingOutlook() {
 const reduced = useReducedMotion();
 const draw = useRef(new Animated.Value(0)).current;
 const [distance, setDistance] = useState(20.1);
 const [chart, setChart] = useState(false);
 const leading = distance > 22.1;
 useEffect(() => {
   // The device preference resolves after mounting; restart the staged reveal then.
   draw.setValue(reduced ? 1 : 0);
   setChart(reduced);
   setDistance(reduced ? 24.8 : 20.1);
   if (reduced) return;
   const start = Date.now();
   let swapped = false;
   const standings = setInterval(() => {
     const progress = Math.min(1, (Date.now() - start) / 2000);
     const next = 20.1 + 4.7 * progress;
     if (!swapped && next > 22.1) {
       swapped = true;
       LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
     }
     setDistance(next);
     if (progress === 1) clearInterval(standings);
   }, 30);
   const reveal = setTimeout(() => setChart(true), 2400);
   return () => { clearInterval(standings); clearTimeout(reveal); };
 }, [reduced, draw]);
 useEffect(() => {
   if (!chart) return;
   const animation = Animated.timing(draw, {toValue:1, duration:reduced?0:1500, useNativeDriver:false});
   animation.start();
   return () => animation.stop();
 }, [chart, reduced, draw]);
 return <View style={{gap:18}}>
 <AppText secondary>Your effort builds throughout the week. Get your results at the end of each weekly competition.</AppText>
 <View style={panel}>{(leading?[{place:1,name:"You",value:`${distance.toFixed(1)} km`},{place:2,name:"Alex",value:"22.1 km"},{place:3,name:"Sam",value:"19.4 km"}]:[{place:1,name:"Alex",value:"22.1 km"},{place:2,name:"You",value:`${distance.toFixed(1)} km`},{place:3,name:"Sam",value:"19.4 km"}]).map(row=><View key={row.name} style={{flexDirection:"row",alignItems:"center",gap:14,padding:14,borderRadius:14,backgroundColor:row.name==="You"?"#fff5d1":"transparent"}}><AppText role="heading">#{row.place}</AppText><AppText role="label" style={{flex:1}}>{row.name}</AppText><AppText role="caption">{row.value}</AppText></View>)}</View>
 {chart&&<OnboardingFade delay={0}><View style={panel}><AppText role="heading">Watch your progress climb.</AppText><AppText secondary>Effort during the week and your competition results help build your score.</AppText><StandardLineChart yAxisLabel="Effort score" xAxisLabel="Week" showAxes revealProgress={draw} values={[1000,1010,1008,1035,1054,1050,1080]} xLabels={["Week 1","Week 4","Week 7"]} accessibilityLabel="Illustrative score progress from 1000 to 1080 across seven weeks"/></View></OnboardingFade>}

 </View>;}
export function OnboardingSummary({sports,units,sleep}:{sports:SportId[];units:UnitSystem;sleep:boolean}){return <View style={[panel,{backgroundColor:"#fff5d1"}]}>{sports.map((sport,index)=><OnboardingFade delay={index*300} key={sport}><View style={{flexDirection:"row",alignItems:"center",gap:16,padding:16,borderRadius:18,backgroundColor:c.card}}><SportIcon sport={sport} size={32}/><View style={{flex:1,gap:4}}><AppText role="heading">{SPORTS.find(s=>s.id===sport)!.name}</AppText><AppText role="caption">{sport==="strength"?"Every session counts":units==="us"?"Going the distance · Miles":"Going the distance · Kilometres"}</AppText></View></View></OnboardingFade>)}{sleep&&<OnboardingFade delay={sports.length*300}><View style={{flexDirection:"row",alignItems:"center",gap:16,padding:16,borderRadius:18,backgroundColor:c.card}}><Svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke={c.ink} strokeWidth={1.8}><Path d="M20 15.5A8.5 8.5 0 0 1 8.5 4 8.5 8.5 0 1 0 20 15.5Z"/></Svg><View style={{flex:1,gap:4}}><AppText role="heading">Sleep & recovery</AppText><AppText role="caption">Rest is part of your rhythm</AppText></View></View></OnboardingFade>}</View>;}

export function OnboardingFade({delay,children}:{delay:number;children:React.ReactNode}){const reduced=useReducedMotion();const opacity=useRef(new Animated.Value(reduced?1:0)).current;useEffect(()=>{const animation=Animated.timing(opacity,{toValue:1,delay:reduced?0:delay,duration:reduced?0:400,useNativeDriver:true});animation.start();return ()=>animation.stop();},[delay,reduced,opacity]);return <Animated.View style={{opacity}}>{children}</Animated.View>;}
