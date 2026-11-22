import { createContext, useCallback, useMemo, useState, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { BootOpenedContext } from "./boot-readiness";
import { BootSplash } from "./boot-splash";

// Mount providers and screens immediately in the background while keeping the
// launch animation running smoothly on top until both animation and data finish.
export const LaunchReadyContext = createContext<{ animationDone: boolean; reveal: () => void } | null>(null);

export function LaunchGate({
  children,
  splashReady = true,
  fallback = null,
}: {
  children: ReactNode;
  splashReady?: boolean;
  fallback?: ReactNode;
}) {
  const [animationDone, setAnimationDone] = useState(false);
  const [ready, setReady] = useState(false);
  const reveal = useCallback(() => setReady(true), []);
  const launch = useMemo(() => ({ animationDone, reveal }), [animationDone, reveal]);
  return <BootOpenedContext.Provider value={ready}>
    <LaunchReadyContext.Provider value={launch}>
      <View style={{ flex: 1 }}>
        {children}
        {!ready && <View style={StyleSheet.absoluteFill}>
          {splashReady ? (
            <BootSplash waiting={animationDone} onAnimationComplete={() => setAnimationDone(true)} />
          ) : fallback}
        </View>}
      </View>
    </LaunchReadyContext.Provider>
  </BootOpenedContext.Provider>;
}
