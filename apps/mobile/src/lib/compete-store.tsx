import { useCompetitionExperience } from "./use-competition-experience";
import { useSyncReviewGate } from "./use-sync-review";
import {
  applyDebugEvent,
  isSupabaseConfigured,
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
  momentStorageKey,
  seenFieldFromState,
  SPORTS,
  type Action,
  type Activity,
  type CompeteState,
  type DebugEventId,
  type DebugEventResult,
  type FieldNotice,
} from "@fitness-battle/shared";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { usePathname, useRouter } from "expo-router";
import {
  lazy,
  Suspense,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AppState, Text, Pressable, View } from "react-native";
import {
  accountStorageKeys,
  hydrateAccountIdentity,
  saveFailure,
} from "./account-state";
import { SHELL_COLORS } from "../theme";
import { useAuth } from "./auth";
import { mobileEnv } from "./env";
import { fetchWithTimeout } from "./fetch-with-timeout";
import { canOpenCompeteNotice } from "./navigation";
import { supabase } from "./supabase";
import { clearApiReads, apiReadScope, invalidateApiReads } from "./api-read-cache";
import type { CompeteLoadStatus } from "@fitness-battle/shared/boot";

const SyncReview = lazy(() =>
  import("../features/sync-review").then((m) => ({ default: m.SyncReview })),
);

const STORAGE_KEY = "fb-compete-v1";
const SEEN_KEY = "fb-counted-seen";
const DIRTY_KEY = "fb-compete-dirty";

export type AccountLoadStatus = CompeteLoadStatus;

interface CompeteContextValue {
  canWrite: boolean;
  loadStatus: AccountLoadStatus;
  state: CompeteState | null;
  accountKey: string;
  readBaselineItem: (key: string) => string | null;
  writeBaselineItem: (key: string, value: string) => void;
  dispatch: (action: Action) => void;
  previewSyncReview?: () => void;
  beginSyncReviewBatch?: (accountId?: string) => void;
  endSyncReviewBatch?: (accountId?: string) => void;
  returnGain: number;
  clearReturn: () => void;
  fieldNotice: FieldNotice | null;
  dismissFieldNotice: () => void;
  standingsStale: boolean;
  refresh: (options?: { ifStale?: boolean }) => Promise<boolean>;
  saveError: string | null;
  retrySave: () => void;
  clearAccountData: (expectedId: string) => Promise<boolean>;
  debugActive?: boolean;
  triggerDebugEvent?: (event: DebugEventId) => DebugEventResult | null;
  resetDebugState?: () => void;
}

async function competeAccount(): Promise<{
  userId: string;
  token: string;
} | null> {
  if (!isSupabaseConfigured(mobileEnv.supabaseUrl, mobileEnv.supabaseAnonKey)) return null;
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
  const pairs = await AsyncStorage.multiGet([...keys, ...keys.map(momentStorageKey)]);
  for (const [key, value] of pairs) {
    if (value != null && !cache.has(key)) cache.set(key, value);
  }
}

