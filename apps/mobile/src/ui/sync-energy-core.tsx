import { useEffect, useId } from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, ClipPath, Defs, LinearGradient, Path, Stop } from "react-native-svg";
import Animated, { cancelAnimation, Easing, ReduceMotion, useAnimatedProps, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from "react-native-reanimated";
import { clubDuration, formatVolume, type CompeteState, type SyncReviewReceipt } from "@fitness-battle/shared";
import { useThemeColors } from "../theme";
import { AppIcon, type AppIconName } from "./app-icon";
import { textStyle } from "./section";
import { useReducedMotion } from "./use-reduced-motion";

const Water = Animated.createAnimatedComponent(Path);
const Ring = Animated.createAnimatedComponent(Circle);
const circumference = 2 * Math.PI * 94;

export function SyncEnergyCore({ activities, totalSeconds, units, draining, size = 176, active = true, effortDelta }: {
  activities: SyncReviewReceipt["activities"]; totalSeconds: number; units: CompeteState["units"]; draining: boolean; size?: number; active?: boolean; effortDelta: number | null;
}) {
  const c = useThemeColors();
  const reduced = useReducedMotion();
  const id = useId().replace(/:/g, "");
  const seconds = activities.reduce((sum, a) => sum + a.movingSec, 0);
  const fraction = totalSeconds > 0 ? Math.min(1, seconds / totalSeconds) : 0;
  const charge = useSharedValue(0), phase = useSharedValue(0), vibration = useSharedValue(0);
  useEffect(() => {
    charge.value = withTiming(draining ? 0 : fraction, { duration: draining ? 780 : 1100, easing: Easing.inOut(Easing.cubic), reduceMotion: ReduceMotion.System });
    return () => cancelAnimation(charge);
  }, [fraction, draining, charge]);
  const energized = active && !reduced && fraction > 0 && !draining;
  useEffect(() => {
    phase.value = 0; vibration.value = 0;
    if (!energized) return;
    phase.value = withRepeat(withTiming(2 * Math.PI, { duration: 4200, easing: Easing.linear }), -1, false);
    vibration.value = withRepeat(withSequence(withTiming(1, { duration: 65 }), withTiming(-1, { duration: 65 }), withTiming(1, { duration: 65 }), withTiming(0, { duration: 65 }), withTiming(0, { duration: 1500 })), -1, false);
    return () => { cancelAnimation(phase); cancelAnimation(vibration); };
  }, [energized, phase, vibration]);
  const waterProps = useAnimatedProps(() => {
    const y = 198 - 172 * charge.value;
    const wave = reduced ? 0 : Math.sin(phase.value) * 4;
    return { d: `M26 ${y} C55 ${y - 5 + wave} 82 ${y + 5 + wave} 112 ${y} S169 ${y - 5 - wave} 198 ${y} V200 H26 Z` };
  });
  const ringProps = useAnimatedProps(() => ({ strokeDashoffset: circumference * (1 - charge.value), strokeOpacity: charge.value > 0 ? 1 : 0 }));
  const boltStyle = useAnimatedStyle(() => ({ opacity: .4 + charge.value * .6, transform: [{ translateX: vibration.value * charge.value * 2 }, { rotate: `${vibration.value * charge.value * 4}deg` }, { scale: 1 + charge.value * .1 }] }));
  const sparksStyle = useAnimatedStyle(() => ({ opacity: reduced ? 0 : Math.abs(vibration.value) * charge.value, transform: [{ rotate: `${phase.value * 540 / Math.PI}deg` }] }));
  const distance = activities.reduce((sum, a) => sum + a.distanceM, 0);
  const metric = (icon: AppIconName, label: string, value: string) => <View accessible accessibilityLabel={`${label}: ${value}`} style={{ alignItems: "center", gap: 3 }}>
    <AppIcon name={icon} size={20} color={c.fieldTeal}/><Text style={[textStyle("label"), { color: c.ink, textAlign: "center" }]}>{value}</Text><Text style={[textStyle("caption"), { color: c.muted }]}>{label}</Text>
  </View>;
  return <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4 }}>
    <View style={{ flex: 1, gap: 20 }}>{metric("running", "Distance", formatVolume("running", distance, seconds, units))}{metric("time", "Time", clubDuration(seconds))}</View>
    <View accessible accessibilityLabel="Selected activity energy" style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} viewBox="0 0 224 224" style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id={`${id}fill`} x1="0%" y1="0%" x2="0%" y2="100%"><Stop offset="0" stopColor="#dca21c"/><Stop offset=".45" stopColor="#ffe178"/><Stop offset="1" stopColor="#fffdf0"/></LinearGradient>
          <ClipPath id={`${id}clip`}><Circle cx="112" cy="112" r="82"/></ClipPath>
        </Defs>
        <Circle cx="112" cy="112" r="94" fill="none" stroke={c.line} strokeWidth="6"/>
        <Ring cx="112" cy="112" r="94" fill="none" stroke={c.tennis} strokeWidth="6" strokeLinecap="round" strokeDasharray={`${circumference} ${circumference}`} rotation="-90" origin="112,112" animatedProps={ringProps}/>
        <Circle cx="112" cy="112" r="82" fill={c.card}/>
        <Water clipPath={`url(#${id}clip)`} fill={`url(#${id}fill)`} animatedProps={waterProps}/>
      </Svg>
      <Animated.View pointerEvents="none" style={[{ position: "absolute", width: size * .65, height: size * .65 }, sparksStyle]}>
        <Svg width="100%" height="100%" viewBox="0 0 100 100"><Path d="M23 9l-8 15h9l-3 12 15-20h-10l4-10z M77 65l-9 16h9l-3 12 15-20h-10l4-10z" fill={c.tennis}/></Svg>
      </Animated.View>
      <Animated.View style={boltStyle}><Svg width={size * .29} height={size * .38} viewBox="0 0 32 36"><Path d="M19 2L5 21h10l-2 13 15-21H18z" fill={c.tennis} stroke="#dca21c" strokeWidth=".5"/></Svg></Animated.View>
    </View>
    <View style={{ flex: 1, gap: 20 }}>{metric("layers", "Activities", `${activities.length}`)}{metric("scoring", "Effort score", effortDelta === null ? "—" : `${effortDelta >= 0 ? "+" : ""}${effortDelta.toLocaleString("en-US", { maximumFractionDigits: 1 })}`)}</View>
  </View>;
}
