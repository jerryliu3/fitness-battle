import {
  freshState,
  migrateCompeteState,
  readWeekVisit,
  reduceCompete,
  rollClock,
  visitGain,
  visitSeenKey,
  weekVisit,
  type CompeteState,
  type WeekVisit,
} from "@fitness-battle/shared";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const KEY = "fb-compete-v1";
const ACCOUNT = "device";

type Action = Parameters<typeof reduceCompete>[1];

interface CompeteApi {
  state: CompeteState | null;
  arrival: ReturnType<typeof visitGain>;
  dispatch: (action: Action) => void;
  acknowledgeArrival: () => void;
}

const CompeteContext = createContext<CompeteApi>({
  state: null,
  arrival: null,
  dispatch: () => {},
  acknowledgeArrival: () => {},
});

async function remember(visit: WeekVisit) {
  await AsyncStorage.setItem(visitSeenKey(ACCOUNT, visit), JSON.stringify(visit));
}

export function CompeteProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<CompeteState | null>(null);
  const [arrival, setArrival] = useState<ReturnType<typeof visitGain>>(null);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const raw = await AsyncStorage.getItem(KEY);
      let next = rollClock(freshState());
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as CompeteState;
          if (parsed.version === 1) next = rollClock(migrateCompeteState(parsed));
        } catch {
          next = rollClock(freshState());
        }
      }
      await AsyncStorage.setItem(KEY, JSON.stringify(next));
      if (!alive) return;
      const visit = weekVisit(next);
      const previous = readWeekVisit(await AsyncStorage.getItem(visitSeenKey(ACCOUNT, visit)));
      const gain = visitGain(previous, visit);
      setArrival(gain);
      if (!gain) await remember(visit);
      setState(next);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const dispatch = useCallback((action: Action) => {
    setState((prev) => {
      if (!prev) return prev;
      const next = reduceCompete(prev, action);
      void AsyncStorage.setItem(KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const acknowledgeArrival = useCallback(() => {
    setState((prev) => {
      if (prev) void remember(weekVisit(prev));
      return prev;
    });
    setArrival(null);
  }, []);

  const api = useMemo(
    () => ({ state, arrival, dispatch, acknowledgeArrival }),
    [acknowledgeArrival, arrival, dispatch, state],
  );

  return <CompeteContext.Provider value={api}>{children}</CompeteContext.Provider>;
}

export function useCompete() {
  return useContext(CompeteContext);
}