export function CompeteProvider({ children, navigationReady = true }: { children: ReactNode; navigationReady?: boolean }) {
  const navigationReadyRef = useRef(navigationReady);
  navigationReadyRef.current = navigationReady;
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;
  const router = useRouter();
  const auth = useAuth();
  const authRef = useRef(auth);
  authRef.current = auth;
  const owner = auth.user?.id ?? null;
  // Clear before child passive effects start their new session's prefetches.
  useLayoutEffect(() => { clearApiReads(); }, [owner, auth.offlineMode]);
  const keys = accountStorageKeys(owner);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [loadStatus, setLoadStatus] = useState<AccountLoadStatus>("loading");
  const loadReady = useRef(false);
  const hydrationPending = useRef(true);
  const markLoadReady = (ready: boolean) => {
    loadReady.current = ready;
  };
  const lifecycle = useRef(0);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const saveChain = useRef<Promise<void>>(Promise.resolve());

  const [savedState, setState] = useState<CompeteState | null>(null);
  const syncReviewBlocked = useRef(false);
  const holdRemoteRef = useRef<(next: CompeteState) => CompeteState>(next => next);
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
  const unitsUnsavedRef = useRef(false);
  const revisionRef = useRef<string | null>(null);
  const conflictRef = useRef(false);
  const [saveConflict, setSaveConflict] = useState(false);
  const refreshFlight = useRef<Promise<boolean> | null>(null);
  const lastRefresh = useRef(0);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debugActive, setDebugActive] = useState(false);
  const debugActiveRef = useRef(false);
  const debugStepRef = useRef(0);
  const preDebugStateRef = useRef<CompeteState | null>(null);
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
    debugActiveRef.current = false;
    preDebugStateRef.current = null;
    setDebugActive(false);
    revisionRef.current = null;
    conflictRef.current = false;
    setSaveConflict(false);
    markLoadReady(false);
    hydrationPending.current = true;
    setLoadStatus("loading");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = null;
    refreshFlight.current = null;
    lastRefresh.current = 0;
    unsavedRef.current = false;
    unitsUnsavedRef.current = false;
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
      let next = rollClock(freshState());
      let hasCache = false;
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (isCompeteState(parsed)) {
            next = rollClock(migrateCompeteState(parsed));
            hasCache = true;
          }
        } catch {
          /* A corrupt local copy starts clean. */
        }
      }
      if (
        authRef.current.offlineMode && authRef.current.user?.dataOrigin === "synthetic" &&
        authRef.current.user
      ) {
        const seed = getDemoCompeteState(authRef.current.user.email.split("@")[0]);
        if (seed) {
          if (!raw) {
            next = seed;
          } else {
            const existingIds = new Set(next.activities.map((a) => a.id));
            const missing = seed.activities.filter((a) => !existingIds.has(a.id));
            if (missing.length > 0) {
              next = { ...next, activities: [...next.activities, ...missing] };
              void AsyncStorage.setItem(keys.state, JSON.stringify(next));
            }
          }
        }
      }
      if (process.env.NODE_ENV === "development" && authRef.current.offlineMode && authRef.current.user?.dataOrigin === "synthetic") {
        try {
          const response = await fetchWithTimeout(`${mobileEnv.apiUrl}/api/dev/route-seed?account=${encodeURIComponent(authRef.current.user.email)}`, {}, 2500);
          const body = response.ok ? await response.json() as { activities?: Activity[] } : null;
          if (!alive || accountRef.current !== owner) return;
          const existing = new Map(next.activities.map(a => [a.id, a]));
          const incoming = (body?.activities ?? []).filter(a => a.id.startsWith("local-route-"));
          const ids = new Set(incoming.map(a => a.id));
          next = { ...next, activities: [...next.activities.filter(a => !ids.has(a.id)), ...incoming.map(a => ({ ...a, disposition: existing.get(a.id)?.disposition ?? a.disposition }))] };
        } catch { /* Optional local fixtures; ordinary offline state remains available. */ }
      }
      const dirty = (await AsyncStorage.getItem(keys.dirty)) === "1";
      const currentAuth = authRef.current;
      const live =
        !!currentAuth.user &&
        !currentAuth.offlineMode;
      let remoteLoaded = false;
      // Render this account's durable snapshot while validating the server revision.
      // Writes and competition reveals remain gated by loadReady until that succeeds.
      if (hasCache && live && alive && accountRef.current === owner) {
        const cached = hydrateAccountIdentity(next, currentAuth.user, live);
        loadedOwnerRef.current = owner;
        stateRef.current = cached;
        setState(cached);
        setStandingsStale(true);
      }
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
          if (!alive || accountRef.current !== owner) return;
          const cachedRevision = await AsyncStorage.getItem(
            `${keys.state}:revision`,
          );
          if (!alive || accountRef.current !== owner) return;
          revisionRef.current = dirty
            ? cachedRevision
            : (body.updatedAt ?? null);
          if (
            dirty &&
            cachedRevision &&
            body.updatedAt &&
            cachedRevision !== body.updatedAt
          ) {
            conflictRef.current = true;
            setSaveConflict(true);
          }
          if (!dirty && body.updatedAt)
            await AsyncStorage.setItem(
              `${keys.state}:revision`,
              body.updatedAt,
            );
          if (body.state !== null && !isCompeteState(body.state))
            throw new Error("invalid_snapshot");
          if (isCompeteState(body.state))
            next = applyRemoteSnapshot(
              next,
              rollClock(migrateCompeteState(body.state)),
              dirty,
              unitsUnsavedRef.current,
            );
          if (alive) {
            remoteLoaded = true;
            setStandingsStale(false);
          }
        } catch {
          if (alive) {
            setLoadStatus("failed");
            setStandingsStale(true);
            setSaveError(
              "Your account could not load. Refresh your account before making changes.",
            );
          }
        }
      }
      if (!live) {
        setLoadStatus("local");
        markLoadReady(true);
      }
      if (!alive || accountRef.current !== owner) return;
      next = hydrateAccountIdentity(next, currentAuth.user, live);
      await preloadBaselineCache(owner ?? "guest", baselineCacheRef.current);
      if (!alive || accountRef.current !== owner) return;
      unsavedRef.current = dirty;
      if (dirty && live && remoteLoaded) {
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
      hydrationPending.current = false;
      if (remoteLoaded) {
        markLoadReady(true);
        lastRefresh.current = Date.now();
        setLoadStatus("ready");
      }
      setState(next);
    })().catch(() => {
      if (alive) {
        hydrationPending.current = false;
        loadedOwnerRef.current = owner;
        setLoadStatus("failed");
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
    auth.offlineMode,
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
          if (navigationReadyRef.current && canOpenCompeteNotice(pathnameRef.current))
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

  const refresh = useCallback(async (options?: { ifStale?: boolean }): Promise<boolean> => {
    if (syncReviewBlocked.current) return false;
    if (debugActiveRef.current) return true;
    if (hydrationPending.current) return false;
    if (options?.ifStale && Date.now() - lastRefresh.current < FIELD_REFRESH_MS) return true;
    const account = await competeAccount();
    if (debugActiveRef.current) return true;
    if (!stateRef.current) return false;
    if (!account) return true;
    if (account.userId !== accountRef.current) return false;
    if (refreshFlight.current) return refreshFlight.current;
    const generation = dirtyRef.current;
    const epoch = lifecycle.current;
    const task = (async () => {
      try {
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
        const body = (await response.json()) as {
          state?: unknown;
          updatedAt?: string | null;
        };
        if (debugActiveRef.current || syncReviewBlocked.current) return false;
        if (
          body.state === null &&
          account.userId === accountRef.current &&
          epoch === lifecycle.current
        ) {
          markLoadReady(true);
          setLoadStatus("ready");
          lastRefresh.current = Date.now();
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
        if (syncReviewBlocked.current || debugActiveRef.current)
          return false;
        const remote = rollClock(migrateCompeteState(body.state));
        let dirty =
          unsavedRef.current ||
          dirtyRef.current !== generation ||
          saveTimer.current != null;
        if (!dirty && !conflictRef.current) {
          revisionRef.current = body.updatedAt ?? null;
          if (body.updatedAt)
            await AsyncStorage.setItem(
              `${accountStorageKeys(account.userId).state}:revision`,
              body.updatedAt,
            );
          if (
            account.userId !== accountRef.current ||
            epoch !== lifecycle.current || debugActiveRef.current
          )
            return false;
          // Storage yields to user edits; preserve anything dispatched while it was pending.
          dirty =
            unsavedRef.current ||
            dirtyRef.current !== generation ||
            saveTimer.current != null;
        }
        const snapshot = applyRemoteSnapshot(
          stateRef.current,
          remote,
          dirty,
          unitsUnsavedRef.current,
        );
        const next = holdRemoteRef.current(snapshot);
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
        markLoadReady(true);
        setLoadStatus("ready");
        if (!unsavedRef.current) setSaveError(null);
        setStandingsStale(false);
        lastRefresh.current = Date.now();
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
    if (!state || !loadReady.current || !navigationReady) return;
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
        if (canOpenCompeteNotice(pathname)) {
          router.navigate("/arena");
        }
      }
    });
    return () => {
      alive = false;
    };
  }, [pathname, router, state, navigationReady]);

  const scheduleSave = useCallback((next: CompeteState, immediate = false, force = false) => {
    if (debugActiveRef.current) return;
    const id = accountRef.current;
    const scoped = accountStorageKeys(id);
    const generation = dirtyRef.current;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    const run = () => {
      saveChain.current = saveChain.current
        .catch(() => {})
        .then(async () => {
          if (
            id !== accountRef.current ||
            generation !== dirtyRef.current ||
            conflictRef.current
          )
            return;
          const currentAuth = authRef.current;
          if (
            !currentAuth.user ||
            currentAuth.offlineMode
          )
            return;
          if (!loadReady.current && !force) {
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
                body: JSON.stringify({
                  state: next,
                  accountId: id,
                  updatedAt: revisionRef.current,
                }),
              },
            );
            if (id !== accountRef.current) return;
            if (!response.ok) {
              const body = await response.json().catch(() => null);
              if (
                body?.error === "account_changed_reload" ||
                body?.error === "account_version_required"
              ) {
                conflictRef.current = true;
                setSaveConflict(true);
              }
              const message = saveFailure(body?.error);
              if (message) setSaveError(message);
              return;
            }
            const body = await response.json();
            if (id !== accountRef.current) return;
            if (typeof body.updatedAt !== "string")
              throw new Error("missing_revision");
            revisionRef.current = body.updatedAt;
            await AsyncStorage.setItem(
              `${scoped.state}:revision`,
              body.updatedAt,
            );
            if (id !== accountRef.current || generation !== dirtyRef.current)
              return;
            unsavedRef.current = false;
            unitsUnsavedRef.current = false;
            invalidateApiReads(apiReadScope(mobileEnv.apiUrl, account.token));
            setSaveError(null);
            await AsyncStorage.removeItem(scoped.dirty);
          } catch {
            if (id === accountRef.current) {
              const message = saveFailure();
              if (message) setSaveError(message);
            }
          }
        });
    };
    if (immediate) {
      run();
      return;
    }
    saveTimer.current = setTimeout(() => {
      saveTimer.current = null;
      run();
    }, 400);
  }, []);

  const dispatch = useCallback(
    (action: Action) => {
      const prev = stateRef.current;
      if (!prev) return;
      if (
        !loadReady.current &&
        authRef.current.user &&
        !authRef.current.offlineMode &&
        (action.type !== "set-avatar" || hydrationPending.current)
      ) {
        setSaveError(
          "Your account could not load. Refresh your account before making changes.",
        );
        return;
      }
      const id = accountRef.current;
      if (action.accountId && action.accountId !== id) return;
      if (debugActiveRef.current) {
        const next = reduceCompete(prev, {
          ...action,
          accountId: action.accountId ?? id ?? undefined,
        });
        stateRef.current = next;
        setState(next);
        return;
      }
      dirtyRef.current += 1;
      unsavedRef.current = true;
      if (action.type === "set-units") unitsUnsavedRef.current = true;
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
        undefined,
        action.syncPresentation === "quiet",
      );
      if (action.syncPresentation === "quiet")
        remember(countedActivityIds(next), true);
      const scoped = accountStorageKeys(id);
      void AsyncStorage.multiSet([
        [scoped.state, JSON.stringify(next)],
        [scoped.dirty, "1"],
      ]).catch(() => setSaveError("Could not save on this device."));
      scheduleSave(
        next,
        action.type === "set-units" || action.type === "set-avatar",
        action.type === "set-avatar" && !loadReady.current,
      );
    },
    [readBaselineItem, writeBaselineItem, scheduleSave, remember],
  );

  const experience = useCompetitionExperience(
    loadReady.current ? state : null, accountRef.current ?? "guest", readBaselineItem, (key, value) => { if (!debugActiveRef.current) writeBaselineItem(key, value); },
  );
  const syncReview = useSyncReviewGate(
    dispatch,
    loadReady.current ? state : null,
    accountRef.current ?? null,
    syncReviewBlocked,
    experience.observe,
  );
  holdRemoteRef.current = syncReview.holdRemote;

  const retrySave = useCallback(() => {
    if (conflictRef.current) {
      const id = accountRef.current;
      const scoped = accountStorageKeys(id);
      void AsyncStorage.setItem(
        `${scoped.state}:recovery`,
        JSON.stringify(stateRef.current),
      )
        .then(() => AsyncStorage.removeItem(scoped.dirty))
        .then(() => {
          if (accountRef.current !== id) return;
          conflictRef.current = false;
          setSaveConflict(false);
          unsavedRef.current = false;
          dirtyRef.current += 1;
          setLoadAttempt((value) => value + 1);
        })
        .catch(() =>
          setSaveError("Could not preserve the local draft. Try again."),
        );
      return;
    }
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
      markLoadReady(false);
    }
    await saveChain.current.catch(() => {});
    const scoped = accountStorageKeys(expectedId);
    const all = await AsyncStorage.getAllKeys();
    // Capture exact owned keys before awaiting; never clear a newly selected account.
    const owned = all.filter(
      (key) =>
        key === fieldSeenStorageKey(expectedId) ||
        key.startsWith(`fb-arena-baseline:${expectedId}:`) ||
        key.startsWith(`moment:v1:fb-arena-baseline:${expectedId}:`),
    );
    await AsyncStorage.multiRemove([
      scoped.state,
      `${scoped.state}:revision`,
      `${scoped.state}:recovery`,
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
    clearApiReads();
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

  const triggerDebugEvent = useCallback(
    (event: DebugEventId): DebugEventResult | null => {
      const accountKey = accountRef.current ?? "guest";
      const current = stateRef.current ?? rollClock(freshState());
      if (!preDebugStateRef.current) preDebugStateRef.current = stateRef.current;
      debugActiveRef.current = true;
      setDebugActive(true);
      const result = applyDebugEvent(event.startsWith("sync-") ? { ...current, primary: "running" } : current, event, accountKey, (debugStepRef.current += 1));
      loadedOwnerRef.current = owner;
      markLoadReady(true);
      syncReview.reset();
      if (event.startsWith("sync-")) {
        const activities = result.state.activities.filter(a => a.id.startsWith("debug-") && !current.activities.some(old => old.id === a.id));
        const ids = new Set(activities.map(a => a.id));
        const base = { ...result.state, activities: result.state.activities.filter(a => !ids.has(a.id)) };
        experience.clear(base);
        stateRef.current = base;
        setState(base);
        syncReview.stage(activities, [{ type: "apply-sync", provider: "strava", activities }], () => experience.prime(result.baselines), base);
      } else {
        experience.prime(result.baselines);
        stateRef.current = result.state;
        setState(result.state);
      }
      return result;
    },
    [owner, writeBaselineItem],
  );

  const resetDebugState = useCallback(() => {
    const prior = preDebugStateRef.current;
    preDebugStateRef.current = null;
    debugActiveRef.current = false;
    setDebugActive(false);
    syncReview.reset();
    experience.clear(prior ?? undefined);
    if (!prior) return;
    stateRef.current = prior;
    setState(prior);
  }, []);

  return (
    <CompeteContext.Provider
      value={{
        canWrite: Boolean(state) && (loadStatus === "ready" || loadStatus === "local" || debugActive) && !auth.loading,
        loadStatus,
        state,
        accountKey: accountRef.current ?? "device",
        readBaselineItem,
        writeBaselineItem,
        dispatch: syncReview.dispatch,
        previewSyncReview: syncReview.preview,
        beginSyncReviewBatch: syncReview.begin,
        endSyncReviewBatch: syncReview.end,
        returnGain,
        clearReturn,
        fieldNotice,
        dismissFieldNotice,
        standingsStale,
        refresh,
        saveError,
        retrySave,
        clearAccountData,
        debugActive,
        triggerDebugEvent,
        resetDebugState,
      }}
    >
      {saveConflict && (
        <View
          accessibilityRole="alert"
          style={{ padding: 16, backgroundColor: SHELL_COLORS.tennis }}
        >
          <Text>
            Your account changed elsewhere. Reload to use the current account.
            Your local draft will be kept on this device as a recovery copy.
          </Text>
          <Pressable accessibilityRole="button" onPress={retrySave}>
            <Text>Reload account</Text>
          </Pressable>
        </View>
      )}
      {children}
      {(syncReview.receipt || experience.moment) && state ? (
        <Suspense
          fallback={
            <Text accessibilityLiveRegion="polite">Opening today’s recap…</Text>
          }
        >
          <SyncReview
            key={accountRef.current ?? "guest"}
            debug={debugActive}
            receipt={syncReview.receipt}
            moment={experience.moment}
            remaining={experience.remaining}
            onAcknowledge={experience.acknowledge}
            state={state}
            onComplete={syncReview.finish}
          />
        </Suspense>
      ) : null}
    </CompeteContext.Provider>
  );
}

export function useCompeteFieldRefresh(active: boolean) {
  const { refresh, state, loadStatus } = useCompeteStore();
  const ready = state != null && loadStatus !== "loading";
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
      void refresh({ ifStale: true }).then((ok) => {
        if (stopped) return;
        delay = ok ? FIELD_REFRESH_MS : Math.min(delay * 2, 5 * 60_000);
        timer = setTimeout(tick, delay);
      });
    };
    void refresh({ ifStale: true });
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
