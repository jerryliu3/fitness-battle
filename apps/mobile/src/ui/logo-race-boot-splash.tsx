import { createThemedStyles, useThemedStyles, useThemeColors } from "../theme";
import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, ActivityIndicator, AppState, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import Svg, { G, Text as SvgText } from "react-native-svg";
import { clamp, LOGO_RACE_DURATION_MS, logoRaceWords } from "@fitness-battle/shared/boot";
import { textStyle } from "./section";
import { SHELL_COLORS as c } from "../theme";

export function LogoRaceBootSplash({ waiting = false, onAnimationComplete }: {
  waiting?: boolean;
  onAnimationComplete: () => void;
}) {
  const c = useThemeColors();
  const s = useThemedStyles(sThemes);

  const [position, setPosition] = useState(0);
  const onComplete = useRef(onAnimationComplete);
  onComplete.current = onAnimationComplete;
  const completed = useRef(false);
  const { width } = useWindowDimensions();
  useEffect(() => {
    let disposed = false, raf = 0, elapsed = 0, last: number | null = null;
    let preferenceReady = false, preferenceChanged = false, reduced = true;
    function finish() {
      setPosition(1);
      if (!disposed && !completed.current) {
        completed.current = true;
        onComplete.current();
      }
    }
    function tick(now: number) {
      if (disposed || AppState.currentState !== "active") return;
      if (last !== null) elapsed += now - last;
      last = now;
      const next = clamp(elapsed / LOGO_RACE_DURATION_MS);
      setPosition(next);
      if (next === 1) finish(); else raf = requestAnimationFrame(tick);
    }
    function resume() {
      cancelAnimationFrame(raf);
      last = null;
      if (disposed || completed.current || !preferenceReady) return;
      if (reduced) { finish(); return; }
      if (AppState.currentState === "active") raf = requestAnimationFrame(tick);
    }
    void AccessibilityInfo.isReduceMotionEnabled().then(value => {
      if (disposed || preferenceChanged) return;
      preferenceReady = true;
      reduced = value;
      resume();
    }).catch(() => {
      if (disposed || preferenceChanged) return;
      preferenceReady = true;
      reduced = true;
      resume();
    });
    const preference = AccessibilityInfo.addEventListener("reduceMotionChanged", value => {
      preferenceChanged = true;
      preferenceReady = true;
      reduced = value;
      resume();
    });
    const app = AppState.addEventListener("change", resume);
    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      preference.remove();
      app.remove();
    };
  }, []);
  const markWidth = Math.min(760, Math.max(1, width - 24));
  return <View style={s.root} accessibilityRole="progressbar" accessibilityLabel="Loading Overtaek">
    <Svg width={markWidth} height={markWidth * 240 / 760} viewBox="0 100 760 240" accessible={false}>
      {logoRaceWords(position).map((word, i) => <G key={i} transform={`translate(${word.x} ${word.y}) skewX(${-word.lean})`} opacity={word.opacity}>
        <SvgText x={0} y={0} fill={word.echo ? c.tennis : c.ink} fontFamily="NunitoSans_900Black" fontWeight="900" fontSize={124} letterSpacing={-5} textLength={word.width} lengthAdjust="spacingAndGlyphs">{word.word}</SvgText>
      </G>)}
    </Svg>
    <View style={s.wait}>{waiting && <><ActivityIndicator color={c.ink} /><Text style={s.label}>Loading…</Text></>}</View>
  </View>;
}
const sThemes = createThemedStyles((themeColors) => ({
  root: { flex: 1, alignItems: "center", justifyContent: "center", gap: 28, paddingHorizontal: 12, paddingVertical: 24, backgroundColor: themeColors.paper },
  wait: { minHeight: 52, alignItems: "center", gap: 12 },
  label: { ...textStyle("caption"), color: themeColors.muted },
}));
