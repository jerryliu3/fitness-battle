import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";

/** Start still until the device preference is known. */
export function useReducedMotion() {
  const [reduced, setReduced] = useState(true);
  useEffect(() => {
    let alive = true;
    let changed = false;
    void AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        if (alive && !changed) setReduced(value);
      })
      .catch(() => {});
    const subscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      (value) => {
        changed = true;
        setReduced(value);
      },
    );
    return () => {
      alive = false;
      subscription.remove();
    };
  }, []);
  return reduced;
}
