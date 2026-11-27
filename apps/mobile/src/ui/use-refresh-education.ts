import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useRef, useState } from "react";
import { useSceneActive } from "./use-scene-active";

const LESSON_PULLS = 3;
const LESSON_DELAY_MS = 8000;

export function useRefreshEducation(screen: "home" | "compete", account: string, hasUpdates: boolean) {
  const key = `overtaek:pull-refresh:${account}:${screen}`;
  const progress = useRef({ key, count: 0, loaded: false });
  const [count, setCount] = useState<number | null>(null);
  const [dwelt, setDwelt] = useState(false);
  const active = useSceneActive();
  const eligible = __DEV__ || (count !== null && count < LESSON_PULLS);

  useEffect(() => {
    if (__DEV__) return;
    const entry = { key, count: 0, loaded: false };
    progress.current = entry;
    setCount(null);
    void AsyncStorage.getItem(key).catch(() => null).then((value) => {
      entry.loaded = true;
      const stored = Number(value);
      const pulls = entry.count;
      entry.count = Math.min(LESSON_PULLS, pulls + (Number.isInteger(stored) && stored >= 0 ? stored : 0));
      if (pulls) void AsyncStorage.setItem(key, String(entry.count)).catch(() => {});
      if (progress.current === entry) setCount(entry.count);
    });
    return () => {
      if (progress.current === entry) progress.current = { key: "", count: 0, loaded: false };
    };
  }, [key]);

  useEffect(() => {
    setDwelt(false);
    if (!active || !eligible) return;
    const timer = setTimeout(() => setDwelt(true), LESSON_DELAY_MS);
    return () => clearTimeout(timer);
  }, [active, key, eligible]);

  function recordPull() {
    if (__DEV__) return;
    const entry = progress.current;
    if (entry.key !== key || entry.count >= LESSON_PULLS) return;
    entry.count += 1;
    if (!entry.loaded) return;
    setCount(entry.count);
    void AsyncStorage.setItem(key, String(entry.count)).catch(() => {});
  }

  return {
    visible: active && dwelt && eligible && (__DEV__ || hasUpdates),
    recordPull,
  };
}
