import { useCallback, useEffect, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import { AppState } from "react-native";
import { useAuth } from "./auth";
import { requestApi } from "./api";
import {
  apiReadScope,
  hydratePersistedApiRead,
  peekApiRead,
  subscribeApiReads,
  writePersistedApiRead,
} from "./api-read-cache";
import { mobileEnv } from "./env";
import { isTransportError, subscribeNetworkReconnect } from "./network";

export const TAB_READ_TTL = 5 * 60_000;

/** Immediate cached render; focus/resume revalidate only when stale. Writes invalidate. */
export function useCachedApi<T>(path: string | null) {
  const { user, accessToken, offlineMode } = useAuth();
  const token = user && !offlineMode ? accessToken : null;
  const userId = user && !offlineMode ? user.id : null;
  const scope = token ? apiReadScope(mobileEnv.apiUrl, token) : "";
  const key = JSON.stringify([scope, path]);
  const currentKey = useRef(key);
  currentKey.current = key;
  const sequence = useRef(0);
  const [result, setResult] = useState<{ key: string; data?: T; error: string; busy: boolean }>({ key: "", error: "", busy: false });
  const cached = scope && path ? peekApiRead<T>(scope, path) : undefined;
  const reload = useCallback(async (options?: { silent?: boolean }) => {
    if (!token || !path) return false;
    const attempt = ++sequence.current;
    if (!options?.silent) {
      setResult(previous => ({ key, data: previous.key === key ? previous.data : peekApiRead<T>(scope, path), error: "", busy: true }));
    }
    try {
      const data = await requestApi<T>(mobileEnv.apiUrl, token, path, { cacheMs: TAB_READ_TTL });
      if (currentKey.current !== key || attempt !== sequence.current) return false;
      if (userId) writePersistedApiRead(mobileEnv.apiUrl, userId, path, data);
      setResult({ key, data, error: "", busy: false });
      return true;
    } catch (error) {
      if (currentKey.current === key && attempt === sequence.current) {
        const fallback = peekApiRead<T>(scope, path);
        setResult(previous => {
          const existing = (previous.key === key ? previous.data : undefined) ?? fallback;
          const suppressError = existing !== undefined && isTransportError(error);
          return {
            key,
            data: existing,
            error: suppressError ? "" : error instanceof Error ? error.message : "Could not load data.",
            busy: false,
          };
        });
      }
      return false;
    }
  }, [key, scope, token, userId, path]);
  useEffect(() => {
    let alive = true;
    if (userId && scope && path && peekApiRead<T>(scope, path) === undefined) {
      void hydratePersistedApiRead<T>(mobileEnv.apiUrl, userId, scope, path).then(persisted => {
        if (!alive || persisted === undefined || currentKey.current !== key) return;
        setResult(previous => (previous.key === key && previous.data !== undefined ? previous : { key, data: persisted, error: "", busy: previous.busy }));
      });
    }
    void reload({ silent: Boolean(scope && path && peekApiRead<T>(scope, path) !== undefined) });
    const unsubscribe = scope ? subscribeApiReads(scope, changedPath => {
      if (!changedPath) void reload();
      else if (changedPath === path && currentKey.current === key)
        setResult({ key, data: peekApiRead<T>(scope, changedPath), error: "", busy: false });
    }) : () => {};
    const unsubNetwork = token && path ? subscribeNetworkReconnect(() => {
      void reload({ silent: true });
    }) : () => {};
    return () => { alive = false; sequence.current++; unsubscribe(); unsubNetwork(); };
  }, [reload, scope, userId, token, path, key]);
  useFocusEffect(useCallback(() => {
    const hasCached = scope && path ? peekApiRead<T>(scope, path) !== undefined : false;
    void reload({ silent: hasCached });
    let wasBackground = false;
    const subscription = AppState.addEventListener("change", status => {
      if (status === "background") {
        wasBackground = true;
      } else if (status === "active") {
        if (wasBackground) {
          wasBackground = false;
          void reload({ silent: true });
        }
      }
    });
    return () => subscription.remove();
  }, [reload, scope, path]));
  const active = result.key === key ? result : undefined;
  return { data: scope && path ? active?.data ?? cached : undefined, error: active?.error ?? "", busy: active?.busy ?? false, reload };
}
