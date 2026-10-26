import { useEffect, useState, type ReactNode } from "react";
import { isCompeteDataReady } from "@fitness-battle/shared/boot";
import { useAuth } from "../lib/auth";
import { useCompeteStore } from "../lib/compete-store";
import { View, StyleSheet } from "react-native";
import { BootLoadingContext, useBootRequests } from "./boot-readiness";
import { BootSplash } from "./boot-splash";

let bootAnimationCompleted = false;

/**
 * Force the selected launch animation to finish even when local compete state
 * is already available (typical on TestFlight after AsyncStorage hydrates).
 */
export function BootGate({ children }: { children: ReactNode }) {
  const { loading: authLoading } = useAuth();
  const { state, loadStatus } = useCompeteStore();
  const [animationDone, setAnimationDone] = useState(bootAnimationCompleted);
  const dataReady = !authLoading && isCompeteDataReady(loadStatus, state);
  const [opened, setOpened] = useState(false);
  const [laidOut, setLaidOut] = useState(false);
  const { pending, report } = useBootRequests();
  useEffect(() => {
    if (opened || !dataReady || !animationDone || !laidOut || pending) return;
    let second = 0;
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => setOpened(true));
    });
    return () => { cancelAnimationFrame(first); cancelAnimationFrame(second); };
  }, [opened, dataReady, animationDone, laidOut, pending]);
  // Safety net if the splash animation callback never fires (still requires dataReady).
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!bootAnimationCompleted) {
        bootAnimationCompleted = true;
        setAnimationDone(true);
      }
    }, 10_000);
    return () => clearTimeout(timer);
  }, []);
  return <BootLoadingContext.Provider value={report}>
    <View style={{ flex: 1 }}>
      <View style={{ flex: 1 }} onLayout={() => setLaidOut(true)}
        pointerEvents={opened ? "auto" : "none"}
        accessibilityElementsHidden={!opened}
        importantForAccessibility={opened ? "auto" : "no-hide-descendants"}>
        {children}
      </View>
      {!opened && <View style={StyleSheet.absoluteFill}>
        <BootSplash
          waiting={animationDone}
          onAnimationComplete={() => { bootAnimationCompleted = true; setAnimationDone(true); }}
        />
      </View>}
    </View>
  </BootLoadingContext.Provider>;
}
