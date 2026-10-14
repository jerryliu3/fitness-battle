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
/** Copy of the unscoped blob after the signed-in user chooses to recover it. */
const RECOVERY_KEY = "fb-compete-v1:recovered";

interface CompeteApi {
  state: CompeteState | null;
  dispatch: (action: Action) => void;
  /** True when the last account save failed. */
  saveError: string | null;
  /** Unscoped pre-account history is still on this browser. */
  legacyOffer: boolean;
  /** Account GET failed, so uploads stay off. */
  loadFailed: boolean;
  recoverLegacy: () => void;
  continueOnDevice: () => void;
}

const CompeteContext = createContext<CompeteApi>({
  state: null,
  dispatch: () => {},
  saveError: null,
  legacyOffer: false,
  loadFailed: false,
  recoverLegacy: () => {},
  continueOnDevice: () => {},
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

function deviceOnlyKey(userId: string): string {
  return `fb-compete-v1:${userId}:device-only`;
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
  const [loadFailed, setLoadFailed] = useState(false);
  const userIdRef = useRef(userId);
  const demoRef = useRef(demoMode || user?.mode === "demo");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queue = useRef<Action[]>([]);
  const hydratedAccount = useRef<string | null>(null);
  const accountReady = useRef(false);
  const localFallback = useRef(false);
  userIdRef.current = userId;
  demoRef.current = demoMode || user?.mode === "demo";

  function scheduleSave(accountId: string | null, next: CompeteState) {
    if (!accountId || demoRef.current || !accountReady.current) return;
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
    accountReady.current = false;
    localFallback.current = false;
    const accountId = userId;
    let cancelled = false;
    const signedIn = Boolean(accountId) && !(demoMode || user?.mode === "demo");
    setLegacyOffer(signedIn && parseStored(localStorage.getItem(LEGACY_KEY)) != null);
    setLoadFailed(false);
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
      accountReady.current = true;
      finish(local.state, local.savedAt);
      return () => {
        cancelled = true;
      };
    }

    setState(null);
    void fetch("/api/compete")
      .then(async (response) => {
        if (!response.ok) throw new Error("load failed");
        return (await response.json()) as { state?: unknown; updatedAt?: string | null };
      })
      .then((body) => {
        if (cancelled || userIdRef.current !== accountId) return;
        accountReady.current = true;
        const deviceOnly = localStorage.getItem(deviceOnlyKey(accountId)) === "1";
        if (deviceOnly && body?.updatedAt && isCompeteState(body.state)) {
          localStorage.removeItem(deviceOnlyKey(accountId));
          finish(rollClock(migrateCompeteState(body.state)), body.updatedAt);
          return;
        }
        if (deviceOnly) localStorage.removeItem(deviceOnlyKey(accountId));
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
        hydratedAccount.current = accountToken(accountId);
        accountReady.current = false;
        setLoadFailed(true);
        setSaveError("Could not load the account copy. This screen is not uploading.");
        setState(() => {
          let next = local.state;
          const pending = queue.current.splice(0);
          for (const action of pending) next = reduceCompete(next, action);
          return next;
        });
      });

    return () => {
      cancelled = true;
    };
  }, [demoMode, loading, user, userId]);

  const api = useMemo(
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
          if (accountReady.current) {
            writeLocal(accountId, next, new Date().toISOString());
            scheduleSave(accountId, next);
          } else if (localFallback.current && accountId) {
            writeLocal(accountId, next, new Date().toISOString());
            localStorage.setItem(deviceOnlyKey(accountId), "1");
          }
          return next;
        });
      },
    }),
    [saveError, state],
  );

  function recoverLegacy() {
    const accountId = userIdRef.current;
    const raw = localStorage.getItem(LEGACY_KEY);
    const parsed = parseStored(raw);
    if (!accountId || !raw || !parsed) return;
    const stamped = new Date().toISOString();
    writeLocal(accountId, parsed.state, stamped);
    localStorage.setItem(RECOVERY_KEY, raw);
    localStorage.removeItem(LEGACY_KEY);
    setLegacyOffer(false);
    setState(parsed.state);
    if (accountReady.current) scheduleSave(accountId, parsed.state);
    else setSaveError("Previous device history is on this screen. It uploads after the account loads.");
  }

  function continueOnDevice() {
    const accountId = userIdRef.current;
    if (!accountId) return;
    localFallback.current = true;
    localStorage.setItem(deviceOnlyKey(accountId), "1");
    setLoadFailed(false);
    setSaveError("Working from this device. The account copy is not being updated.");
    setState((prev) => {
      if (prev) writeLocal(accountId, prev, new Date().toISOString());
      return prev;
    });
  }

  return (
    <CompeteContext.Provider value={{ ...api, legacyOffer, loadFailed, recoverLegacy, continueOnDevice }}>
      {children}
    </CompeteContext.Provider>
  );
}

export function useCompete(): CompeteApi {
  return useContext(CompeteContext);
}
