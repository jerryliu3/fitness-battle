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
  /** True after the athlete leaves the return reveal, so Today does not send them back. */
  settled: boolean;
  dispatch: (action: Action) => void;
  acknowledgeArrival: () => void;
}

const CompeteContext = createContext<CompeteApi>({
  state: null,
  arrival: null,
  settled: false,
  dispatch: () => {},
  acknowledgeArrival: () => {},
});

async function remember(visit: WeekVisit) {
  await AsyncStorage.setItem(visitSeenKey(ACCOUNT, visit), JSON.stringify(visit));
}

export function CompeteProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<CompeteState | null>(null);
  const [arrival, setArrival] = useState<ReturnType<typeof visitGain>>(null);
  const [settled, setSettled] = useState(false);

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
    setSettled(true);
    setArrival(null);
    setState((prev) => {
      if (prev) void remember(weekVisit(prev));
      return prev;
    });
  }, []);

  const api = useMemo(
    () => ({ state, arrival, settled, dispatch, acknowledgeArrival }),
    [acknowledgeArrival, arrival, dispatch, settled, state],
  );

  return <CompeteContext.Provider value={api}>{children}</CompeteContext.Provider>;
}

export function useCompete() {
  return useContext(CompeteContext);
}
