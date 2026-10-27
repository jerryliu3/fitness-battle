import { useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { APP_TIMEZONE, competeNow, dayKey, type CompeteState } from "@fitness-battle/shared";

/** Dismissal follows the account and Eastern date, independent of suggestion changes. */
export function useDailySuggestion(account: string, state: CompeteState | null) {
  const [, tick] = useState(0);
  const day = state ? dayKey(competeNow(state), APP_TIMEZONE) : "";
  const key = `fb:daily-suggestion:${account}`;
  const scope = `${key}:${day}`;
  const memory = useRef(new Set<string>());
  const [loaded, setLoaded] = useState<{ scope: string; hidden: boolean } | null>(null);
  useEffect(() => {
    const wake = () => tick(value => value + 1);
    const timer = setInterval(wake, 60_000);
    const sub = AppState.addEventListener("change", status => { if (status === "active") wake(); });
    return () => { clearInterval(timer); sub.remove(); };
  }, []);
  useEffect(() => {
    let alive = true;
    if (day) void AsyncStorage.getItem(key).catch(() => null).then(saved => {
      if (alive) setLoaded({ scope, hidden: saved === day || memory.current.has(scope) });
    });
    return () => { alive = false; };
  }, [key, day, scope]);
  const dismiss = () => {
    memory.current.add(scope);
    setLoaded({ scope, hidden: true });
    void AsyncStorage.setItem(key, day).catch(() => { /* Keep dismissed for this mounted session. */ });
  };
  return { visible: Boolean(day && loaded?.scope === scope && !loaded.hidden), dismiss };
}
