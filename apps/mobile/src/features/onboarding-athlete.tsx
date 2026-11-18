import { useEffect, useMemo, useRef, useState } from "react";
import { Animated } from "react-native";
import type { AthleteCardModel, OnboardingStep } from "@fitness-battle/shared";
import { useReducedMotion } from "../ui/use-reduced-motion";
import { AthleteCrest } from "./athlete-crest";

const targets = {
  sport: { x: 55, y: 56, width: 250 },
  athlete: { x: 40, y: 56, width: 280 },
  overtake: { x: 244, y: 0, width: 100 },
  growth: { x: 244, y: 0, width: 100 },
  account: { x: 40, y: 48, width: 280 },
};

/** One scene stays mounted; only the layout bounds and in-memory model change. */
export function OnboardingAthlete({ model, step, onInteractionChange, layoutScale = 1 }: {
  model: AthleteCardModel; step: OnboardingStep; layoutScale?: number; onInteractionChange?: (held: boolean) => void;
}) {
  const reduced = useReducedMotion();
  const target = useMemo(() => ({ x: targets[step].x * layoutScale, y: targets[step].y * layoutScale, width: targets[step].width * layoutScale }), [step, layoutScale]);
  const x = useRef(new Animated.Value(target.x)).current;
  const y = useRef(new Animated.Value(target.y)).current;
  const width = useRef(new Animated.Value(target.width)).current;
  const [sceneWidth, setSceneWidth] = useState(target.width);
  useEffect(() => {
    const options = { duration: reduced ? 0 : 380, useNativeDriver: false };
    const animation = Animated.parallel([
      Animated.timing(x, { ...options, toValue: target.x }),
      Animated.timing(y, { ...options, toValue: target.y }),
      Animated.timing(width, { ...options, toValue: target.width }),
    ]);
    const listener = width.addListener(({ value }) => setSceneWidth(value));
    animation.start();
    return () => { animation.stop(); width.removeListener(listener); };
  }, [target, reduced, x, y, width]);
  return <Animated.View pointerEvents={step === "sport" ? "none" : "auto"} aria-hidden={step === "sport"} accessibilityElementsHidden={step === "sport"}
    importantForAccessibility={step === "sport" ? "no-hide-descendants" : "auto"}
    style={{ position: "absolute", left: x, top: y, width, height: sceneWidth / 320 * 430, zIndex: 20,
      opacity: step === "sport" ? 0 : 1 }}>
    <AthleteCrest height={sceneWidth / 320 * 430} transparent model={model} active={step !== "sport"} onInteractionChange={onInteractionChange} />
  </Animated.View>;
}
