import {
  countedActivityIds,
  freshState,
  migrateCompeteState,
  newCountedIds,
  reduceCompete,
  rollClock,
  type Action,
  type CompeteState,
} from "@fitness-battle/shared";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { AppState } from "react-native";

const STORAGE_KEY = "fb-compete-v1";
const SEEN_KEY = "fb-counted-seen";

interface CompeteContextValue {
  state: CompeteState | null;
  dispatch: (action: Action) => void;
  returnGain: number;
  clearReturn: () => void;
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

export function CompeteProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<CompeteState | null>(null);
  const [returnGain, setReturnGain] = useState(0);

  useEffect(() => {
    let alive = true;
    void AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (!alive) return;
      let next = rollClock(freshState());
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as CompeteState;
          if (parsed.version === 1) next = rollClock(migrateCompeteState(parsed));
        } catch {
          next = rollClock(freshState());
        }
      }
      void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setState(next);
    });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!state) return;
    let seen = countedActivityIds(state);
    let alive = true;

    function noteProgress(previous: string[] | null, current: string[]) {
      if (!previous) return;
      const added = newCountedIds(previous, current);
      if (added.length === 0) return;
      setReturnGain(added.length);
      router.navigate("/arena");
    }

    void AsyncStorage.getItem(SEEN_KEY).then((raw) => {
      if (!alive) return;
      noteProgress(readIds(raw), seen);
      void AsyncStorage.setItem(SEEN_KEY, JSON.stringify(seen));
    });

    const sub = AppState.addEventListener("change", (status) => {
      if (status !== "active") return;
      const current = countedActivityIds(state);
      noteProgress(seen, current);
      seen = current;
      void AsyncStorage.setItem(SEEN_KEY, JSON.stringify(seen));
    });

    return () => {
      alive = false;
      sub.remove();
    };
  }, [router, state]);

  const dispatch = useCallback((action: Action) => {
    setState((prev) => {
      if (!prev) return prev;
      const next = reduceCompete(prev, action);
      void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const clearReturn = useCallback(() => setReturnGain(0), []);

  return (
    <CompeteContext.Provider value={{ state, dispatch, returnGain, clearReturn }}>
      {children}
    </CompeteContext.Provider>
  );
}

export function useCompeteStore(): CompeteContextValue {
  const value = useContext(CompeteContext);
  if (!value) throw new Error("useCompeteStore requires CompeteProvider");
  return value;
}
