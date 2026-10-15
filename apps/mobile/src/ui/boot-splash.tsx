import {
  BOOT_DURATION_MS,
  bootEmberPose,
  bootFrame,
  clamp,
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
 * Product boot splash: OVERTAKE → OVERTAEK with the shared vector Ember.
 * Slow ready morphs Ember into a K; the letter jump is a short, sharp pass.
 */
export function BootSplash({ waiting = false, onAnimationComplete }: BootSplashProps) {
  const { width: windowWidth } = useWindowDimensions();
  const fontSize = Math.max(48, Math.min(108, windowWidth * 0.12));
  const completed = useRef(false);
  const onCompleteRef = useRef(onAnimationComplete);
  onCompleteRef.current = onAnimationComplete;
  const [pose, setPose] = useState<EmberPose>(() => bootEmberPose(0));
  const [letterShift, setLetterShift] = useState(0);
  const [emberDx, setEmberDx] = useState(0);
  const [emberLift, setEmberLift] = useState(0);
  const [label, setLabel] = useState("OVERTAKE");
  const layoutRef = useRef({ slotWidth: fontSize * 0.9, eWidth: fontSize * 0.55, font: fontSize });
  const progressRef = useRef(0);

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
      const frame = bootFrame(p);
      const l = layoutRef.current;
      const dx = l.eWidth * frame.travel + l.font * 0.05 * frame.windup;
      const lift = l.font * 0.14 * frame.lift;
      setLetterShift(-l.slotWidth * frame.eShift);
      setEmberDx(dx);
      setEmberLift(-lift);
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

  function onELayout(event: LayoutChangeEvent) {
    const w = event.nativeEvent.layout.width;
    if (w > 0) layoutRef.current.eWidth = w;
  }

  function onSlotLayout(event: LayoutChangeEvent) {
    const w = event.nativeEvent.layout.width;
    if (w > 0) layoutRef.current.slotWidth = w;
  }

  const emberSize = fontSize * 1.16;
  const stageHeight = Math.max(220, Math.min(320, fontSize * 2.8));

  return (
    <View style={styles.root} accessibilityRole="progressbar" accessibilityLabel={label}>
      <View style={styles.glow} pointerEvents="none" />
      <View style={[styles.stage, { height: stageHeight }]}>
        <View style={styles.word} accessible accessibilityLabel={label}>
          <Text
            style={[styles.letter, { fontSize, letterSpacing: fontSize * -0.055, marginRight: fontSize * -0.055 }]}
            maxFontSizeMultiplier={1.2}
          >
            OVERTA
          </Text>
          <View style={[styles.slot, { width: fontSize * 0.9 }]} onLayout={onSlotLayout}>
            <View
              style={[
                styles.emberHost,
                { height: fontSize, transform: [{ translateX: emberDx }, { translateY: emberLift }] },
              ]}
            >
              <View
                style={[
                  styles.emberAlign,
                  {
                    width: emberSize,
                    height: emberSize,
                    marginLeft: -emberSize / 2,
                    bottom: fontSize * -0.05,
                  },
                ]}
              >
                <Ember pose={pose} shadow={false} size={emberSize} />
              </View>
            </View>
          </View>
          <Text
            style={[
              styles.letter,
              {
                fontSize,
                letterSpacing: fontSize * -0.055,
                marginLeft: fontSize * -0.055,
                transform: [{ translateX: letterShift }],
              },
            ]}
            onLayout={onELayout}
            maxFontSizeMultiplier={1.2}
          >
            E
          </Text>
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
    overflow: "hidden",
  },
  word: {
    flexDirection: "row",
    alignItems: "flex-end",
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
  emberHost: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
  },
  emberAlign: {
    position: "absolute",
    left: "50%",
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
