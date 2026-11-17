import { useThemeColors } from "../theme";
import { useEffect, useRef } from "react";
import { Animated, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { SPORTS, type SportId, type UnitSystem } from "@fitness-battle/shared";
import { useReducedMotion } from "../ui/use-reduced-motion";
import { AppText } from "../ui/section";
import { SportIcon } from "../ui/sport-icon";


export function OnboardingSummary({sports,units,sleep,compact=false}:{sports:SportId[];units:UnitSystem;sleep:boolean;compact?:boolean}){
const c=useThemeColors();
return <View style={[{padding:compact?12:24,borderRadius:24,backgroundColor:c.card,borderWidth:1,borderColor:c.line,gap:compact?8:12},{backgroundColor:c.actionSoft}]}>{sports.map((sport,index)=><OnboardingFade delay={index*300} key={sport}><View style={{flexDirection:"row",alignItems:"center",gap:compact?10:16,padding:compact?10:16,borderRadius:18,backgroundColor:c.card}}><SportIcon sport={sport} size={compact?24:32}/><View style={{flex:1,gap:4}}><AppText role={compact?"label":"heading"}>{SPORTS.find(s=>s.id===sport)!.name}</AppText>{!compact&&<AppText role="caption">{sport==="walking"?"Weekly steps":sport==="strength"?"Session time":units==="us"?"Going the distance · Miles":"Going the distance · Kilometres"}</AppText>}</View></View></OnboardingFade>)}{sleep&&<OnboardingFade delay={sports.length*300}><View style={{flexDirection:"row",alignItems:"center",gap:compact?10:16,padding:compact?10:16,borderRadius:18,backgroundColor:c.card}}><Svg width={compact?24:32} height={compact?24:32} viewBox="0 0 24 24" fill="none" stroke={c.ink} strokeWidth={1.8}><Path d="M20 15.5A8.5 8.5 0 0 1 8.5 4 8.5 8.5 0 1 0 20 15.5Z"/></Svg><View style={{flex:1,gap:4}}><AppText role={compact?"label":"heading"}>Sleep & recovery</AppText>{!compact&&<AppText role="caption">Rest is part of your rhythm</AppText>}</View></View></OnboardingFade>}</View>;}

export function OnboardingFade({delay,children}:{delay:number;children:React.ReactNode}){const reduced=useReducedMotion();const opacity=useRef(new Animated.Value(reduced?1:0)).current;useEffect(()=>{const animation=Animated.timing(opacity,{toValue:1,delay:reduced?0:delay,duration:reduced?0:400,useNativeDriver:true});animation.start();return ()=>animation.stop();},[delay,reduced,opacity]);return <Animated.View style={{opacity}}>{children}</Animated.View>;}
