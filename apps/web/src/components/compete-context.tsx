"use client";

import { useAuth } from "@/components/auth-context";
import {
  chooseCompeteState,
  freshState,
  isCompeteState,
  migrateCompeteState,
  reduceCompete,
  rollClock,
  type Action,
  type CompeteState,
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
  recoverLegacy: () => void;
  retryLoad: () => void;
}

const CompeteContext = createContext<CompeteApi>({
  state: null,
  dispatch: () => {},
  saveError: null,
  legacyOffer: false,
  loadStatus: "loading",
  recoverLegacy: () => {},
  retryLoad: () => {},
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

function readLocal(userId: string | null): { savedAt: string; state: CompeteState } {
  return (
    parseStored(localStorage.getItem(storageKey(userId))) ?? {
      savedAt: new Date(0).toISOString(),
      state: rollClock(freshState()),
    }
  );
}

function writeLocal(userId: string | null, state: CompeteState, savedAt: string) {
  localStorage.setItem(storageKey(userId), JSON.stringify({ savedAt, state }));
}

export function CompeteProvider({ children }: { children: ReactNode }) {
  const { user, loading, demoMode } = useAuth();
  const userId = user?.id ?? null;
  const [state, setState] = useState<CompeteState | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [legacyOffer, setLegacyOffer] = useState(false);
  const [loadStatus, setLoadStatus] = useState<LoadStatus>("loading");
  const [attempt, setAttempt] = useState(0);
  const userIdRef = useRef(userId);
  const demoRef = useRef(demoMode || user?.mode === "demo");
  const statusRef = useRef<LoadStatus>("loading");
  const stateRef = useRef<CompeteState | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queue = useRef<Action[]>([]);
  userIdRef.current = userId;
  demoRef.current = demoMode || user?.mode === "demo";

  const scheduleSave = useCallback((accountId: string | null, next: CompeteState) => {
    if (!accountId || demoRef.current || statusRef.current !== "ready") return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      if (userIdRef.current !== accountId || statusRef.current !== "ready") return;
      void fetch("/api/compete", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state: next, accountId }),
      })
        .then(async (response) => {
          if (userIdRef.current !== accountId) return;
          if (!response.ok) {
            setSaveError("This device updated. The account copy did not save.");
            return;
          }
          setSaveError(null);
          const body = (await response.json().catch(() => null)) as {
            state?: unknown;
            updatedAt?: string;
          } | null;
          if (body?.state && isCompeteState(body.state)) {
            const serverState = rollClock(migrateCompeteState(body.state));
            stateRef.current = serverState;
            setState(serverState);
            writeLocal(
              accountId,
              serverState,
              body.updatedAt ?? new Date().toISOString(),
            );
          }
        })
        .catch(() => {
          if (userIdRef.current !== accountId) return;
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
    setLegacyOffer(signedIn && parseStored(localStorage.getItem(LEGACY_KEY)) != null);
    const local = readLocal(accountId);

    const settle = (chosen: CompeteState, savedAt: string, status: LoadStatus) => {
      if (cancelled || userIdRef.current !== accountId) return;
      let next = chosen;
      const pending = queue.current.splice(0);
      for (const action of pending) next = reduceCompete(next, action);
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
        const staleDeviceDraft = localStorage.getItem(deviceOnlyKey(accountId)) === "1";
        localStorage.removeItem(deviceOnlyKey(accountId));
        if (staleDeviceDraft && body?.updatedAt && isCompeteState(body.state)) {
          settle(rollClock(migrateCompeteState(body.state)), body.updatedAt, "ready");
          return;
        }
        if (!body?.updatedAt) {
          settle(local.state, local.savedAt, "ready");
          return;
        }
        const chosen = chooseCompeteState(local, {
          updatedAt: body.updatedAt,
          state: body.state,
        });
        settle(chosen, chosen === local.state ? local.savedAt : body.updatedAt, "ready");
      })
      .catch(() => {
        if (cancelled || userIdRef.current !== accountId) return;
        queue.current = [];
        publish(accountId, local.state, local.savedAt, "failed", false);
        setSaveError(null);
      });

    return () => {
      cancelled = true;
    };
  }, [attempt, demoMode, loading, publish, user, userId]);

  const recoverLegacy = useCallback(() => {
    const accountId = userIdRef.current;
    const raw = localStorage.getItem(LEGACY_KEY);
    const parsed = parseStored(raw);
    if (!accountId || !raw || !parsed) return;
    const stamped = new Date().toISOString();
    writeLocal(accountId, parsed.state, stamped);
    localStorage.setItem(RECOVERY_KEY, raw);
    localStorage.removeItem(LEGACY_KEY);
    setLegacyOffer(false);
    stateRef.current = parsed.state;
    setState(parsed.state);
    if (statusRef.current === "ready") scheduleSave(accountId, parsed.state);
  }, [scheduleSave]);

  const retryLoad = useCallback(() => {
    setAttempt((value) => value + 1);
  }, []);

  const api = useMemo<CompeteApi>(
    () => ({
      state,
      saveError,
      legacyOffer,
      loadStatus,
      recoverLegacy,
      retryLoad,
      dispatch: (action: Action) => {
        if (statusRef.current === "failed") return;
        const withAccount: Action =
          userIdRef.current && !action.accountId
            ? { ...action, accountId: userIdRef.current }
            : action;
        if (statusRef.current === "loading" || !stateRef.current) {
          queue.current.push(withAccount);
          return;
        }
        const next = reduceCompete(stateRef.current, withAccount);
        const savedAt = new Date().toISOString();
        stateRef.current = next;
        setState(next);
        writeLocal(userIdRef.current, next, savedAt);
        if (statusRef.current === "ready") scheduleSave(userIdRef.current, next);
      },
    }),
    [legacyOffer, loadStatus, recoverLegacy, retryLoad, saveError, scheduleSave, state],
  );

  return <CompeteContext.Provider value={api}>{children}</CompeteContext.Provider>;
}

export function useCompete(): CompeteApi {
  return useContext(CompeteContext);
}
