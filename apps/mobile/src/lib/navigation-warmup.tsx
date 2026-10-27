import { useEffect, useRef } from "react";
import { usePathname, useRouter, type Href } from "expo-router";
import { AppState } from "react-native";
import { useCompeteStore } from "./compete-store";

// Tabs already mount eagerly on iOS and Android/web. Warm only likely child stacks.
export const NESTED_PREFETCH: Record<string, readonly Href[]> = {
  "/today": ["/week"],
  "/arena": ["/benchmarks"],
  "/you": ["/progress-history", "/progress-achievements"],
};

export function NavigationWarmup() {
  const pathname = usePathname();
  const router = useRouter();
  const { state, accountKey } = useCompeteStore();
  const ready = state !== null;
  const warmed = useRef(new Set<string>());
  useEffect(() => { warmed.current.clear(); }, [accountKey]);
  useEffect(() => {
    if (!ready) return;
    const destinations = NESTED_PREFETCH[pathname] ?? [];
    // Space out pre-renders so opening Home/Compete gets the first JS frames.
    const timers = destinations.map((href, index) => setTimeout(() => {
      const key = String(href);
      if (AppState.currentState !== "active" || warmed.current.has(key)) return;
      router.prefetch(href);
      warmed.current.add(key);
    }, 600 + index * 300));
    return () => timers.forEach(clearTimeout);
  }, [ready, pathname, router, accountKey]);
  return null;
}
