import { useEffect, useRef, useState, type ReactNode } from "react";
import { Animated } from "react-native";
import { useReducedMotion } from "./use-reduced-motion";

/** Retain the outgoing full-screen content until its fade finishes. */
export function ScreenFade({ identity, children }: { identity: string; children: ReactNode }) {
  const reduced = useReducedMotion();
  const opacity = useRef(new Animated.Value(1)).current;
  const latest = useRef(children);
  latest.current = children;
  const [shown, setShown] = useState({ identity, children });
  const outgoing = useRef(children);
  if (shown.identity === identity) outgoing.current = children;
  const shownIdentity = useRef(identity);
  shownIdentity.current = shown.identity;
  useEffect(() => {
    if (identity === shownIdentity.current) { opacity.setValue(1); return; }
    if (reduced) {
      opacity.setValue(1);
      setShown({ identity, children: latest.current });
      return;
    }
    const fade = Animated.timing(opacity, { toValue: 0, duration: 120, useNativeDriver: true });
    fade.start(({ finished }) => { if (finished) setShown({ identity, children: latest.current }); });
    return () => fade.stop();
  }, [identity, reduced, opacity]);
  useEffect(() => {
    const fade = Animated.timing(opacity, { toValue: 1, duration: reduced ? 0 : 180, useNativeDriver: true });
    fade.start();
    return () => fade.stop();
  }, [shown.identity, reduced, opacity]);
  return <Animated.View pointerEvents={shown.identity === identity ? "auto" : "none"} style={{ flex: 1, opacity }}>
    {shown.identity === identity ? children : outgoing.current}
  </Animated.View>;
}
