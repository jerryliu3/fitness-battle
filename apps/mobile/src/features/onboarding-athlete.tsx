import { useEffect, useRef } from "react";
import { Animated, useWindowDimensions } from "react-native";
import type { AthleteCardModel } from "@fitness-battle/shared";
import { useReducedMotion } from "../ui/use-reduced-motion";
import { AppText } from "../ui/section";
import { AthleteCrest } from "./athlete-crest";

export function OnboardingAthlete({ model, label, compact = false, onInteractionChange, departing = false, onDeparted }: {
  model: AthleteCardModel; label?: string; compact?: boolean; departing?: boolean; onDeparted?: () => void; onInteractionChange?: (held: boolean) => void;
}) {
  const reduced = useReducedMotion();
  const small = useWindowDimensions().height < 740;
  const progress = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (departing) {
      if (reduced) { onDeparted?.(); return; }
      const exit = Animated.timing(progress, { toValue: 0, duration: 260, useNativeDriver: true });
      exit.start(({ finished }) => { if (finished) onDeparted?.(); });
      return () => exit.stop();
    }
    if (reduced) { progress.setValue(1); return; }
    progress.setValue(0);
    const animation = Animated.timing(progress, { toValue: 1, duration: 320, useNativeDriver: true });
    animation.start();
    return () => animation.stop();
  }, [compact, reduced, progress, departing, onDeparted]);
  if (!compact) return <Animated.View style={{ opacity: progress, transform: [{ scale: progress.interpolate({ inputRange: [0, 1], outputRange: [departing ? .24 : .86, 1] }) },
      { translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [departing ? 110 : 0, 0] }) },
      { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [departing ? -160 : 0, 0] }) },
    ] }}>
    <AthleteCrest model={model} onInteractionChange={onInteractionChange} />
  </Animated.View>;
  return <Animated.View style={{ width: small ? 124 : 144, opacity: progress, transform: [
    { translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [-24, 0] }) },
    { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [1.25, 1] }) },
  ] }}>
    <AthleteCrest compact model={model} onInteractionChange={onInteractionChange} />
    <AppText role="caption" secondary style={{ textAlign: "center" }}>{label}</AppText>
  </Animated.View>;
}
