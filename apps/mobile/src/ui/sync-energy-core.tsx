import { useEffect, useId, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, ClipPath, Defs, LinearGradient, Path, Stop } from "react-native-svg";
import Animated, { cancelAnimation, Easing, ReduceMotion, useAnimatedProps, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from "react-native-reanimated";
import { trainingXpInPeriod, clubDuration, formatVolume, type CompeteState, type SyncReviewReceipt } from "@fitness-battle/shared";
import { useThemeColors } from "../theme";
import { AppIcon, type AppIconName } from "./app-icon";
import { textStyle } from "./section";
import { useReducedMotion } from "./use-reduced-motion";

const Water = Animated.createAnimatedComponent(Path);
const Ring = Animated.createAnimatedComponent(Circle);
const circumference = 2 * Math.PI * 94;
const CHARGE_DURATION_MS = 1100;

interface CoreNumbers {
  xp: number;
  distance: number;
  seconds: number;
  count: number;
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function useAnimatedCoreNumbers(targets: CoreNumbers, reduced: boolean): CoreNumbers {
  const [display, setDisplay] = useState<CoreNumbers>(() =>
    reduced ? targets : { xp: 0, distance: 0, seconds: 0, count: 0 },
  );
  const currentRef = useRef<CoreNumbers>(display);
  currentRef.current = display;

  useEffect(() => {
    if (reduced || typeof requestAnimationFrame !== "function") {
      setDisplay(targets);
      return;
    }

    const from = currentRef.current;
    if (
      from.xp === targets.xp &&
      from.distance === targets.distance &&
      from.seconds === targets.seconds &&
      from.count === targets.count
    ) {
      return;
    }

    let frameId = 0;
    let startTime: number | null = null;

    const tick = (now: number) => {
      if (startTime === null) startTime = now;
      const t = Math.min(1, (now - startTime) / CHARGE_DURATION_MS);
      const k = easeInOutCubic(t);
      if (t >= 1) {
        setDisplay(targets);
        return;
      }
      setDisplay({
        xp: from.xp + (targets.xp - from.xp) * k,
        distance: from.distance + (targets.distance - from.distance) * k,
        seconds: from.seconds + (targets.seconds - from.seconds) * k,
        count: from.count + (targets.count - from.count) * k,
      });
      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [targets.xp, targets.distance, targets.seconds, targets.count, reduced]);

  return reduced ? targets : display;
}

export function SyncEnergyCore({ activities, history = activities, benchmarkSeconds, units = "metric", draining: _draining = false, size = 196, sideTotals = false, active = true }: {
  activities: SyncReviewReceipt["activities"]; history?: readonly SyncReviewReceipt["activities"][number][]; benchmarkSeconds: number; units?: CompeteState["units"]; draining?: boolean; size?: number; sideTotals?: boolean; active?: boolean;
}) {
  const c = useThemeColors();
  const reduced = useReducedMotion();
  const id = useId().replace(/:/g, "");
  const seconds = activities.reduce((sum, a) => sum + a.movingSec, 0);
  const xp = trainingXpInPeriod({activities}, new Date(0), new Date(Date.now()+1), undefined, history);
  const distance = activities.reduce((sum, a) => sum + a.distanceM, 0);
  const fraction = benchmarkSeconds > 0 ? Math.min(1, seconds / benchmarkSeconds) : 0;

  const charge = useSharedValue(0), phase = useSharedValue(0), vibration = useSharedValue(0);
  useEffect(() => {
    charge.value = withTiming(fraction, { duration: CHARGE_DURATION_MS, easing: Easing.inOut(Easing.cubic), reduceMotion: ReduceMotion.System });
    return () => cancelAnimation(charge);
  }, [fraction, charge]);

  const energized = active && !reduced && fraction > 0;
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

  const shown = useAnimatedCoreNumbers({ xp, distance, seconds, count: activities.length }, reduced);
  const settled = shown.xp === xp;
  const shownXp = settled ? xp : Math.round(shown.xp * 10) / 10;
  const isZero = xp === 0 && shownXp === 0;
  const xpLabel = isZero
    ? "+0"
    : `+${shownXp.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}`;
  const isLight = c.paper === "#f8f9f6";
  const summaryItems: { icon: AppIconName; label: string; value: string }[] = [
    { icon: "distance", label: "Distance", value: formatVolume("running", shown.distance, shown.seconds, units) },
    { icon: "time", label: "Total time", value: clubDuration(shown.seconds) },
    { icon: "layers", label: "Activities", value: `${Math.round(shown.count)}` },
  ];

  function sideTotal(item: (typeof summaryItems)[number]) {
    return <View accessible accessibilityLabel={`${item.label}: ${item.value}`} style={{ flex: 1, minWidth: 0, alignItems: "center" }}>
      <Text style={[textStyle("label"), { color: c.ink, textAlign: "center" }]}>{item.value}</Text>
      <Text style={[textStyle("caption"), { color: c.muted, textAlign: "center" }]}>{item.label}</Text>
    </View>;
  }

  return <View style={{ alignItems: "center", flexDirection: sideTotals ? "row" : "column", gap: sideTotals ? 8 : 14 }}>
    {sideTotals && sideTotal(summaryItems[1]!)}
    <View accessible accessibilityLabel={`Selected activity energy, ${xpLabel} Training XP`} style={{ width: size, height: size, flexShrink: 0, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} viewBox="0 0 224 224" style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id={`${id}fill`} x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0" stopColor="#dca21c" stopOpacity={isLight ? 1 : 0.36}/>
            <Stop offset=".45" stopColor={isLight ? "#ffe178" : c.tennis} stopOpacity={isLight ? 1 : 0.24}/>
            <Stop offset="1" stopColor={isLight ? "#fffdf0" : c.tennis} stopOpacity={isLight ? 1 : 0.08}/>
          </LinearGradient>
          <ClipPath id={`${id}clip`}><Circle cx="112" cy="112" r="82"/></ClipPath>
        </Defs>
        <Circle cx="112" cy="112" r="94" fill="none" stroke={c.line} strokeWidth="6"/>
        <Ring cx="112" cy="112" r="94" fill="none" stroke={c.tennis} strokeWidth="6" strokeLinecap="round" strokeDasharray={`${circumference} ${circumference}`} rotation="-90" origin="112,112" animatedProps={ringProps}/>
        <Circle cx="112" cy="112" r="82" fill={c.card}/>
        <Water clipPath={`url(#${id}clip)`} fill={`url(#${id}fill)`} animatedProps={waterProps}/>
      </Svg>
      <View style={{ width: Math.round(size * 0.72), alignItems: "center", justifyContent: "center", gap: 1 }}>
        <Animated.View style={boltStyle}><Svg width={Math.round(size * .16)} height={Math.round(size * .2)} viewBox="0 0 32 36"><Path d="M19 2L5 21h10l-2 13 15-21H18z" fill={c.tennis} stroke="#dca21c" strokeWidth=".5"/></Svg></Animated.View>
        <Text numberOfLines={1} adjustsFontSizeToFit style={[textStyle("metric"), { color: c.ink, fontVariant: ["tabular-nums"], textAlign: "center" }]}>{xpLabel}</Text>
        <Text style={[textStyle("caption"), { color: c.muted }]}>Training XP</Text>
      </View>
    </View>
    {sideTotals ? sideTotal(summaryItems[2]!) : <View style={{ flexDirection: "row", alignItems: "center", width: "100%" }}>
      {summaryItems.map((item, idx) => (
        <View key={item.label} style={{ flex: 1, flexDirection: "row", alignItems: "center" }}>
          {idx > 0 && <View style={{ width: 1, height: 28, backgroundColor: c.line }} />}
          <View accessible accessibilityLabel={`${item.label}: ${item.value}`} style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingHorizontal: 4 }}>
            <AppIcon name={item.icon} size={18} color={c.ink} />
            <View style={{ flexShrink: 1 }}>
              <Text style={[textStyle("label"), { color: c.ink, fontVariant: ["tabular-nums"] }]}>{item.value}</Text>
              <Text style={[textStyle("caption"), { color: c.muted }]}>{item.label}</Text>
            </View>
          </View>
        </View>
      ))}
    </View>}
  </View>;
}
