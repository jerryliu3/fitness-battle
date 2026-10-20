import {
  clamp,
  type BootLayout,
} from "@fitness-battle/shared/boot";
import { EMBER_K_SIZE_EM, EMBER_LAUNCH_DURATION, emberSkidWordmarkLayout, sampleEmberSkid } from "@fitness-battle/shared/mascot";
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
 * One shared outline unfolds from K and returns to K after the flight.
 */
export function BootSplash({ waiting = false, onAnimationComplete }: BootSplashProps) {
  const { width: windowWidth } = useWindowDimensions();
  const fontSize = Math.max(32, Math.min(108, windowWidth * 0.12));
  const completed = useRef(false);
  const onCompleteRef = useRef(onAnimationComplete);
  onCompleteRef.current = onAnimationComplete;
  const [frame, setFrame] = useState(() => sampleEmberSkid(0, {returnToK:true}));
  const [homeY, setHomeY] = useState(0);
  const label = frame.eShift === 1 && frame.morph === 1 ? "OVERTAEK" : "OVERTAKE";
  const [homeX, setHomeX] = useState(0);
  const layoutRef = useRef<BootLayout>({
    overtaWidth: fontSize * 3.6,
    slotWidth: fontSize * 0.712,
    eWidth: fontSize * 0.55,
    font: fontSize,
  });
  const progressRef = useRef(0);
  const wordOriginRef = useRef(0);
  const slotCenterRef = useRef(0);
  const wordTopRef = useRef(0);
  const baselineRef = useRef(0);

  useEffect(() => {
    layoutRef.current.font = fontSize;
    layoutRef.current.slotWidth = fontSize * 0.712;
    refreshLayout();
  }, [fontSize]);

  useEffect(() => {
    let disposed = false;
    let running = false;
    let raf = 0;
    let lastPublish = 0;
    let start = 0;
    let initial = 0;
    let reduced = true;
    let preferenceReady = false;
    let preferenceChanged = false;

    void AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (preferenceChanged) return;
      preferenceReady = true;
      if (disposed) return;
      reduced = value;
      if (value) { settle(); finish(); }
      else play();
    }).catch(() => {
      if (disposed || preferenceChanged) return;
      preferenceReady = true;
      settle();
      finish();
    });
    const reduceSub = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      (value) => {
        preferenceChanged = true;
        reduced = value;
        preferenceReady = true;
        if (value) {
          settle();
          finish();
        } else {
          play();
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
      if (publishPose) setFrame(sampleEmberSkid(p, {layout:layoutRef.current,returnToK:true,reducedMotion:preferenceReady&&reduced}));
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
      if (disposed || running || completed.current || !preferenceReady) return;
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
        const next = clamp(initial + (now - start) / EMBER_LAUNCH_DURATION);
        const publish = now - lastPublish >= 1000 / 60 - 1 || next === 1;
        if (publish) lastPublish = now;
        if (publish) draw(next, true);
        else progressRef.current = next;
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

    draw(completed.current ? 1 : 0, true);
    play();

    return () => {
      disposed = true;
      pause();
      appSub.remove();
      reduceSub.remove();
    };
  }, []);

  function refreshLayout() {
    setFrame(sampleEmberSkid(progressRef.current, {layout:layoutRef.current,returnToK:true}));
  }

  function onWordLayout(event: LayoutChangeEvent) {
    const { x, y } = event.nativeEvent.layout;
    wordOriginRef.current = x;
    setHomeX(x + slotCenterRef.current);
    wordTopRef.current = y;
    setHomeY(y + baselineRef.current);
  }

  function onLettersLayout(event: LayoutChangeEvent) {
    const w = event.nativeEvent.layout.width;
    if (w > 0) {layoutRef.current.overtaWidth = w;refreshLayout();}
  }

  function onSlotLayout(event: LayoutChangeEvent) {
    const { width, x, y } = event.nativeEvent.layout;
    // A zero-height slot in a baseline-aligned row sits on the text baseline.
    baselineRef.current = y;
    setHomeY(wordTopRef.current + y);
    if (width > 0) {
      layoutRef.current.slotWidth = width;
      slotCenterRef.current = x + fontSize * 0.4085;
      setHomeX(wordOriginRef.current + slotCenterRef.current);
      refreshLayout();
    }
  }

  function onELayout(event: LayoutChangeEvent) {
    const w = event.nativeEvent.layout.width;
    if (w > 0) {layoutRef.current.eWidth = w;refreshLayout();}
  }

  const baseSize = fontSize * EMBER_K_SIZE_EM;
  const emberSize = baseSize * frame.scale;
  const letterShift = -emberSkidWordmarkLayout(layoutRef.current).eDistance * frame.eShift;
  const stageHeight = Math.max(260, Math.min(360, fontSize * 3.2));

  return (
    <View style={styles.root} accessibilityRole="progressbar" accessibilityLabel={label}>
      <View style={styles.glow} pointerEvents="none" />
      <View style={[styles.stage, { height: stageHeight }]}>
        <View style={styles.word} onLayout={onWordLayout} accessible accessibilityLabel={label}>
          <Text
            onLayout={onLettersLayout}
            style={[styles.letter, { fontSize, lineHeight: fontSize, letterSpacing: fontSize * -0.055, marginRight: fontSize * -0.055 }]}
            allowFontScaling={false}
          >
            OVERTA
          </Text>
          <View style={[styles.slot, { width: fontSize * 0.712 }]} onLayout={onSlotLayout} />
          <Text
            style={[
              styles.letter,
              {
                fontSize,
                lineHeight: fontSize,
                letterSpacing: fontSize * -0.055,
                marginLeft: fontSize * -0.055,
                transform: [{ translateX: letterShift }],
                zIndex: 2,
              },
            ]}
            onLayout={onELayout}
            allowFontScaling={false}
          >
            E
          </Text>
        </View>

        <View
          pointerEvents="none"
          style={[
            styles.emberFly,
            {
              left: homeX + frame.x,
              top: homeY + frame.y + baseSize * 55 / 360 - emberSize * 485 / 360,
              width: emberSize,
              height: emberSize * 485 / 360,
              opacity: homeX > 0 ? 1 : 0,

              zIndex: frame.depth < 0 ? 1 : 3,
              transform: [{ translateX: -emberSize / 2 }, { scaleX: frame.facing }],
            },
          ]}
        >
          <Ember pose={frame.pose} morph={frame.morph} morphConcept="crest-launch" launchFlight={frame.flight} launchCrouch={frame.crouch} launchSkid={frame.skid} skidSpray={frame.spray} shadow={false} size={emberSize} />
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
    ...StyleSheet.absoluteFill,
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
    alignItems: "baseline",
    zIndex: 2,
  },
  letter: {
    fontFamily: "NunitoSans_900Black",
    fontWeight: "900",
    color: "#fff9e9",
  },
  slot: {
    height: 0,
    position: "relative",
    overflow: "visible",
  },
  emberFly: {
    position: "absolute",
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
