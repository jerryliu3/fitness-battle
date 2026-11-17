import { useEffect, useRef } from "react";
import { Animated } from "react-native";
import type { AthleteCardModel, OnboardingStep } from "@fitness-battle/shared";
import { useReducedMotion } from "../ui/use-reduced-motion";
import { AthleteCrest } from "./athlete-crest";

const targets = {
  sport: { x: 55, y: 56, width: 250 },
  athlete: { x: 40, y: 56, width: 280 },
  overtake: { x: 244, y: 0, width: 100 },
  growth: { x: 244, y: 0, width: 100 },
  account: { x: 55, y: 48, width: 250 },
};

/** One scene stays mounted; only the presentation transform and in-memory model change. */
export function OnboardingAthlete({ model, step, onInteractionChange }: {
  model: AthleteCardModel; step: OnboardingStep; onInteractionChange?: (held: boolean) => void;
}) {
  const reduced = useReducedMotion();
  const target = targets[step];
  const x = useRef(new Animated.Value(target.x)).current;
  const y = useRef(new Animated.Value(target.y)).current;
  const scale = useRef(new Animated.Value(target.width / 320)).current;
  useEffect(() => {
    const options = { duration: reduced ? 0 : 380, useNativeDriver: true };
    const animation = Animated.parallel([
      Animated.timing(x, { ...options, toValue: target.x }),
      Animated.timing(y, { ...options, toValue: target.y }),
      Animated.timing(scale, { ...options, toValue: target.width / 320 }),
    ]);
    animation.start();
    return () => animation.stop();
  }, [target, reduced, x, y, scale]);
  return <Animated.View pointerEvents={step === "sport" ? "none" : "auto"} aria-hidden={step === "sport"} accessibilityElementsHidden={step === "sport"}
    importantForAccessibility={step === "sport" ? "no-hide-descendants" : "auto"}
    style={{ position: "absolute", left: 0, top: 0, width: 320, height: 430, zIndex: 20,
      opacity: step === "sport" ? 0 : 1, transformOrigin: "top left", transform: [{ translateX: x }, { translateY: y }, { scale }] }}>
    <AthleteCrest transparent model={model} active={step !== "sport"} onInteractionChange={onInteractionChange} />
  </Animated.View>;
}
