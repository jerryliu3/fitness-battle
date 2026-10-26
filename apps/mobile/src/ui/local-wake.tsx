import { memo, useCallback, useEffect, useId, useMemo, useState } from "react";
import { AppState, View } from "react-native";
import { useFocusEffect } from "expo-router";
import Animated, { cancelAnimation, Easing, useAnimatedProps, useSharedValue, withRepeat, withTiming, type SharedValue } from "react-native-reanimated";
import { polishedCapsuleScene, polishedWakeDuration, polishedWakeLength, POLISHED_IDENTITY, type CapsuleNode } from "@fitness-battle/shared";
import Svg, { G } from "react-native-svg";
import { drawCapsuleNode } from "./polished-racer";
import { useReducedMotion } from "./use-reduced-motion";

const AnimatedG = Animated.createAnimatedComponent(G);
const Echo = memo(function Echo({ phase, index, gold, shape }: { phase: SharedValue<number>; index: number; gold: boolean; shape: CapsuleNode }) {
  const length = polishedWakeLength(gold);
  const animatedProps = useAnimatedProps(() => {
    const progress = (phase.value + index / POLISHED_IDENTITY.echoes) % 1;
    return { matrix: [1, 0, 0, 1, 0, progress * length], opacity: .8 - (.8 - .12) * progress };
  });
  return <AnimatedG animatedProps={animatedProps}>{shape.children?.map(drawCapsuleNode)}</AnimatedG>;
});

/** Only lifecycle changes cross React; every animation frame stays on the UI thread, inside a bounded wake-only SVG, outside the field SVG. */
const WakeArt = memo(function WakeArt({ gold, animate }: { gold: boolean; animate: boolean }) {
  const phase = useSharedValue(0);
  const id = useId();
  const [defs, wake] = useMemo(() => polishedCapsuleScene(id, gold), [id, gold]);
  const fade = wake.children![0];
  const length = polishedWakeLength(gold);
  const reduced = useReducedMotion();
  const [focused, setFocused] = useState(false);
  const [foreground, setForeground] = useState(AppState.currentState === "active");
  useFocusEffect(useCallback(() => { setFocused(true); return () => setFocused(false); }, []));
  useEffect(() => {
    const subscription = AppState.addEventListener("change", state => setForeground(state === "active"));
    return () => subscription.remove();
  }, []);
  const running = animate && focused && foreground && !reduced;
  useEffect(() => {
    if (running) phase.value = withRepeat(withTiming(1, { duration: polishedWakeDuration(gold) * 1000, easing: Easing.linear }), -1, false);
    return () => { cancelAnimation(phase); phase.value = 0; };
  }, [running, phase, gold]);
  return <Svg width={80} height={length + 90} viewBox={`-40 -40 80 ${length + 90}`} style={{ position: "absolute", left: -40, top: -40 }}>
      {drawCapsuleNode(defs, 0)}
      {running ? <G {...wake.attrs}><G {...fade.attrs}>
        {fade.children!.map((shape, index) => <Echo key={index} phase={phase} index={index} gold={gold} shape={shape} />)}
      </G></G> : drawCapsuleNode(wake, 1)}
    </Svg>;
});

/** Camera/replay moves this host; the memoized original art and UI-thread clock stay mounted. */
export const LocalWake = memo(function LocalWake({ gold, x, y, angle, scale, animate = true }: {
  gold: boolean; x: number; y: number; angle: number; scale: number; animate?: boolean;
}) {
  return <View pointerEvents="none" accessible={false} style={{ position: "absolute", left: x, top: y, width: 0, height: 0,
    transform: [{ rotate: `${angle}deg` }, { scale }] }}>
    <WakeArt gold={gold} animate={animate} />
  </View>;
});
