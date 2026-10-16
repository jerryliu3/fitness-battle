import {
  BOOT_DURATION_MS,
  bootEmberPose,
  bootFrame,
  clamp,
  type BootLayout,
} from "@fitness-battle/shared/boot";
import { type EmberPose } from "@fitness-battle/shared/mascot";
import { useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  ActivityIndicator,
  AppState,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type LayoutChangeEvent,
} from "react-native";
import { Ember } from "./mascot/ember";

type BootSplashProps = {
  /** True after the overtake animation finished but app data is still loading. */
  waiting?: boolean;
  onAnimationComplete: () => void;
};

/**
 * Product boot splash: OVERTAKE → OVERTAEK.
 * Ember morphs into a K, flies behind the word and around the O, returns in
 * front to overtake E, then crossfades into a literal K.
 */
export function BootSplash({ waiting = false, onAnimationComplete }: BootSplashProps) {
  const { width: windowWidth } = useWindowDimensions();
  const fontSize = Math.max(48, Math.min(108, windowWidth * 0.12));
  const completed = useRef(false);
  const onCompleteRef = useRef(onAnimationComplete);
  onCompleteRef.current = onAnimationComplete;
  const [pose, setPose] = useState<EmberPose>(() => bootEmberPose(0));
  const [letterShift, setLetterShift] = useState(0);
  const [emberX, setEmberX] = useState(0);
  const [emberY, setEmberY] = useState(0);
  const [emberScale, setEmberScale] = useState(1);
  const [emberFacing, setEmberFacing] = useState<1 | -1>(1);
  const [emberOpacity, setEmberOpacity] = useState(1);
  const [emberBehind, setEmberBehind] = useState(false);
  const [kOpacity, setKOpacity] = useState(0);
  const [kX, setKX] = useState(0);
  const [label, setLabel] = useState("OVERTAKE");
  const [homeX, setHomeX] = useState(0);
  const layoutRef = useRef<BootLayout>({
    overtaWidth: fontSize * 3.6,
    slotWidth: fontSize * 0.9,
    eWidth: fontSize * 0.55,
    font: fontSize,
  });
  const progressRef = useRef(0);
  const wordWidthRef = useRef(fontSize * 5);

  useEffect(() => {
    layoutRef.current.font = fontSize;
    layoutRef.current.slotWidth = fontSize * 0.9;
  }, [fontSize]);

  useEffect(() => {
    let disposed = false;
    let running = false;
    let raf = 0;
    let lastPublish = 0;
    let start = 0;
    let initial = 0;
    let reduced = false;

    void AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (!disposed) reduced = value;
    });
    const reduceSub = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      (value) => {
        reduced = value;
        if (value) {
          settle();
          finish();
        }
      },
    );

    function finish() {
      if (completed.current || disposed) return;
      completed.current = true;
      onCompleteRef.current();
    }

    function draw(progress: number, publishPose: boolean) {
      if (disposed) return;
      const p = clamp(progress);
      progressRef.current = p;
      const frame = bootFrame(p, layoutRef.current);
      setLetterShift(-layoutRef.current.slotWidth * frame.eShift);
      setEmberX(frame.x);
      setEmberY(frame.y);
      setEmberScale(frame.scale);
      setEmberFacing(frame.facing);
      setEmberOpacity(frame.emberOpacity);
      setEmberBehind(frame.depth < 0);
      setKOpacity(frame.kOpacity);
      setKX(bootFrame(1, layoutRef.current).x);
      setLabel(frame.phase === "OVERTAEK" ? "OVERTAEK" : "OVERTAKE");
      if (publishPose) {
        setPose(bootEmberPose(p, { reducedMotion: reduced }));
      }
    }

    function pause() {
      cancelAnimationFrame(raf);
      running = false;
    }

    function settle() {
      pause();
      draw(1, true);
    }

    function play() {
      if (disposed || running || completed.current) return;
      if (reduced) {
        settle();
        finish();
        return;
      }
      if (AppState.currentState !== "active") return;
      if (progressRef.current >= 1) {
        settle();
        finish();
        return;
      }
      initial = progressRef.current;
      start = performance.now();
      lastPublish = 0;
      running = true;
      function tick(now: number) {
        if (!running || disposed) return;
        const next = clamp(initial + (now - start) / BOOT_DURATION_MS);
        const publish = now - lastPublish >= 1000 / 30 || next === 1;
        if (publish) lastPublish = now;
        draw(next, publish);
        if (next < 1) raf = requestAnimationFrame(tick);
        else {
          settle();
          finish();
        }
      }
      raf = requestAnimationFrame(tick);
    }

    const appSub = AppState.addEventListener("change", (status) => {
      if (status !== "active") {
        pause();
        return;
      }
      if (completed.current || disposed) {
        draw(progressRef.current, true);
        return;
      }
      play();
    });

    draw(0, true);
    play();

    return () => {
      disposed = true;
      pause();
      appSub.remove();
      reduceSub.remove();
    };
  }, []);

  function onWordLayout(event: LayoutChangeEvent) {
    wordWidthRef.current = event.nativeEvent.layout.width;
  }

  function onLettersLayout(event: LayoutChangeEvent) {
    const w = event.nativeEvent.layout.width;
    if (w > 0) layoutRef.current.overtaWidth = w;
  }

  function onSlotLayout(event: LayoutChangeEvent) {
    const { width, x } = event.nativeEvent.layout;
    if (width > 0) {
      layoutRef.current.slotWidth = width;
      setHomeX(x + width / 2);
    }
  }

  function onELayout(event: LayoutChangeEvent) {
    const w = event.nativeEvent.layout.width;
    if (w > 0) layoutRef.current.eWidth = w;
  }

  const emberSize = fontSize * 1.16 * emberScale;
  const stageHeight = Math.max(260, Math.min(360, fontSize * 3.2));

  return (
    <View style={styles.root} accessibilityRole="progressbar" accessibilityLabel={label}>
      <View style={styles.glow} pointerEvents="none" />
      <View style={[styles.stage, { height: stageHeight }]}>
        <View style={styles.word} onLayout={onWordLayout} accessible accessibilityLabel={label}>
          <Text
            onLayout={onLettersLayout}
            style={[styles.letter, { fontSize, letterSpacing: fontSize * -0.055, marginRight: fontSize * -0.055 }]}
            maxFontSizeMultiplier={1.2}
          >
            OVERTA
          </Text>
          <View style={[styles.slot, { width: fontSize * 0.9 }]} onLayout={onSlotLayout} />
          <Text
            style={[
              styles.letter,
              {
                fontSize,
                letterSpacing: fontSize * -0.055,
                marginLeft: fontSize * -0.055,
                transform: [{ translateX: letterShift }],
                zIndex: 2,
              },
            ]}
            onLayout={onELayout}
            maxFontSizeMultiplier={1.2}
          >
            E
          </Text>
        </View>

        <View
          pointerEvents="none"
          style={[
            styles.emberFly,
            {
              left: homeX + emberX,
              bottom: -emberY,
              width: emberSize,
              height: emberSize,
              opacity: emberOpacity,
              zIndex: emberBehind ? 1 : 3,
              transform: [{ translateX: -emberSize / 2 }, { scaleX: emberFacing }],
            },
          ]}
        >
          <Ember pose={pose} shadow={false} size={emberSize} />
        </View>

        <Text
          pointerEvents="none"
          style={[
            styles.kLetter,
            {
              left: homeX + kX,
              fontSize,
              opacity: kOpacity,
              transform: [{ translateX: -fontSize * 0.35 }],
            },
          ]}
          maxFontSizeMultiplier={1.2}
        >
          K
        </Text>
      </View>
      {waiting ? (
        <View style={styles.wait}>
          <ActivityIndicator color="#ffcf47" />
          <Text style={styles.waitLabel}>Loading…</Text>
        </View>
      ) : (
        <View style={styles.spacer} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 28,
    paddingHorizontal: 12,
    paddingVertical: 24,
    backgroundColor: "#1a0f22",
  },
  glow: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#4a2a5c",
    opacity: 0.35,
    top: "18%",
    bottom: "35%",
    left: "8%",
    right: "8%",
    borderRadius: 999,
  },
  stage: {
    width: "100%",
    maxWidth: 920,
    alignItems: "center",
    justifyContent: "center",
    overflow: "visible",
  },
  word: {
    flexDirection: "row",
    alignItems: "flex-end",
    zIndex: 2,
  },
  letter: {
    fontFamily: "NunitoSans_900Black",
    fontWeight: "900",
    color: "#fff9e9",
  },
  slot: {
    position: "relative",
    overflow: "visible",
  },
  emberFly: {
    position: "absolute",
  },
  kLetter: {
    position: "absolute",
    bottom: 0,
    zIndex: 3,
    fontFamily: "NunitoSans_900Black",
    fontWeight: "900",
    color: "#fff9e9",
  },
  wait: {
    minHeight: 52,
    alignItems: "center",
    gap: 12,
  },
  waitLabel: {
    fontFamily: "DMSans_400Regular",
    fontSize: 13,
    letterSpacing: 0.5,
    color: "#fff9e9cc",
  },
  spacer: {
    minHeight: 52,
  },
});
