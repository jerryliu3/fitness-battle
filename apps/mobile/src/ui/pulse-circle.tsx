import { useCallback, useRef } from "react";
import { Animated, Easing } from "react-native";
import { useFocusEffect } from "expo-router";
import { Circle, type CircleProps } from "react-native-svg";
import { useReducedMotion } from "./use-reduced-motion";
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
export function PulseCircle(props: CircleProps) {
  const reduced = useReducedMotion();
  const opacity = useRef(new Animated.Value(1)).current;
  useFocusEffect(useCallback(() => {
    opacity.setValue(1);
    if (reduced) return;
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(opacity, { toValue: 0.2, duration: 850, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
      Animated.timing(opacity, { toValue: 1, duration: 850, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
    ]));
    animation.start();
    return () => animation.stop();
  }, [opacity, reduced]));
  return <AnimatedCircle {...props} opacity={opacity} />;
}
