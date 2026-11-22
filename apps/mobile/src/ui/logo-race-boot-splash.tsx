import { createThemedStyles, useThemedStyles, useThemeColors } from "../theme";
import { useEffect, useRef } from "react";
import { AccessibilityInfo, ActivityIndicator, AppState, Text, View, useWindowDimensions } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import Svg, { Text as SvgText } from "react-native-svg";
import { clamp, LOGO_RACE_DURATION_MS, logoRaceWords } from "@fitness-battle/shared/boot";
import { textStyle } from "./section";

const LOGO_RACE_STEPS = 256;
const WORD_PAD_X = 12;
const WORD_HALF_H = 120;
const WORD_BOX_W = 360;
const WORD_BOX_H = WORD_HALF_H * 2;

const FINAL_WORDS = logoRaceWords(1);
const WORD_TRACKS = FINAL_WORDS.map((_, slotIndex) => ({
  xs: [] as number[],
  leans: [] as number[],
  opacities: [] as number[],
  slotIndex,
}));

for (let i = 0; i <= LOGO_RACE_STEPS; i++) {
  const frame = logoRaceWords(i / LOGO_RACE_STEPS);
  for (let slot = 0; slot < frame.length; slot++) {
    WORD_TRACKS[slot].xs.push(frame[slot].x);
    WORD_TRACKS[slot].leans.push(frame[slot].lean);
    WORD_TRACKS[slot].opacities.push(frame[slot].opacity);
  }
}

function LogoRaceWordLayer({
  slotIndex,
  word,
  y,
  width,
  echo,
  scale,
  scaleValue,
  progress,
  color,
}: {
  slotIndex: number;
  word: "over" | "taek";
  y: number;
  width: number;
  echo: boolean;
  scale: number;
  scaleValue: SharedValue<number>;
  progress: SharedValue<number>;
  color: string;
}) {
  const track = WORD_TRACKS[slotIndex];
  const { xs, leans, opacities } = track;
  const animatedStyle = useAnimatedStyle(() => {
    "worklet";
    const p = Math.min(1, Math.max(0, progress.value));
    const scaled = p * LOGO_RACE_STEPS;
    const idx = Math.min(LOGO_RACE_STEPS - 1, Math.floor(scaled));
    const frac = scaled - idx;
    const x = xs[idx] + (xs[idx + 1] - xs[idx]) * frac;
    const lean = leans[idx] + (leans[idx + 1] - leans[idx]) * frac;
    const opacity = opacities[idx] + (opacities[idx + 1] - opacities[idx]) * frac;
    return {
      opacity,
      transform: [
        { translateX: x * scaleValue.value },
        { skewX: `${-lean}deg` },
      ],
    };
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: "absolute",
          left: -WORD_PAD_X * scale,
          top: (y - 100 - WORD_HALF_H) * scale,
          width: WORD_BOX_W * scale,
          height: WORD_BOX_H * scale,
        },
        animatedStyle,
      ]}
    >
      <Svg
        width={WORD_BOX_W * scale}
        height={WORD_BOX_H * scale}
        viewBox={`${-WORD_PAD_X} ${-WORD_HALF_H} ${WORD_BOX_W} ${WORD_BOX_H}`}
        accessible={false}
      >
        <SvgText
          x={0}
          y={0}
          fill={color}
          fontFamily="NunitoSans_900Black"
          fontWeight="900"
          fontSize={124}
          letterSpacing={-5}
          textLength={width}
          lengthAdjust="spacingAndGlyphs"
        >
          {word}
        </SvgText>
      </Svg>
    </Animated.View>
  );
}

export function LogoRaceBootSplash({ waiting = false, onAnimationComplete }: {
  waiting?: boolean;
  onAnimationComplete: () => void;
}) {
  const c = useThemeColors();
  const s = useThemedStyles(sThemes);

  const { width } = useWindowDimensions();
  const markWidth = Math.min(760, Math.max(1, width - 24));
  const scale = markWidth / 760;
  const markHeight = 240 * scale;

  const progress = useSharedValue(0);
  const scaleValue = useSharedValue(scale);
  useEffect(() => {
    scaleValue.value = scale;
  }, [scale, scaleValue]);

  const onComplete = useRef(onAnimationComplete);
  onComplete.current = onAnimationComplete;
  const completed = useRef(false);

  useEffect(() => {
    let disposed = false;
    let running = false;
    let preferenceChanged = false;
    let reduced = false;
    let elapsedMs = 0;
    let activeSince: number | null = null;

    function finish() {
      cancelAnimation(progress);
      running = false;
      activeSince = null;
      elapsedMs = LOGO_RACE_DURATION_MS;
      progress.value = 1;
      if (!disposed && !completed.current) {
        completed.current = true;
        onComplete.current();
      }
    }

    function pause() {
      if (activeSince !== null) {
        elapsedMs = Math.min(LOGO_RACE_DURATION_MS, elapsedMs + Math.max(0, Date.now() - activeSince));
        activeSince = null;
      }
      if (running) {
        running = false;
        cancelAnimation(progress);
      }
      progress.value = clamp(elapsedMs / LOGO_RACE_DURATION_MS);
    }

    function start() {
      if (disposed || running || completed.current) return;
      if (reduced) {
        finish();
        return;
      }
      if (AppState.currentState !== "active") return;
      const remaining = Math.max(0, LOGO_RACE_DURATION_MS - elapsedMs);
      if (remaining === 0) {
        finish();
        return;
      }
      running = true;
      activeSince = Date.now();
      progress.value = withTiming(
        1,
        { duration: remaining, easing: Easing.linear, reduceMotion: ReduceMotion.Never },
        (finished) => {
          "worklet";
          if (finished) {
            scheduleOnRN(finish);
          }
        },
      );
    }

    function handleAppState() {
      if (AppState.currentState === "active") start();
      else pause();
    }

    // Start the UI-thread animation immediately without waiting for async bridge latency.
    start();
    void AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (disposed || preferenceChanged) return;
      reduced = value;
      if (reduced) finish();
    }).catch(() => {});
    const preference = AccessibilityInfo.addEventListener("reduceMotionChanged", (value) => {
      preferenceChanged = true;
      reduced = value;
      if (reduced) finish();
      else start();
    });
    const app = AppState.addEventListener("change", handleAppState);
    return () => {
      disposed = true;
      running = false;
      activeSince = null;
      cancelAnimation(progress);
      preference.remove();
      app.remove();
    };
  }, [progress]);

  return (
    <View style={s.root} accessibilityRole="progressbar" accessibilityLabel="Loading Overtaek">
      <View style={{ width: markWidth, height: markHeight, overflow: "hidden" }} accessible={false}>
        {FINAL_WORDS.map((word, i) => (
          <LogoRaceWordLayer
            key={i}
            slotIndex={i}
            word={word.word}
            y={word.y}
            width={word.width}
            echo={word.echo}
            scale={scale}
            scaleValue={scaleValue}
            progress={progress}
            color={word.echo ? c.tennis : c.ink}
          />
        ))}
      </View>
      <View style={s.wait}>{waiting && <><ActivityIndicator color={c.ink} /><Text style={s.label}>Loading…</Text></>}</View>
    </View>
  );
}
const sThemes = createThemedStyles(themeColors=>{const c=themeColors;return {
  root: { flex: 1, alignItems: "center", justifyContent: "center", gap: 28, paddingHorizontal: 12, paddingVertical: 24, backgroundColor: c.paper },
  wait: { minHeight: 52, alignItems: "center", gap: 12 },
  label: { ...textStyle("caption"), color: c.muted },
};});
