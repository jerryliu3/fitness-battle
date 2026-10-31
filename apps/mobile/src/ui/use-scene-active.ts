import { useCallback, useEffect, useState } from "react";
import { AppState } from "react-native";
import { useFocusEffect } from "expo-router";

/** Retained tabs must not keep presentation clocks running while hidden or suspended. */
export function useSceneActive() {
  const [foreground, setForeground] = useState(AppState.currentState === "active");
  const [focused, setFocused] = useState(false);
  useFocusEffect(useCallback(() => {
    setFocused(true);
    return () => setFocused(false);
  }, []));
  useEffect(() => {
    const subscription = AppState.addEventListener("change", status => setForeground(status === "active"));
    setForeground(AppState.currentState === "active");
    return () => subscription.remove();
  }, []);
  return foreground && focused;
}
