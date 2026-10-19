import {
  applyRemoteSnapshot,
  arenaBaselineStorageKey,
  countedActivityIds,
  FIELD_REFRESH_MS,
  fieldChangeNotice,
  fieldSeenStorageKey,
  freshState,
  getDemoCompeteState,
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
import {
  accountStorageKeys,
  hydrateAccountIdentity,
  saveFailure,
} from "./account-state";
import { useAuth } from "./auth";
import { mobileEnv } from "./env";
import { fetchWithTimeout } from "./fetch-with-timeout";
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
  legacyState: CompeteState | null;
  recoverLegacy: (expectedId: string) => Promise<void>;
  saveError: string | null;
  retrySave: () => void;
  clearAccountData: (expectedId: string) => Promise<boolean>;
}

async function competeAccount(): Promise<{
  userId: string;
  token: string;
} | null> {
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
  const keys = SPORTS.flatMap((sport) => [
    arenaBaselineStorageKey(accountKey, sport.id, "open"),
    arenaBaselineStorageKey(accountKey, sport.id, "verified"),
  ]);
  const pairs = await AsyncStorage.multiGet(keys);
  for (const [key, value] of pairs) {
    if (value != null && !cache.has(key)) cache.set(key, value);
  }
}

export function CompeteProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const auth = useAuth();
  const authRef = useRef(auth);
  authRef.current = auth;
  const owner = auth.user?.id ?? null;
  const keys = accountStorageKeys(owner);
  const [legacyState, setLegacyState] = useState<CompeteState | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const loadReady = useRef(false);
  const lifecycle = useRef(0);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const saveChain = useRef<Promise<void>>(Promise.resolve());

  const [savedState, setState] = useState<CompeteState | null>(null);
  const loadedOwnerRef = useRef<string | null | undefined>(undefined);
  const state = loadedOwnerRef.current === owner ? savedState : null;
  const [returnGain, setReturnGain] = useState(0);
  const [fieldNotice, setFieldNotice] = useState<FieldNotice | null>(null);
  const [standingsStale, setStandingsStale] = useState(false);
  const stateRef = useRef<CompeteState | null>(null);
  const accountRef = useRef<string | null>(owner);
  accountRef.current = owner;
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
    if (auth.loading) return;
    let alive = true;
    lifecycle.current += 1;
    loadReady.current = false;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = null;
    refreshFlight.current = null;
    unsavedRef.current = false;
    dirtyRef.current += 1;
    baselineCacheRef.current.clear();
    seenRef.current = { ids: null, ready: false, opened: false };
    setState(null);
    stateRef.current = null;
    setSaveError(null);
    setFieldNotice(null);
    setReturnGain(0);
    void (async () => {
      const raw = await AsyncStorage.getItem(keys.state);
      const legacyRaw = await AsyncStorage.getItem("fb-compete-v1");
      if (alive) {
        try {
          const legacy = legacyRaw ? JSON.parse(legacyRaw) : null;
          setLegacyState(
            isCompeteState(legacy) ? migrateCompeteState(legacy) : null,
          );
        } catch {
          setLegacyState(null);
        }
      }
      let next = rollClock(freshState());
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (isCompeteState(parsed))
            next = rollClock(migrateCompeteState(parsed));
        } catch {
          /* A corrupt local copy starts clean. */
        }
      }
      if (!raw && authRef.current.demoMode && authRef.current.user) {
        next =
          getDemoCompeteState(authRef.current.user.email.split("@")[0]) ?? next;
      }
      const dirty = (await AsyncStorage.getItem(keys.dirty)) === "1";
      const currentAuth = authRef.current;
      const live =
        !!currentAuth.user &&
        !currentAuth.demoMode &&
        currentAuth.user.mode !== "demo";
      if (live) {
        try {
          const account = await competeAccount();
          if (!account || account.userId !== owner)
            throw new Error("session_changed");
          const response = await fetchWithTimeout(
            `${mobileEnv.apiUrl}/api/compete`,
            {
              headers: { Authorization: `Bearer ${account.token}` },
            },
          );
          if (!response.ok) throw new Error("load_failed");
          const body = await response.json();
          if (body.state !== null && !isCompeteState(body.state))
            throw new Error("invalid_snapshot");
          if (isCompeteState(body.state))
            next = applyRemoteSnapshot(
              next,
              rollClock(migrateCompeteState(body.state)),
              dirty,
              unsavedRef.current,
            );
          if (alive) {
            loadReady.current = true;
            setStandingsStale(false);
          }
        } catch {
          if (alive) {
            setStandingsStale(true);
            setSaveError(
              "Your account could not load. Refresh your account before making changes.",
            );
          }
        }
      }
      if (!live) loadReady.current = true;
      if (!alive || accountRef.current !== owner) return;
      next = hydrateAccountIdentity(next, currentAuth.user, live);
      await preloadBaselineCache(owner ?? "guest", baselineCacheRef.current);
      if (!alive || accountRef.current !== owner) return;
      unsavedRef.current = dirty;
      if (dirty && live && loadReady.current) {
        const message = saveFailure();
        if (message) setSaveError(message);
      }
      seedArenaBaselinesFromState(
        next,
        owner ?? "guest",
        readBaselineItem,
        writeBaselineItem,
      );
      await AsyncStorage.setItem(keys.state, JSON.stringify(next));
      if (!alive) return;
      loadedOwnerRef.current = owner;
      stateRef.current = next;
      setState(next);
    })().catch(() => {
      if (alive) {
        loadedOwnerRef.current = owner;
        setState(
          hydrateAccountIdentity(freshState(), authRef.current.user, false),
        );
        setStandingsStale(true);
      }
    });
    return () => {
      alive = false;
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [
    owner,
    auth.loading,
    auth.demoMode,
    loadAttempt,
    readBaselineItem,
    writeBaselineItem,
  ]);

  const seenRef = useRef<{
    ids: string[] | null;
    ready: boolean;
    opened: boolean;
  }>({
    ids: null,
    ready: false,
    opened: false,
  });

  const refreshingRef = useRef(false);
  const refreshRef = useRef<() => Promise<boolean>>(async () => false);
  const announcedNotice = useRef<string | null>(null);

  const remember = useCallback(
    (current: string[], announce: boolean) => {
      const seen = seenRef.current;
      if (announce && seen.ids) {
        const added = newCountedIds(seen.ids, current);
        const onField =
          stateRef.current != null &&
          seenFieldFromState(
            stateRef.current,
            accountRef.current ?? "device",
          ) != null;
        if (added.length > 0 && !onField) {
          setReturnGain(added.length);
          router.navigate("/arena");
        }
      }
      seen.ids = current;
      void AsyncStorage.setItem(
        accountStorageKeys(accountRef.current).seen,
        JSON.stringify(current),
      );
    },
    [router],
  );

  useEffect(() => {
    let alive = true;
    const id = owner;
    void AsyncStorage.getItem(keys.seen).then((raw) => {
      if (!alive || accountRef.current !== id) return;
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
        if (stateRef.current)
          remember(countedActivityIds(stateRef.current), true);
        refreshingRef.current = false;
      });
    });

    return () => {
      alive = false;
      sub.remove();
    };
  }, [remember, owner, loadAttempt]);

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
    if (account.userId !== accountRef.current) return false;
    if (refreshFlight.current) return refreshFlight.current;
    const generation = dirtyRef.current;
    const epoch = lifecycle.current;
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
        const response = await fetchWithTimeout(
          `${mobileEnv.apiUrl}/api/compete`,
          {
            headers: { Authorization: `Bearer ${account.token}` },
          },
        );
        if (!response.ok) {
          setStandingsStale(true);
          return false;
        }
        const body = (await response.json()) as { state?: unknown };
        if (
          body.state === null &&
          account.userId === accountRef.current &&
          epoch === lifecycle.current
        ) {
          loadReady.current = true;
          setStandingsStale(false);
          setSaveError(null);
          return true;
        }
        if (
          !isCompeteState(body.state) ||
          !stateRef.current ||
          account.userId !== accountRef.current ||
          epoch !== lifecycle.current
        )
          return false;
        const remote = rollClock(migrateCompeteState(body.state));
        const dirty =
          unsavedRef.current ||
          dirtyRef.current !== generation ||
          saveTimer.current != null;
        const next = applyRemoteSnapshot(
          stateRef.current,
          remote,
          dirty,
          unsavedRef.current,
        );
        seedArenaBaselinesFromState(
          next,
          account.userId,
          readBaselineItem,
          writeBaselineItem,
        );
        if (next !== stateRef.current) {
          stateRef.current = next;
          setState(next);
          void AsyncStorage.setItem(
            accountStorageKeys(account.userId).state,
            JSON.stringify(next),
          );
        }
        loadReady.current = true;
        if (!unsavedRef.current) setSaveError(null);
        setStandingsStale(false);
        return true;
      } catch {
        if (account.userId !== accountRef.current) return false;
        setStandingsStale(true);
        return false;
      } finally {
        if (account.userId === accountRef.current) refreshFlight.current = null;
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
    if (
      primaryRevealResults(state.periodResults, undefined, state.primary)
        .length > 0
    ) {
      if (next) {
        void AsyncStorage.setItem(
          fieldSeenStorageKey(accountKey),
          JSON.stringify(next),
        );
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
        void AsyncStorage.setItem(
          fieldSeenStorageKey(accountKey),
          JSON.stringify(next),
        );
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

  const scheduleSave = useCallback((next: CompeteState) => {
    const id = accountRef.current;
    const scoped = accountStorageKeys(id);
    const generation = dirtyRef.current;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveTimer.current = null;
      saveChain.current = saveChain.current
        .catch(() => {})
        .then(async () => {
          if (id !== accountRef.current || generation !== dirtyRef.current)
            return;
          const currentAuth = authRef.current;
          if (
            !currentAuth.user ||
            currentAuth.demoMode ||
            currentAuth.user.mode === "demo"
          )
            return;
          if (!loadReady.current) {
            setSaveError(
              "Your account could not load. Refresh before saving changes.",
            );
            return;
          }
          try {
            const account = await competeAccount();
            if (!account || account.userId !== id || id !== accountRef.current)
              return;
            const response = await fetchWithTimeout(
              `${mobileEnv.apiUrl}/api/compete`,
              {
                method: "PUT",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${account.token}`,
                },
                body: JSON.stringify({ state: next, accountId: id }),
              },
            );
            if (id !== accountRef.current || generation !== dirtyRef.current)
              return;
            if (!response.ok) {
              const body = await response.json().catch(() => null);
              const message = saveFailure(body?.error);
              if (message) setSaveError(message);
              return;
            }
            unsavedRef.current = false;
            setSaveError(null);
            await AsyncStorage.removeItem(scoped.dirty);
          } catch {
            if (id === accountRef.current) {
              const message = saveFailure();
              if (message) setSaveError(message);
            }
          }
        });
    }, 400);
  }, []);

  const dispatch = useCallback(
    (action: Action) => {
      const prev = stateRef.current;
      if (!prev) return;
      if (
        !loadReady.current &&
        authRef.current.user &&
        !authRef.current.demoMode
      ) {
        setSaveError(
          "Your account could not load. Refresh your account before making changes.",
        );
        return;
      }
      const id = accountRef.current;
      if (action.accountId && action.accountId !== id) return;
      dirtyRef.current += 1;
      unsavedRef.current = true;
      seedArenaBaselinesFromState(
        prev,
        id ?? "guest",
        readBaselineItem,
        writeBaselineItem,
      );
      const next = reduceCompete(prev, {
        ...action,
        accountId: action.accountId ?? id ?? undefined,
      });
      stateRef.current = next;
      setState(next);
      seedArenaBaselinesFromState(
        next,
        id ?? "guest",
        readBaselineItem,
        writeBaselineItem,
      );
      const scoped = accountStorageKeys(id);
      void AsyncStorage.multiSet([
        [scoped.state, JSON.stringify(next)],
        [scoped.dirty, "1"],
      ]).catch(() => setSaveError("Could not save on this device."));
      scheduleSave(next);
    },
    [readBaselineItem, writeBaselineItem, scheduleSave],
  );

  const recoverLegacy = useCallback(
    async (expectedId: string) => {
      if (!loadReady.current || accountRef.current !== expectedId)
        throw new Error(
          "Refresh your account before recovering device history.",
        );
      const raw = await AsyncStorage.getItem("fb-compete-v1");
      const parsed = raw ? JSON.parse(raw) : null;
      if (accountRef.current !== expectedId)
        throw new Error("Account changed. Please review the history again.");
      if (!isCompeteState(parsed) || !raw || !stateRef.current)
        throw new Error("No earlier device history is available.");
      const scoped = accountStorageKeys(expectedId);
      const next = hydrateAccountIdentity(
        rollClock(migrateCompeteState(parsed)),
        authRef.current.user,
        !authRef.current.demoMode,
      );
      await AsyncStorage.multiSet([
        [`fb-compete-legacy-backup:${expectedId}`, raw],
        [
          `fb-compete-before-recovery:${expectedId}`,
          JSON.stringify(stateRef.current),
        ],
        [scoped.state, JSON.stringify(next)],
        [scoped.dirty, "1"],
      ]);
      if (accountRef.current !== expectedId) return;
      await AsyncStorage.removeItem("fb-compete-v1");
      if (accountRef.current !== expectedId) return;
      dirtyRef.current += 1;
      unsavedRef.current = true;
      stateRef.current = next;
      setState(next);
      setLegacyState(null);
      scheduleSave(next);
    },
    [scheduleSave],
  );

  const retrySave = useCallback(() => {
    if (!loadReady.current) {
      setLoadAttempt((value) => value + 1);
      return;
    }
    if (stateRef.current) scheduleSave(stateRef.current);
  }, [scheduleSave]);
  const clearAccountData = useCallback(async (expectedId: string) => {
    if (accountRef.current === expectedId) {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      dirtyRef.current += 1;
      lifecycle.current += 1;
      loadReady.current = false;
    }
    await saveChain.current.catch(() => {});
    const scoped = accountStorageKeys(expectedId);
    const all = await AsyncStorage.getAllKeys();
    // Capture exact owned keys before awaiting; never clear a newly selected account.
    const owned = all.filter(
      (key) =>
        key === fieldSeenStorageKey(expectedId) ||
        key === `fb-compete-legacy-backup:${expectedId}` ||
        key === `fb-compete-before-recovery:${expectedId}` ||
        key.startsWith(`fb-arena-baseline:${expectedId}:`),
    );
    await AsyncStorage.multiRemove([
      scoped.state,
      scoped.dirty,
      scoped.seen,
      ...(accountRef.current === expectedId
        ? [
            "fb-compete-v1",
            "fb-compete-dirty",
            "fb-counted-seen",
            "fb-notifications-v1",
          ]
        : []),
      ...owned,
    ]);
    if (accountRef.current !== expectedId) return false;
    loadedOwnerRef.current = undefined;
    stateRef.current = null;
    setState(null);
    baselineCacheRef.current.clear();
    return true;
  }, []);

  const clearReturn = useCallback(() => setReturnGain(0), []);
  const dismissFieldNotice = useCallback(() => {
    const current = stateRef.current;
    const accountKey = accountRef.current ?? "device";
    if (current) {
      const seen = seenFieldFromState(current, accountKey);
      if (seen) {
        void AsyncStorage.setItem(
          fieldSeenStorageKey(accountKey),
          JSON.stringify(seen),
        );
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
        legacyState,
        recoverLegacy,
        saveError,
        retrySave,
        clearAccountData,
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
