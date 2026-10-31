import { createContext, useCallback, useEffect, useState, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { BootSplash } from "./boot-splash";

// Providers and screens mount only after the moving part of startup finishes.
// Keep the same splash mounted so its final frame survives that expensive mount.
export const LaunchReadyContext = createContext<(() => void) | null>(null);

export function LaunchGate({ children }: { children: ReactNode }) {
  const [animationDone, setAnimationDone] = useState(false);
  const [mountApp, setMountApp] = useState(false);
  const [ready, setReady] = useState(false);
  const reveal = useCallback(() => setReady(true), []);
  useEffect(() => {
    if (!animationDone) return;
    // Let the final logo and spinner paint before mounting expensive providers.
    let second = 0;
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => setMountApp(true));
    });
    return () => { cancelAnimationFrame(first); cancelAnimationFrame(second); };
  }, [animationDone]);
  return <LaunchReadyContext.Provider value={reveal}>
    <View style={{ flex: 1 }}>
      {mountApp ? children : null}
      {!ready && <View style={StyleSheet.absoluteFill}>
        <BootSplash waiting={animationDone} onAnimationComplete={() => setAnimationDone(true)} />
      </View>}
    </View>
  </LaunchReadyContext.Provider>;
}
