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
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

const LEGACY_KEY = "fb-compete-v1";
/** Kept when an unscoped history blob is copied onto an account. */
const RECOVERY_KEY = "fb-compete-v1:recovered";

interface CompeteApi {
  state: CompeteState | null;
  dispatch: (action: Action) => void;
  /** True when the last account save failed. */
  saveError: string | null;
}

const CompeteContext = createContext<CompeteApi>({
  state: null,
  dispatch: () => {},
  saveError: null,
});

function storageKey(userId: string | null): string {
  return userId ? `fb-compete-v1:${userId}` : "fb-compete-v1:guest";
}

function accountToken(userId: string | null): string {
  return userId ?? "guest";
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

/**
 * Copy the pre-account blob onto this account once. If the account already
 * has a blob, the old key stays put so it can be recovered by hand.
 */
function adoptLegacy(userId: string) {
  const key = storageKey(userId);
  if (localStorage.getItem(key)) return;
  const raw = localStorage.getItem(LEGACY_KEY);
  const parsed = parseStored(raw);
  if (!raw || !parsed) return;
  localStorage.setItem(key, JSON.stringify(parsed));
  localStorage.setItem(RECOVERY_KEY, raw);
  localStorage.removeItem(LEGACY_KEY);
}

export function CompeteProvider({ children }: { children: ReactNode }) {
  const { user, loading, demoMode } = useAuth();
  const userId = user?.id ?? null;
  const [state, setState] = useState<CompeteState | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const userIdRef = useRef(userId);
  const demoRef = useRef(demoMode || user?.mode === "demo");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queue = useRef<Action[]>([]);
  const hydratedAccount = useRef<string | null>(null);
  userIdRef.current = userId;
  demoRef.current = demoMode || user?.mode === "demo";

  function scheduleSave(accountId: string | null, next: CompeteState) {
    if (!accountId || demoRef.current) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      if (userIdRef.current !== accountId) return;
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
        })
        .catch(() => {
          if (userIdRef.current !== accountId) return;
          setSaveError("This device updated. The account copy did not save.");
        });
    }, 400);
  }

  useEffect(() => {
    if (loading) return;
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    queue.current = [];
    hydratedAccount.current = null;
    const accountId = userId;
    let cancelled = false;
    if (accountId && !(demoMode || user?.mode === "demo")) adoptLegacy(accountId);
    const local = readLocal(accountId);

    const finish = (chosen: CompeteState, savedAt: string) => {
      if (cancelled || userIdRef.current !== accountId) return;
      hydratedAccount.current = accountToken(accountId);
      setState(() => {
        let next = chosen;
        const pending = queue.current.splice(0);
        for (const action of pending) next = reduceCompete(next, action);
        const stamped = pending.length > 0 ? new Date().toISOString() : savedAt;
        writeLocal(accountId, next, stamped);
        if (pending.length > 0) scheduleSave(accountId, next);
        return next;
      });
    };

    if (!accountId || demoMode || user?.mode === "demo") {
      finish(local.state, local.savedAt);
      return () => {
        cancelled = true;
      };
    }

    setState(null);
    void fetch("/api/compete")
      .then(async (response) => {
        if (!response.ok) return null;
        return (await response.json()) as { state?: unknown; updatedAt?: string | null };
      })
      .then((body) => {
        if (cancelled || userIdRef.current !== accountId) return;
        if (!body?.updatedAt) {
          finish(local.state, local.savedAt);
          return;
        }
        const chosen = chooseCompeteState(local, {
          updatedAt: body.updatedAt,
          state: body.state,
        });
        finish(chosen, chosen === local.state ? local.savedAt : body.updatedAt);
      })
      .catch(() => {
        if (cancelled || userIdRef.current !== accountId) return;
        setSaveError("Could not load the account copy. Showing this device.");
        finish(local.state, local.savedAt);
      });

    return () => {
      cancelled = true;
    };
  }, [demoMode, loading, user, userId]);

  const api = useMemo<CompeteApi>(
    () => ({
      state,
      saveError,
      dispatch: (action) => {
        const accountId = userIdRef.current;
        if (hydratedAccount.current !== accountToken(accountId)) {
          queue.current.push(action);
          return;
        }
        setState((prev) => {
          if (!prev) {
            queue.current.push(action);
            return prev;
          }
          const next = reduceCompete(prev, action);
          writeLocal(accountId, next, new Date().toISOString());
          scheduleSave(accountId, next);
          return next;
        });
      },
    }),
    [saveError, state],
  );

  return (
    <CompeteContext.Provider value={api}>{children}</CompeteContext.Provider>
  );
}

export function useCompete(): CompeteApi {
  return useContext(CompeteContext);
}
