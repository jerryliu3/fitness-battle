import { usePathname } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { competitionMoments, competitionMomentSnapshots, momentStorageKey, type CompetitionMoment, type CompeteState } from "@fitness-battle/shared";

function receiptIds(raw: string | null): string[] {
  try {
    const parsed = JSON.parse(raw ?? "[]");
    return Array.isArray(parsed) ? parsed.filter(id => typeof id === "string") : [];
  } catch { return []; }
}

/** Root-owned event queue. Scene browsing and event acknowledgement are independent. */
export function useCompetitionExperience(
  state: CompeteState | null,
  account: string,
  read: (key: string) => string | null,
  write: (key: string, value: string) => void,
  authoritativeOvertakes = false,
) {
  const path = usePathname();
  const onCompete = path === "/arena" || path.endsWith("/arena");
  const current = useRef({ account, read, write, authoritativeOvertakes });
  current.current = { account, read, write, authoritativeOvertakes };
  const delivered = useRef(new Set<string>());
  const owner = useRef(account);
  const cache = useRef(new Map<string, string>());
  const [queue, setQueue] = useState<{ account: string; moments: CompetitionMoment[] }>({ account, moments: [] });
  if (owner.current !== account) {
    owner.current = account;
    cache.current.clear();
    delivered.current.clear();
  }
  const observe = useCallback((next: CompeteState, quiet = false) => {
    const c = current.current;
    const readValue = (key: string) => cache.current.get(key) ?? c.read(key);
    const detected = competitionMoments(next, c.account, readValue);
    const seen = receiptIds(c.read(`fb-overtake-seen:${c.account}`));
    const committed = (c.authoritativeOvertakes ? next.committedOvertakeMoments ?? [] : []).filter(moment => !delivered.current.has(moment.id) && !seen.includes(moment.id));
    if (quiet && committed.length) c.write(`fb-overtake-seen:${c.account}`, JSON.stringify([...seen, ...committed.map(moment => moment.id)].slice(-100)));
    for (const moment of committed) delivered.current.add(moment.id);
    const moments = quiet ? [] : c.authoritativeOvertakes
      ? [...detected.filter(moment => !moment.plan.hasOvertake), ...committed]
      : detected;
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
    if (visibleMoment?.id.startsWith("overtake:")) {
      const c = current.current;
      const seen = receiptIds(c.read(`fb-overtake-seen:${c.account}`));
      c.write(`fb-overtake-seen:${c.account}`, JSON.stringify([...new Set([...seen, visibleMoment.id])].slice(-100)));
    }
    setQueue(previous => previous.account === current.current.account ? { ...previous, moments: previous.moments.filter(moment => moment.id !== visibleMoment?.id) } : { account: current.current.account, moments: [] });
  }, [visibleMoment?.id]);
  return { moment: visibleMoment, remaining: queue.account === account ? queue.moments.length : 0, observe, prime, clear, acknowledge };
}
