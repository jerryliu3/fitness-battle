import { useEffect, useId } from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, ClipPath, Defs, LinearGradient, Path, Rect, Stop } from "react-native-svg";
import Animated, { cancelAnimation, Easing, useAnimatedProps, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from "react-native-reanimated";
import { clubDuration, formatVolume, type CompeteState, type SyncReviewReceipt } from "@fitness-battle/shared";
import { useThemeColors } from "../theme";
import { textStyle } from "./section";
import { useReducedMotion } from "./use-reduced-motion";

const Fill = Animated.createAnimatedComponent(Rect);
const Ring = Animated.createAnimatedComponent(Circle);
const circumference = 2 * Math.PI * 94;

/** Charge represents selected moving time as a share of this sync receipt. */
export function SyncEnergyCore({ activities, totalSeconds, units, draining }: {
  activities: SyncReviewReceipt["activities"]; totalSeconds: number; units: CompeteState["units"]; draining: boolean;
}) {
  const c = useThemeColors();
  const reduced = useReducedMotion();
  const id = useId().replace(/:/g, "");
  const seconds = activities.reduce((sum, a) => sum + a.movingSec, 0);
  const fraction = totalSeconds > 0 ? Math.min(1, seconds / totalSeconds) : 0;
  const charge = useSharedValue(0);
  const orbit = useSharedValue(0);
  const vibration = useSharedValue(0);
  useEffect(() => {
    charge.value = reduced ? (draining ? 0 : fraction) : withTiming(draining ? 0 : fraction, { duration: draining ? 780 : 1100, easing: Easing.inOut(Easing.cubic) });
  }, [fraction, draining, reduced, charge]);
  useEffect(() => {
    if (reduced || fraction === 0 || draining) {
      cancelAnimation(orbit); cancelAnimation(vibration);
      orbit.value = 0; vibration.value = 0;
      return;
    }
    orbit.value = withRepeat(withTiming(360, { duration: 4200, easing: Easing.linear }), -1, false);
    vibration.value = withRepeat(withSequence(withTiming(1, { duration: 65 }), withTiming(-1, { duration: 65 }), withTiming(0, { duration: 65 }), withTiming(0, { duration: 1500 })), -1, false);
    return () => { cancelAnimation(orbit); cancelAnimation(vibration); };
  }, [reduced, fraction, draining, orbit, vibration]);
  const fillProps = useAnimatedProps(() => ({ y: 194 - 164 * charge.value, height: 164 * charge.value }));
  const ringProps = useAnimatedProps(() => ({ strokeDashoffset: circumference * (1 - charge.value) }));
  const boltStyle = useAnimatedStyle(() => ({ opacity: .35 + charge.value * .65, transform: [{ translateX: vibration.value * charge.value * 1.8 }, { rotate: `${vibration.value * charge.value * 4}deg` }, { scale: 1 + charge.value * .12 }] }));
  const orbitStyle = useAnimatedStyle(() => ({ opacity: reduced ? 0 : charge.value * .8, transform: [{ rotate: `${orbit.value}deg` }] }));
  const distance = activities.reduce((sum, a) => sum + a.distanceM, 0);
  const hasElevation = activities.some(a => a.elevationGainM != null);
  const elevation = activities.reduce((sum, a) => sum + (a.elevationGainM ?? 0), 0);
  return <View style={{ gap: 14, alignItems: "center" }}>
    <View accessible accessibilityLabel={`${clubDuration(seconds)} selected moving time. ${Math.round(fraction * 100)} percent of synced moving time selected.`} style={{ width: 224, height: 224, alignItems: "center", justifyContent: "center" }}>
      <Svg width={224} height={224} viewBox="0 0 224 224" style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id={`${id}fill`} x1="0%" y1="0%" x2="100%" y2="100%"><Stop offset="0" stopColor={c.tennis} stopOpacity=".22"/><Stop offset=".5" stopColor={c.tennis} stopOpacity=".65"/><Stop offset="1" stopColor={c.tennis}/></LinearGradient>
          <LinearGradient id={`${id}ring`} x1="0%" y1="0%" x2="100%" y2="100%"><Stop offset="0" stopColor={c.tennis}/><Stop offset="1" stopColor={c.fieldTeal}/></LinearGradient>
          <ClipPath id={`${id}clip`}><Circle cx="112" cy="112" r="82"/></ClipPath>
        </Defs>
        <Circle cx="112" cy="112" r="94" fill="none" stroke={c.line} strokeWidth="8"/>
        <Ring cx="112" cy="112" r="94" fill="none" stroke={`url(#${id}ring)`} strokeWidth="8" strokeLinecap="round" strokeDasharray={`${circumference} ${circumference}`} rotation="-90" origin="112,112" animatedProps={ringProps}/>
        <Circle cx="112" cy="112" r="82" fill={c.card}/>
        <Fill x="30" width="164" clipPath={`url(#${id}clip)`} fill={`url(#${id}fill)`} animatedProps={fillProps}/>
      </Svg>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, orbitStyle]}>
        <Svg width={224} height={224} viewBox="0 0 224 224"><Path d="M107 8l-5 9h6l-2 8 12-13h-7l4-6z" fill={c.tennis}/><Circle cx="112" cy="209" r="3" fill={c.tennis}/></Svg>
      </Animated.View>
      <Animated.View style={boltStyle}><Svg width={32} height={36} viewBox="0 0 32 36"><Path d="M19 2L5 21h10l-2 13 15-21H18z" fill={c.ink}/></Svg></Animated.View>
      <Text style={[textStyle("display"), { color: c.ink, marginTop: 6 }]}>{clubDuration(seconds)}</Text>
      <Text style={[textStyle("caption"), { color: c.ink }]}>moving time</Text>
    </View>
    <Text style={[textStyle("caption"), { color: c.muted }]}>{Math.round(fraction * 100)}% of synced moving time selected</Text>
    <View style={{ flexDirection: "row", width: "100%", justifyContent: "space-around", gap: 12 }}>
      {[
        ["Distance", formatVolume("running", distance, seconds, units)],
        ["Activities", `${activities.length}`],
        ["Elevation", !hasElevation ? "—" : units === "us" ? `${Math.round(elevation * 3.28084)} ft` : `${Math.round(elevation)} m`],
      ].map(([label, value]) => <View key={label} style={{ alignItems: "center", flex: 1, gap: 3 }}><Text style={[textStyle("label"), { color: c.ink }]}>{value}</Text><Text style={[textStyle("caption"), { color: c.muted }]}>{label}</Text></View>)}
  </View>;
}
