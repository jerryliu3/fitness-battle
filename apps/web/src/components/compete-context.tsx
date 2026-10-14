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

function readLocal(userId: string | null): { savedAt: string; state: CompeteState } {
  const raw = localStorage.getItem(storageKey(userId));
  const blank = () => ({
    savedAt: new Date(0).toISOString(),
    state: rollClock(freshState()),
  });
  if (!raw) return blank();
  try {
    const parsed = JSON.parse(raw) as { savedAt?: string; state?: unknown };
    const state = isCompeteState(parsed.state)
      ? parsed.state
      : isCompeteState(parsed)
        ? parsed
        : null;
    if (!state) return blank();
    const migrated = rollClock(migrateCompeteState(state));
    return {
      savedAt: parsed.savedAt ?? new Date(0).toISOString(),
      state: migrated,
    };
  } catch {
    return blank();
  }
}

function writeLocal(userId: string | null, state: CompeteState, savedAt: string) {
  localStorage.setItem(storageKey(userId), JSON.stringify({ savedAt, state }));
  localStorage.removeItem(LEGACY_KEY);
}

export function CompeteProvider({ children }: { children: ReactNode }) {
  const { user, loading, demoMode } = useAuth();
  const userId = user?.id ?? null;
  const [state, setState] = useState<CompeteState | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const revision = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (loading) return;
    const generation = revision.current;
    const local = readLocal(userId);
    writeLocal(userId, local.state, local.savedAt);
    setState(local.state);
    if (!user || demoMode || user.mode === "demo") return;

    let cancelled = false;
    void fetch("/api/compete")
      .then(async (response) => {
        if (!response.ok) return null;
        return (await response.json()) as { state?: unknown; updatedAt?: string | null };
      })
      .then((body) => {
        if (cancelled || revision.current !== generation || !body?.updatedAt) return;
        const chosen = chooseCompeteState(local, {
          updatedAt: body.updatedAt,
          state: body.state,
        });
        if (chosen === local.state) return;
        const savedAt = body.updatedAt;
        writeLocal(userId, chosen, savedAt);
        setState(chosen);
      })
      .catch(() => {
        if (!cancelled) setSaveError("Could not load the account copy. Showing this device.");
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
        setState((prev) => {
          if (!prev) return prev;
          const next = reduceCompete(prev, action);
          const savedAt = new Date().toISOString();
          revision.current += 1;
          writeLocal(userId, next, savedAt);
          if (user && !demoMode && user.mode !== "demo") {
            if (timer.current) clearTimeout(timer.current);
            timer.current = setTimeout(() => {
              void fetch("/api/compete", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ state: next }),
              })
                .then(async (response) => {
                  if (!response.ok) {
                    setSaveError("This device updated. The account copy did not save.");
                    return;
                  }
                  setSaveError(null);
                })
                .catch(() => {
                  setSaveError("This device updated. The account copy did not save.");
                });
            }, 400);
          }
          return next;
        });
      },
    }),
    [demoMode, saveError, state, user, userId],
  );

  return (
    <CompeteContext.Provider value={api}>{children}</CompeteContext.Provider>
  );
}

export function useCompete(): CompeteApi {
  return useContext(CompeteContext);
}
