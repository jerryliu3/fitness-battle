import {
  applyRemoteSnapshot,
  arenaBaselineStorageKey,
  countedActivityIds,
  FIELD_REFRESH_MS,
  fieldChangeNotice,
  fieldSeenStorageKey,
  freshState,
  isCompeteState,
  migrateCompeteState,
  newCountedIds,
  primaryRevealResults,
  readSeenField,
  reduceCompete,
  rollClock,
  seedArenaBaselinesFromState,
  seenFieldFromState,
  SPORTS,
  type Action,
  type CompeteState,
  type FieldNotice,
} from "@fitness-battle/shared";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AppState } from "react-native";
import { mobileEnv } from "./env";
import { supabase } from "./supabase";

const STORAGE_KEY = "fb-compete-v1";
const SEEN_KEY = "fb-counted-seen";
const DIRTY_KEY = "fb-compete-dirty";

interface CompeteContextValue {
  state: CompeteState | null;
  accountKey: string;
  readBaselineItem: (key: string) => string | null;
  writeBaselineItem: (key: string, value: string) => void;
  dispatch: (action: Action) => void;
  returnGain: number;
  clearReturn: () => void;
  fieldNotice: FieldNotice | null;
  dismissFieldNotice: () => void;
  standingsStale: boolean;
  refresh: () => Promise<boolean>;
}

async function competeAccount(): Promise<{ userId: string; token: string } | null> {
  if (mobileEnv.useDemoData) return null;
  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user?.id;
  const token = data.session?.access_token;
  if (!userId || !token) return null;
  return { userId, token };
}

const CompeteContext = createContext<CompeteContextValue | null>(null);

function readIds(raw: string | null): string[] | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) && parsed.every((id) => typeof id === "string")
      ? parsed
      : null;
  } catch {
    return null;
  }
}

async function preloadBaselineCache(
  accountKey: string,
  cache: Map<string, string>,
): Promise<void> {
  const keys: string[] = [];
  for (const sport of SPORTS) {
    for (const track of ["open", "verified"] as const) {
      keys.push(arenaBaselineStorageKey(accountKey, sport.id, track));
    }
  }
  await Promise.all(
    keys.map(async (key) => {
      if (cache.has(key)) return;
      const value = await AsyncStorage.getItem(key);
      if (value != null) cache.set(key, value);
    }),
  );
}

