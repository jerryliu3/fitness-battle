import { useEffect, useRef, type ReactNode } from "react";
import { Animated, Easing } from "react-native";
import { useReducedMotion } from "./use-reduced-motion";

/** Retains one animation owner for step changes and settings destinations. */
export function MotionStep({ identity, children }: { identity: string; children: ReactNode }) {
  const reduced = useReducedMotion();
  const progress = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    progress.setValue(reduced ? 1 : 0);
    const animation = Animated.timing(progress, { toValue: 1, duration: reduced ? 0 : 260,
      easing: Easing.out(Easing.cubic), useNativeDriver: true });
    animation.start();
    return () => animation.stop();
  }, [identity, reduced, progress]);
  return <Animated.View style={{ gap: 18, opacity: progress,
    transform: [{ translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }] }}>{children}</Animated.View>;
}
