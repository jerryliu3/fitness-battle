import {
  freshState,
  migrateCompeteState,
  reduceCompete,
  rollClock,
  type Action,
  type CompeteState,
} from "@fitness-battle/shared";
import AsyncStorage from "@react-native-async-storage/async-storage";
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

async function readState(): Promise<CompeteState> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return rollClock(freshState());
  try {
    const parsed = JSON.parse(raw) as CompeteState;
    if (parsed.version !== 1 || !Array.isArray(parsed.ratings)) {
      return rollClock(freshState());
    }
    const migrated = migrateCompeteState(parsed);
    const now = migrated.demoNow ? new Date(migrated.demoNow) : new Date();
    return rollClock(migrated, now);
  } catch {
    return rollClock(freshState());
  }
}

export function CompeteProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<CompeteState | null>(null);

  useEffect(() => {
    let alive = true;
    void readState().then((next) => {
      if (!alive) return;
      void AsyncStorage.setItem(KEY, JSON.stringify(next));
      setState(next);
    });
    return () => {
      alive = false;
    };
  }, []);

  const api = useMemo<CompeteApi>(
    () => ({
      state,
      dispatch: (action) => {
        setState((prev) => {
          if (!prev) return prev;
          const next = reduceCompete(prev, action);
          void AsyncStorage.setItem(KEY, JSON.stringify(next));
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
