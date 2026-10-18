"use client";

import { useAuth } from "@/components/auth-context";
import {
  applyRemoteSnapshot,
  FIELD_REFRESH_MS,
  fieldChangeNotice,
  fieldSeenStorageKey,
  freshState,
  isCompeteState,
  migrateCompeteState,
  primaryRevealResults,
  readSeenField,
  reduceCompete,
  rollClock,
  seedArenaBaselinesFromState,
  seenFieldFromState,
  withAccountEloBaseline,
  type Action,
  type CompeteState,
  type FieldNotice,
} from "@fitness-battle/shared";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

const LEGACY_KEY = "fb-compete-v1";
/** Copy of the unscoped blob after the signed-in user chooses to recover it. */
const RECOVERY_KEY = "fb-compete-v1:recovered";

/** One account-load state. Failed loads are read-only until retry succeeds. */
type LoadStatus = "local" | "loading" | "ready" | "failed";

interface CompeteApi {
  state: CompeteState | null;
  dispatch: (action: Action) => void;
  /** True when the last account save failed. */
  saveError: string | null;
  /** Unscoped pre-account history is still on this browser. */
  legacyOffer: boolean;
  loadStatus: LoadStatus;
  /** Real crew or personal movement since this browser last acknowledged the field. */
  fieldNotice: FieldNotice | null;
  /** The last field refresh failed. Lanes may be behind the server. */
  standingsStale: boolean;
  recoverLegacy: () => void;
  retryLoad: () => void;
  dismissFieldNotice: () => void;
  refresh: () => Promise<boolean>;
}

const CompeteContext = createContext<CompeteApi>({
  state: null,
  dispatch: () => {},
  saveError: null,
  legacyOffer: false,
  loadStatus: "loading",
  fieldNotice: null,
  standingsStale: false,
  recoverLegacy: () => {},
  retryLoad: () => {},
  dismissFieldNotice: () => {},
  refresh: async () => false,
});

function storageKey(userId: string | null): string {
  return userId ? `fb-compete-v1:${userId}` : "fb-compete-v1:guest";
}

function deviceOnlyKey(userId: string): string {
  return `fb-compete-v1:${userId}:device-only`;
}

function parseStored(raw: string | null): { savedAt: string; state: CompeteState } | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { savedAt?: string; state?: unknown };
    const state = isCompeteState(parsed.state)
      ? parsed.state
      : isCompeteState(parsed)
        ? parsed
        : null;
    if (!state) return null;
    return {
      savedAt: parsed.savedAt ?? new Date(0).toISOString(),
      state: rollClock(migrateCompeteState(state)),
    };
  } catch {
    return null;
  }
}

function readStorageItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch (error) {
    console.warn("Could not read compete state from local storage:", error);
    return null;
  }
}

function writeStorageItem(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* Progress remains available if device storage is disabled. */
  }
}

function readLocal(userId: string | null): { savedAt: string; state: CompeteState } {
  return (
    parseStored(readStorageItem(storageKey(userId))) ?? {
      savedAt: new Date(0).toISOString(),
      state: rollClock(freshState()),
    }
  );
}

function writeLocal(userId: string | null, state: CompeteState, savedAt: string) {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify({ savedAt, state }));
  } catch (error) {
    console.warn("Could not save compete state to local storage:", error);
  }
}

