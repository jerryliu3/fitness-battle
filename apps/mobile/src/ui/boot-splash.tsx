import {
  BOOT_DURATION_MS,
  bootEmberPose,
  bootFrame,
  clamp,
  type BootFlightStyle,
  type BootLayout,
} from "@fitness-battle/shared/boot";
import { type EmberKConcept, type EmberPose } from "@fitness-battle/shared/mascot";
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
  concept?: EmberKConcept;
  flightStyle?: BootFlightStyle;
  onAnimationComplete: () => void;
};

/**
 * Product boot splash: OVERTAKE → OVERTAEK.
 * The literal K in OVERTAKE topologically un-morphs into 3D Star Ember, banks
 * smoothly behind OVERTA and around the O, returns in front to overtake E, and
 * topologically morphs back into the final K of OVERTAEK.
 */
export function BootSplash({
  waiting = false,
  concept = "tucked",
  flightStyle = "orbit",
  onAnimationComplete,
}: BootSplashProps) {
  const { width: windowWidth } = useWindowDimensions();
  const fontSize = Math.max(48, Math.min(108, windowWidth * 0.12));
  const stageHeight = Math.max(260, Math.min(360, fontSize * 3.2));
  const completed = useRef(false);
  const onCompleteRef = useRef(onAnimationComplete);
  onCompleteRef.current = onAnimationComplete;
  const [pose, setPose] = useState<EmberPose>(() =>
    bootEmberPose(0, { concept, style: flightStyle }),
  );
  const [kMorph, setKMorph] = useState<number>(() => bootFrame(0).kMorph);
  const [letterShift, setLetterShift] = useState(0);
  const [letterLift, setLetterLift] = useState(0);
  const [emberX, setEmberX] = useState(0);
  const [emberY, setEmberY] = useState(0);
  const [emberScale, setEmberScale] = useState(1);
  const [emberBehind, setEmberBehind] = useState(false);
  const [label, setLabel] = useState("OVERTAKE");
  const [wordOffset, setWordOffset] = useState({ x: 0, bottom: (stageHeight - fontSize) / 2 });
  const [slotCenterInWord, setSlotCenterInWord] = useState(fontSize * 3.6 + fontSize * 0.45);
  const layoutRef = useRef<BootLayout>({
    overtaWidth: fontSize * 3.6,
    slotWidth: fontSize * 0.9,
    eWidth: fontSize * 0.55,
    font: fontSize,
  });
  const progressRef = useRef(0);

  useEffect(() => {
    layoutRef.current.font = fontSize;
    layoutRef.current.slotWidth = fontSize * 0.9;
  }, [fontSize]);

  useEffect(() => {
    let disposed = false;
    let running = false;
    let raf = 0;
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
      const frame = bootFrame(p, layoutRef.current, flightStyle);
      setLetterShift(-layoutRef.current.slotWidth * frame.eShift);
      setLetterLift(-frame.eLift);
      setEmberX(frame.x);
      setEmberY(frame.y);
      setEmberScale(frame.scale);
      setEmberBehind(frame.depth < 0);
      setLabel(frame.phase === "OVERTAEK" ? "OVERTAEK" : "OVERTAKE");
      if (publishPose) {
        setKMorph(frame.kMorph);
        setPose(
          bootEmberPose(p, {
            reducedMotion: reduced,
            concept,
            style: flightStyle,
          }),
        );
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
      running = true;
      function tick(now: number) {
        if (!running || disposed) return;
        const next = clamp(initial + (now - start) / BOOT_DURATION_MS);
        draw(next, true);
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
  }, [concept, flightStyle]);

  function onWordLayout(event: LayoutChangeEvent) {
    const { x, y, height } = event.nativeEvent.layout;
    setWordOffset({
      x,
      bottom: Math.max(0, stageHeight - (y + height)),
    });
  }

  function onLettersLayout(event: LayoutChangeEvent) {
    const w = event.nativeEvent.layout.width;
    if (w > 0) layoutRef.current.overtaWidth = w;
  }

  function onSlotLayout(event: LayoutChangeEvent) {
    const { width, x } = event.nativeEvent.layout;
    if (width > 0) {
      layoutRef.current.slotWidth = width;
      setSlotCenterInWord(x + width / 2);
    }
  }

  function onELayout(event: LayoutChangeEvent) {
    const w = event.nativeEvent.layout.width;
    if (w > 0) layoutRef.current.eWidth = w;
  }

  const emberSize = fontSize * 1.16 * emberScale;
  const homeX = wordOffset.x + slotCenterInWord;
  const homeY = wordOffset.bottom;

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
                transform: [{ translateX: letterShift }, { translateY: letterLift }],
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
              bottom: homeY - emberY - emberSize * 0.05,
              width: emberSize,
              height: emberSize,
              zIndex: emberBehind ? 1 : 3,
              transform: [{ translateX: -emberSize / 2 }],
            },
          ]}
        >
          <Ember
            pose={pose}
            kMorph={kMorph}
            kConcept={concept}
            shadow={false}
            size={emberSize}
          />
        </View>
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
