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
  useRef,
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
  const stateRef = useRef<CompeteState | null>(null);
  stateRef.current = state;

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

  const seenRef = useRef<{ ids: string[] | null; ready: boolean; opened: boolean }>({
    ids: null,
    ready: false,
    opened: false,
  });

  const remember = useCallback((current: string[], announce: boolean) => {
    const seen = seenRef.current;
    if (announce && seen.ids) {
      const added = newCountedIds(seen.ids, current);
      if (added.length > 0) {
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
      if (status !== "active" || !seenRef.current.ready || !stateRef.current) return;
      remember(countedActivityIds(stateRef.current), true);
    });

    return () => {
      alive = false;
      sub.remove();
    };
  }, [remember]);

  useEffect(() => {
    if (!state || !seenRef.current.ready) return;
    const ids = countedActivityIds(state);
    if (!seenRef.current.opened) {
      seenRef.current.opened = true;
      remember(ids, true);
      return;
    }
    if (AppState.currentState === "active") remember(ids, false);
  }, [remember, state]);

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
