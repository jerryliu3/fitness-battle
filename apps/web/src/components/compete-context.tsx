"use client";

import {
  freshState,
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
  useState,
  type ReactNode,
} from "react";

const KEY = "fb-compete-v1";

interface CompeteApi {
  state: CompeteState | null;
  dispatch: (action: Action) => void;
}

const CompeteContext = createContext<CompeteApi>({
  state: null,
  dispatch: () => {},
});

function readState(): CompeteState {
  const raw = localStorage.getItem(KEY);
  if (!raw) return rollClock(freshState());
  try {
    const parsed = JSON.parse(raw) as CompeteState;
    if (parsed.version !== 1 || !Array.isArray(parsed.ratings)) {
      return rollClock(freshState());
    }
    return rollClock(parsed);
  } catch {
    return rollClock(freshState());
  }
}

export function CompeteProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<CompeteState | null>(null);

  useEffect(() => {
    const next = readState();
    localStorage.setItem(KEY, JSON.stringify(next));
    setState(next);
  }, []);

  const api = useMemo<CompeteApi>(
    () => ({
      state,
      dispatch: (action) => {
        setState((prev) => {
          if (!prev) return prev;
          const next = reduceCompete(prev, action);
          localStorage.setItem(KEY, JSON.stringify(next));
          return next;
        });
      },
    }),
    [state],
  );

  return (
    <CompeteContext.Provider value={api}>{children}</CompeteContext.Provider>
  );
}

export function useCompete(): CompeteApi {
  return useContext(CompeteContext);
}
