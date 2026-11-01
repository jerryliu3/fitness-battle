import { usePathname } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { competitionMoments, competitionMomentSnapshots, momentStorageKey, type CompetitionMoment, type CompeteState } from "@fitness-battle/shared";

/** Root-owned event queue. Scene browsing and event acknowledgement are independent. */
export function useCompetitionExperience(
  state: CompeteState | null,
  account: string,
  read: (key: string) => string | null,
  write: (key: string, value: string) => void,
) {
  const path = usePathname();
  const onCompete = path === "/arena" || path.endsWith("/arena");
  const current = useRef({ account, read, write });
  current.current = { account, read, write };
  const owner = useRef(account);
  const cache = useRef(new Map<string, string>());
  const [queue, setQueue] = useState<{ account: string; moments: CompetitionMoment[] }>({ account, moments: [] });
  if (owner.current !== account) {
    owner.current = account;
    cache.current.clear();
  }
  const observe = useCallback((next: CompeteState, quiet = false) => {
    const c = current.current;
    const readValue = (key: string) => cache.current.get(key) ?? c.read(key);
    const moments = quiet ? [] : competitionMoments(next, c.account, readValue);
    for (const snapshot of competitionMomentSnapshots(next, c.account)) {
      cache.current.set(snapshot.key, snapshot.value);
      c.write(snapshot.key, snapshot.value);
    }
    if (moments.length) setQueue(previous => {
      const existing = previous.account === c.account ? previous.moments : [];
      const ids = new Set(existing.map(m => m.id));
      return { account: c.account, moments: [...existing, ...moments.filter(m => !ids.has(m.id))] };
    });
  }, []);
  useEffect(() => { if (state) observe(state); }, [state, account, observe]);
  const prime = useCallback((baselines: Record<string, string>) => {
    cache.current.clear();
    for (const [key, value] of Object.entries(baselines)) cache.current.set(momentStorageKey(key), value);
    setQueue({ account: current.current.account, moments: [] });
  }, []);
  const clear = useCallback((next?: CompeteState) => {
    cache.current.clear();
    setQueue({ account: current.current.account, moments: [] });
    if (next) observe(next, true);
  }, [observe]);
  const visibleMoment = queue.account === account ? queue.moments.find(moment => moment.plan.hasOvertake || onCompete) ?? null : null;
  const acknowledge = useCallback(() => {
    setQueue(previous => previous.account === current.current.account ? { ...previous, moments: previous.moments.filter(moment => moment.id !== visibleMoment?.id) } : { account: current.current.account, moments: [] });
  }, [visibleMoment?.id]);
  return { moment: visibleMoment, remaining: queue.account === account ? queue.moments.length : 0, observe, prime, clear, acknowledge };
}