export function CompeteProvider({ children }: { children: ReactNode }) {
  const { user, loading, demoMode } = useAuth();
  const userId = user?.id ?? null;
  const [state, setState] = useState<CompeteState | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [legacyOffer, setLegacyOffer] = useState(false);
  const [loadStatus, setLoadStatus] = useState<LoadStatus>("loading");
  const [attempt, setAttempt] = useState(0);
  /** Account the current `state`/`loadStatus` belong to — cleared synchronously on switch. */
  const [loadedFor, setLoadedFor] = useState<string | null | undefined>(
    undefined,
  );
  const [fieldNotice, setFieldNotice] = useState<FieldNotice | null>(null);
  const [standingsStale, setStandingsStale] = useState(false);
  const userIdRef = useRef(userId);
  const demoRef = useRef(demoMode || user?.mode === "demo");
  const statusRef = useRef<LoadStatus>("loading");
  const stateRef = useRef<CompeteState | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queue = useRef<Action[]>([]);
  const dirtyRef = useRef(0);
  const unsavedRef = useRef(false);
  const refreshFlight = useRef<Promise<boolean> | null>(null);
  userIdRef.current = userId;
  demoRef.current = demoMode || user?.mode === "demo";

  // Drop prior-account state before children render with the new userId.
  if (!loading && loadedFor !== userId) {
    setLoadedFor(userId);
    setState(null);
    setLoadStatus("loading");
    setSaveError(null);
    statusRef.current = "loading";
    stateRef.current = null;
    queue.current = [];
    dirtyRef.current = 0;
    unsavedRef.current = false;
    setFieldNotice(null);
    setStandingsStale(false);
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }

  const scheduleSave = useCallback((accountId: string | null, next: CompeteState) => {
    if (!accountId || demoRef.current || statusRef.current !== "ready") return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      timer.current = null;
      if (userIdRef.current !== accountId || statusRef.current !== "ready") return;
      const generation = dirtyRef.current;
      void fetch("/api/compete", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state: next, accountId }),
      })
        .then(async (response) => {
          if (userIdRef.current !== accountId) return;
          if (!response.ok) {
            localStorage.setItem(deviceOnlyKey(accountId), "1");
            const body = (await response.json().catch(() => null)) as {
              error?: string;
            } | null;
            setSaveError(
              body?.error === "week_still_open"
                ? "This week stays active until it closes. Stop after this week from You."
                : "This device updated. The account copy did not save.",
            );
            return;
          }
          if (dirtyRef.current === generation) {
            localStorage.removeItem(deviceOnlyKey(accountId));
            unsavedRef.current = false;
          }
          setSaveError(null);
        })
        .catch(() => {
          if (userIdRef.current !== accountId) return;
          localStorage.setItem(deviceOnlyKey(accountId), "1");
          setSaveError("This device updated. The account copy did not save.");
        });
    }, 400);
  }, []);

  const publish = useCallback(
    (
      accountId: string | null,
      next: CompeteState,
      savedAt: string,
      status: LoadStatus,
      upload: boolean,
    ) => {
      statusRef.current = status;
      stateRef.current = next;
      setLoadStatus(status);
      setState(next);
      if (status === "failed") return;
      writeLocal(accountId, next, savedAt);
      if (upload) scheduleSave(accountId, next);
    },
    [scheduleSave],
  );

  useEffect(() => {
    if (loading) return;
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    queue.current = [];
    const accountId = userId;
    let cancelled = false;
    const signedIn = Boolean(accountId) && !(demoMode || user?.mode === "demo");
    setLegacyOffer(signedIn && parseStored(readStorageItem(LEGACY_KEY)) != null);
    const local = readLocal(accountId);

    const settle = (chosen: CompeteState, savedAt: string, status: LoadStatus) => {
      if (cancelled || userIdRef.current !== accountId) return;
      // Signed-in documents always carry the account baseline (1000), even when
      // migrate demotes empty Guest-shaped local copies back to unranked 0.
      let next = signedIn ? withAccountEloBaseline(chosen) : chosen;
      const pending = queue.current.splice(0);
      for (const action of pending) next = reduceCompete(next, action);
      if (signedIn) next = withAccountEloBaseline(next);
      const stamped = pending.length > 0 ? new Date().toISOString() : savedAt;
      publish(accountId, next, stamped, status, status === "ready" && pending.length > 0);
    };

    if (!signedIn) {
      settle(local.state, local.savedAt, "local");
      return () => {
        cancelled = true;
      };
    }

    statusRef.current = "loading";
    setLoadStatus("loading");
    setState(null);
    stateRef.current = null;
    void fetch("/api/compete")
      .then(async (response) => {
        if (!response.ok) throw new Error("load failed");
        return (await response.json()) as { state?: unknown; updatedAt?: string | null };
      })
      .then((body) => {
        if (cancelled || userIdRef.current !== accountId || !accountId) return;
        const staleDeviceDraft = readStorageItem(deviceOnlyKey(accountId)) === "1";
        const remote = isCompeteState(body.state)
          ? rollClock(migrateCompeteState(body.state))
          : null;
        if (!remote) {
          settle(local.state, local.savedAt, "ready");
          return;
        }
        const dirty = staleDeviceDraft || !body.updatedAt;
        if (!dirty) localStorage.removeItem(deviceOnlyKey(accountId));
        const chosen = applyRemoteSnapshot(local.state, remote, dirty);
        settle(
          chosen,
          chosen === local.state ? local.savedAt : (body.updatedAt ?? local.savedAt),
          "ready",
        );
      })
      .catch(() => {
        if (cancelled || userIdRef.current !== accountId) return;
        queue.current = [];
        publish(
          accountId,
          withAccountEloBaseline(local.state),
          local.savedAt,
          "failed",
          false,
        );
        setSaveError(null);
      });

    return () => {
      cancelled = true;
    };
  }, [attempt, demoMode, loading, publish, user, userId]);

  useEffect(() => {
    if (!state || loadStatus === "loading" || loadStatus === "failed") return;
    const accountKey = userId ?? "guest";
    seedArenaBaselinesFromState(state, accountKey, readStorageItem, writeStorageItem);
    const next = seenFieldFromState(state, accountKey);
    if (primaryRevealResults(state.periodResults, undefined, state.primary).length > 0) {
      if (next) {
        try {
          localStorage.setItem(fieldSeenStorageKey(accountKey), JSON.stringify(next));
        } catch {
          /* The recap still shows if device storage is disabled. */
        }
      }
      setFieldNotice(null);
      return;
    }
    if (!next) {
      setFieldNotice(null);
      return;
    }
    const previous = readSeenField(readStorageItem(fieldSeenStorageKey(accountKey)));
    const notice = fieldChangeNotice(previous, next);
    if (!notice) {
      try {
        localStorage.setItem(fieldSeenStorageKey(accountKey), JSON.stringify(next));
      } catch {
        /* Progress remains available if device storage is disabled. */
      }
      setFieldNotice(null);
      return;
    }
    setFieldNotice(notice);
  }, [loadStatus, state, userId]);

  const recoverLegacy = useCallback(() => {
    const accountId = userIdRef.current;
    const raw = readStorageItem(LEGACY_KEY);
    const parsed = parseStored(raw);
    if (!accountId || !raw || !parsed) return;
    const stamped = new Date().toISOString();
    const recovered = withAccountEloBaseline(parsed.state);
    writeLocal(accountId, recovered, stamped);
    try {
      localStorage.setItem(RECOVERY_KEY, raw);
      localStorage.removeItem(LEGACY_KEY);
    } catch (error) {
      console.warn("Could not update legacy recovery keys:", error);
    }
    setLegacyOffer(false);
    stateRef.current = recovered;
    setState(recovered);
    if (statusRef.current === "ready") scheduleSave(accountId, recovered);
  }, [scheduleSave]);

  const retryLoad = useCallback(() => {
    setAttempt((value) => value + 1);
  }, []);

  const refresh = useCallback(async (): Promise<boolean> => {
    const accountId = userIdRef.current;
    if (!accountId || demoRef.current || statusRef.current !== "ready") return true;
    if (refreshFlight.current) return refreshFlight.current;
    const generation = dirtyRef.current;
    const task = (async () => {
      try {
        const response = await fetch("/api/compete");
        if (!response.ok) {
          setStandingsStale(true);
          return false;
        }
        const body = (await response.json()) as { state?: unknown; updatedAt?: string | null };
        if (userIdRef.current !== accountId || statusRef.current !== "ready") return false;
        if (!isCompeteState(body.state)) return false;
        const remote = rollClock(migrateCompeteState(body.state));
        const local = stateRef.current;
        if (!local) return false;
        const dirty =
          unsavedRef.current ||
          dirtyRef.current !== generation ||
          timer.current != null;
        const next = applyRemoteSnapshot(local, remote, dirty);
        if (next !== local) {
          const savedAt = dirty
            ? new Date().toISOString()
            : (body.updatedAt ?? new Date().toISOString());
          publish(accountId, next, savedAt, "ready", false);
        }
        setStandingsStale(false);
        return true;
      } catch {
        if (userIdRef.current === accountId) setStandingsStale(true);
        return false;
      } finally {
        refreshFlight.current = null;
      }
    })();
    refreshFlight.current = task;
    return task;
  }, [publish]);

  useEffect(() => {
    if (loading || !userId || demoMode || user?.mode === "demo") return;
    const kick = () => {
      if (document.visibilityState === "hidden") return;
      void refresh();
    };
    document.addEventListener("visibilitychange", kick);
    window.addEventListener("online", kick);
    return () => {
      document.removeEventListener("visibilitychange", kick);
      window.removeEventListener("online", kick);
    };
  }, [demoMode, loading, refresh, user?.mode, userId]);

  const dismissFieldNotice = useCallback(() => {
    const accountKey = userIdRef.current ?? "guest";
    const current = stateRef.current;
    if (current) {
      const seen = seenFieldFromState(current, accountKey);
      if (seen) {
        try {
          localStorage.setItem(fieldSeenStorageKey(accountKey), JSON.stringify(seen));
        } catch {
          /* Acknowledgement stays in memory if device storage is disabled. */
        }
      }
    }
    setFieldNotice(null);
  }, []);

  const api = useMemo<CompeteApi>(
    () => ({
      state,
      saveError,
      legacyOffer,
      loadStatus,
      fieldNotice,
      standingsStale,
      recoverLegacy,
      retryLoad,
      dismissFieldNotice,
      refresh,
      dispatch: (action: Action) => {
        if (statusRef.current === "failed") return;
        const withAccount: Action =
          userIdRef.current && !action.accountId
            ? { ...action, accountId: userIdRef.current }
            : action;
        if (statusRef.current === "loading" || !stateRef.current) {
          queue.current.push(withAccount);
          dirtyRef.current += 1;
          unsavedRef.current = true;
          return;
        }
        dirtyRef.current += 1;
        unsavedRef.current = true;
        const accountKey = userIdRef.current ?? "guest";
        seedArenaBaselinesFromState(
          stateRef.current,
          accountKey,
          readStorageItem,
          writeStorageItem,
        );
        const next = reduceCompete(stateRef.current, withAccount);
        seedArenaBaselinesFromState(
          next,
          accountKey,
          readStorageItem,
          writeStorageItem,
        );
        const savedAt = new Date().toISOString();
        stateRef.current = next;
        setState(next);
        writeLocal(userIdRef.current, next, savedAt);
        if (statusRef.current === "ready") scheduleSave(userIdRef.current, next);
      },
    }),
    [
      dismissFieldNotice,
      fieldNotice,
      legacyOffer,
      loadStatus,
      recoverLegacy,
      refresh,
      retryLoad,
      saveError,
      scheduleSave,
      standingsStale,
      state,
    ],
  );

  return <CompeteContext.Provider value={api}>{children}</CompeteContext.Provider>;
}

export function useCompete(): CompeteApi {
  return useContext(CompeteContext);
}

/** Poll the signed-in field while Compete is the visible tab. */
export function useCompeteFieldRefresh(active: boolean) {
  const { refresh, loadStatus } = useCompete();
  useEffect(() => {
    if (!active || (loadStatus !== "ready" && loadStatus !== "local")) return;
    let stopped = false;
    let delay = FIELD_REFRESH_MS;
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      if (document.visibilityState === "hidden") {
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
  }, [active, loadStatus, refresh]);
}
