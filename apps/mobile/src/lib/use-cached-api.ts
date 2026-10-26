import { useCallback, useEffect, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import { AppState } from "react-native";
import { useAuth } from "./auth";
import { requestApi } from "./api";
import { apiReadScope, peekApiRead, subscribeApiReads } from "./api-read-cache";
import { mobileEnv } from "./env";

export const TAB_READ_TTL = 60_000;

/** Immediate cached render; focus/resume revalidate only when stale. Writes invalidate. */
export function useCachedApi<T>(path: string | null) {
  const { user, accessToken, offlineMode } = useAuth();
  const token = user && !offlineMode ? accessToken : null;
  const scope = token ? apiReadScope(mobileEnv.apiUrl, token) : "";
  const key = JSON.stringify([scope, path]);
  const currentKey = useRef(key);
  currentKey.current = key;
  const sequence = useRef(0);
  const [result, setResult] = useState<{ key: string; data?: T; error: string; busy: boolean }>({ key: "", error: "", busy: false });
  const cached = scope && path ? peekApiRead<T>(scope, path) : undefined;
  const reload = useCallback(async () => {
    if (!token || !path) return false;
    const attempt = ++sequence.current;
    setResult(previous => ({ key, data: previous.key === key ? previous.data : peekApiRead<T>(scope, path), error: "", busy: true }));
    try {
      const data = await requestApi<T>(mobileEnv.apiUrl, token, path, { cacheMs: TAB_READ_TTL });
      if (currentKey.current !== key || attempt !== sequence.current) return false;
      setResult({ key, data, error: "", busy: false });
      return true;
    } catch (error) {
      if (currentKey.current === key && attempt === sequence.current)
        setResult(previous => ({ ...previous, key, error: error instanceof Error ? error.message : "Could not load data.", busy: false }));
      return false;
    }
  }, [key, scope, token, path]);
  useEffect(() => {
    void reload();
    const unsubscribe = scope ? subscribeApiReads(scope, changedPath => {
      if (!changedPath) void reload();
      else if (changedPath === path && currentKey.current === key)
        setResult({ key, data: peekApiRead<T>(scope, changedPath), error: "", busy: false });
    }) : () => {};
    return () => { sequence.current++; unsubscribe(); };
  }, [reload, scope, path, key]);
  useFocusEffect(useCallback(() => {
    void reload();
    const subscription = AppState.addEventListener("change", status => {
      if (status === "active") void reload();
    });
    return () => subscription.remove();
  }, [reload]));
  const active = result.key === key ? result : undefined;
  return { data: scope && path ? active?.data ?? cached : undefined, error: active?.error ?? "", busy: active?.busy ?? false, reload };
}
