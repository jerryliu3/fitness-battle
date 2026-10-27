"use client";
import { useEffect, useRef, useState } from "react";
import { APP_TIMEZONE, competeNow, dayKey, type CompeteState } from "@fitness-battle/shared";

export function useDailySuggestion(account: string, state: CompeteState | null) {
  const [, tick] = useState(0);
  const day = state ? dayKey(competeNow(state), APP_TIMEZONE) : "";
  const key = `fb:daily-suggestion:${account}`;
  const scope = `${key}:${day}`;
  const memory = useRef(new Set<string>());
  const [loaded, setLoaded] = useState<{ scope: string; hidden: boolean } | null>(null);
  useEffect(() => {
    const wake = () => tick(value => value + 1);
    const timer = window.setInterval(wake, 60_000);
    window.addEventListener("focus", wake);
    document.addEventListener("visibilitychange", wake);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", wake); document.removeEventListener("visibilitychange", wake); };
  }, []);
  useEffect(() => {
    if (!day) return;
    const read = () => {
      let saved: string | null = null;
      try { saved = localStorage.getItem(key); } catch { /* Memory fallback below. */ }
      setLoaded({ scope, hidden: saved === day || memory.current.has(scope) });
    };
    read();
    const changed = (event: StorageEvent) => { if (event.key === key) read(); };
    window.addEventListener("storage", changed);
    return () => window.removeEventListener("storage", changed);
  }, [key, day, scope]);
  const dismiss = () => {
    memory.current.add(scope);
    setLoaded({ scope, hidden: true });
    try { localStorage.setItem(key, day); } catch { /* Keep dismissed for this mounted session. */ }
  };
  return { visible: Boolean(day && loaded?.scope === scope && !loaded.hidden), dismiss };
}