export function CompeteProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<CompeteState | null>(null);
  const [returnGain, setReturnGain] = useState(0);
  const [fieldNotice, setFieldNotice] = useState<FieldNotice | null>(null);
  const [standingsStale, setStandingsStale] = useState(false);
  const stateRef = useRef<CompeteState | null>(null);
  const accountRef = useRef<string | null>(null);
  const baselineCacheRef = useRef<Map<string, string>>(new Map());
  const dirtyRef = useRef(0);
  const unsavedRef = useRef(false);
  const refreshFlight = useRef<Promise<boolean> | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  stateRef.current = state;

  const readBaselineItem = useCallback((key: string): string | null => {
    return baselineCacheRef.current.get(key) ?? null;
  }, []);

  const writeBaselineItem = useCallback((key: string, value: string): void => {
    baselineCacheRef.current.set(key, value);
    void AsyncStorage.setItem(key, value);
  }, []);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      let next = rollClock(freshState());
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as CompeteState;
          if (parsed.version === 1) next = rollClock(migrateCompeteState(parsed));
        } catch {
          next = rollClock(freshState());
        }
      }
      const account = await competeAccount();
      if (account) {
        accountRef.current = account.userId;
        const dirty = (await AsyncStorage.getItem(DIRTY_KEY)) === "1";
        try {
          const response = await fetch(`${mobileEnv.apiUrl}/api/compete`, {
            headers: { Authorization: `Bearer ${account.token}` },
          });
          if (response.ok) {
            const body = (await response.json()) as { state?: unknown };
            if (isCompeteState(body.state)) {
              next = applyRemoteSnapshot(
                next,
                rollClock(migrateCompeteState(body.state)),
                dirty,
              );
            }
          } else {
            setStandingsStale(true);
          }
        } catch {
          setStandingsStale(true);
        }
      }
      if (!alive) return;
      const accountKey = accountRef.current ?? "device";
      await preloadBaselineCache(accountKey, baselineCacheRef.current);
      if (!alive) return;
      seedArenaBaselinesFromState(
        next,
        accountKey,
        readBaselineItem,
        writeBaselineItem,
      );
      void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setState(next);
    })();
    return () => {
      alive = false;
    };
  }, [readBaselineItem, writeBaselineItem]);

  const seenRef = useRef<{ ids: string[] | null; ready: boolean; opened: boolean }>({
    ids: null,
    ready: false,
    opened: false,
  });

  const refreshingRef = useRef(false);
  const refreshRef = useRef<() => Promise<boolean>>(async () => false);
  const announcedNotice = useRef<string | null>(null);

  const remember = useCallback((current: string[], announce: boolean) => {
    const seen = seenRef.current;
    if (announce && seen.ids) {
      const added = newCountedIds(seen.ids, current);
      const onField =
        stateRef.current != null &&
        seenFieldFromState(stateRef.current, accountRef.current ?? "device") != null;
      if (added.length > 0 && !onField) {
        setReturnGain(added.length);
        router.navigate("/arena");
      }
    }
    seen.ids = current;
    void AsyncStorage.setItem(SEEN_KEY, JSON.stringify(current));
  }, [router]);

  useEffect(() => {
    let alive = true;
    void AsyncStorage.getItem(SEEN_KEY).then((raw) => {
      if (!alive) return;
      seenRef.current.ids = readIds(raw);
      seenRef.current.ready = true;
      const current = stateRef.current;
      if (!current || seenRef.current.opened) return;
      seenRef.current.opened = true;
      remember(countedActivityIds(current), true);
    });

    const sub = AppState.addEventListener("change", (status) => {
      if (status !== "active" || !seenRef.current.ready) return;
      refreshingRef.current = true;
      void refreshRef.current().finally(() => {
        if (stateRef.current) remember(countedActivityIds(stateRef.current), true);
        refreshingRef.current = false;
      });
    });

    return () => {
      alive = false;
      sub.remove();
    };
  }, [remember]);

  useEffect(() => {
    if (!state || !seenRef.current.ready || refreshingRef.current) return;
    const ids = countedActivityIds(state);
    if (!seenRef.current.opened) {
      seenRef.current.opened = true;
      remember(ids, true);
      return;
    }
    if (AppState.currentState === "active") remember(ids, false);
  }, [remember, state]);

  const refresh = useCallback(async (): Promise<boolean> => {
    const account = await competeAccount();
    if (!stateRef.current) return false;
    if (!account) return true;
    accountRef.current = account.userId;
    if (refreshFlight.current) return refreshFlight.current;
    const generation = dirtyRef.current;
    const task = (async () => {
      try {
        await preloadBaselineCache(account.userId, baselineCacheRef.current);
        if (stateRef.current) {
          seedArenaBaselinesFromState(
            stateRef.current,
            account.userId,
            readBaselineItem,
            writeBaselineItem,
          );
        }
        const response = await fetch(`${mobileEnv.apiUrl}/api/compete`, {
          headers: { Authorization: `Bearer ${account.token}` },
        });
        if (!response.ok) {
          setStandingsStale(true);
          return false;
        }
        const body = (await response.json()) as { state?: unknown };
        if (!isCompeteState(body.state) || !stateRef.current) return false;
        const remote = rollClock(migrateCompeteState(body.state));
        const dirty =
          unsavedRef.current ||
          dirtyRef.current !== generation ||
          saveTimer.current != null;
        const next = applyRemoteSnapshot(stateRef.current, remote, dirty);
        seedArenaBaselinesFromState(
          next,
          account.userId,
          readBaselineItem,
          writeBaselineItem,
        );
        if (next !== stateRef.current) {
          stateRef.current = next;
          setState(next);
          void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        }
        setStandingsStale(false);
        return true;
      } catch {
        setStandingsStale(true);
        return false;
      } finally {
        refreshFlight.current = null;
      }
    })();
    refreshFlight.current = task;
    return task;
  }, [readBaselineItem, writeBaselineItem]);
  refreshRef.current = refresh;

  useEffect(() => {
    if (!state) return;
    let alive = true;
    const accountKey = accountRef.current ?? "device";
    const next = seenFieldFromState(state, accountKey);
    if (primaryRevealResults(state.periodResults, undefined, state.primary).length > 0) {
      if (next) {
        void AsyncStorage.setItem(fieldSeenStorageKey(accountKey), JSON.stringify(next));
      }
      setFieldNotice(null);
      return;
    }
    if (!next) {
      setFieldNotice(null);
      return;
    }
    void AsyncStorage.getItem(fieldSeenStorageKey(accountKey)).then((raw) => {
      if (!alive) return;
      const notice = fieldChangeNotice(readSeenField(raw), next);
      if (!notice) {
        void AsyncStorage.setItem(fieldSeenStorageKey(accountKey), JSON.stringify(next));
        setFieldNotice(null);
        return;
      }
      setFieldNotice(notice);
      if (notice.personal && announcedNotice.current !== notice.title) {
        announcedNotice.current = notice.title;
        router.navigate("/arena");
      }
    });
    return () => {
      alive = false;
    };
  }, [router, state]);

  const dispatch = useCallback(
    (action: Action) => {
      dirtyRef.current += 1;
      unsavedRef.current = true;
      setState((prev) => {
        if (!prev) return prev;
        const accountKey = accountRef.current ?? "device";
        seedArenaBaselinesFromState(
          prev,
          accountKey,
          readBaselineItem,
          writeBaselineItem,
        );
        const next = reduceCompete(prev, {
          ...action,
          accountId: action.accountId ?? accountRef.current ?? undefined,
        });
        seedArenaBaselinesFromState(
          next,
          accountKey,
          readBaselineItem,
          writeBaselineItem,
        );
        void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        void AsyncStorage.setItem(DIRTY_KEY, "1");
        if (saveTimer.current) clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(() => {
          saveTimer.current = null;
          const generation = dirtyRef.current;
          void competeAccount().then((account) => {
            if (!account) {
              void AsyncStorage.removeItem(DIRTY_KEY);
              return;
            }
            void fetch(`${mobileEnv.apiUrl}/api/compete`, {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${account.token}`,
              },
              body: JSON.stringify({ state: next, accountId: account.userId }),
            }).then(async (response) => {
              if (response.ok && dirtyRef.current === generation) {
                unsavedRef.current = false;
                void AsyncStorage.removeItem(DIRTY_KEY);
                return;
              }
              if (response.ok) return;
              const body = (await response.json().catch(() => null)) as {
                error?: string;
              } | null;
              if (body?.error !== "week_still_open") setStandingsStale(true);
            });
          });
        }, 400);
        return next;
      });
    },
    [readBaselineItem, writeBaselineItem],
  );

  const clearReturn = useCallback(() => setReturnGain(0), []);
  const dismissFieldNotice = useCallback(() => {
    const current = stateRef.current;
    const accountKey = accountRef.current ?? "device";
    if (current) {
      const seen = seenFieldFromState(current, accountKey);
      if (seen) {
        void AsyncStorage.setItem(fieldSeenStorageKey(accountKey), JSON.stringify(seen));
      }
    }
    setFieldNotice(null);
  }, []);

  return (
    <CompeteContext.Provider
      value={{
        state,
        accountKey: accountRef.current ?? "device",
        readBaselineItem,
        writeBaselineItem,
        dispatch,
        returnGain,
        clearReturn,
        fieldNotice,
        dismissFieldNotice,
        standingsStale,
        refresh,
      }}
    >
      {children}
    </CompeteContext.Provider>
  );
}

export function useCompeteFieldRefresh(active: boolean) {
  const { refresh, state } = useCompeteStore();
  const ready = state != null;
  useEffect(() => {
    if (!active || !ready) return;
    let stopped = false;
    let delay = FIELD_REFRESH_MS;
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      if (AppState.currentState !== "active") {
        timer = setTimeout(tick, FIELD_REFRESH_MS);
        return;
      }
      void refresh().then((ok) => {
        if (stopped) return;
        delay = ok ? FIELD_REFRESH_MS : Math.min(delay * 2, 5 * 60_000);
        timer = setTimeout(tick, delay);
      });
    };
    void refresh();
    timer = setTimeout(tick, FIELD_REFRESH_MS);
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [active, ready, refresh]);
}

export function useCompeteStore(): CompeteContextValue {
  const value = useContext(CompeteContext);
  if (!value) throw new Error("useCompeteStore requires CompeteProvider");
  return value;
}
