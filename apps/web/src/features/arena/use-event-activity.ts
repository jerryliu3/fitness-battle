"use client";
import { useEffect, useMemo, useState } from "react";
import { competeNow, competePeriodWindow, competitionTrack, competitionActivityLog, indexCompetitionReplay, localCompetitionReplay, type CompetitionReplay, type CompeteState, type SportId } from "@fitness-battle/shared";
import { useAuth } from "@/components/auth-context";
import { useCompete } from "@/components/compete-context";

export function useEventActivity(state: CompeteState, sport: SportId, active: boolean) {
  const { user, offlineMode } = useAuth();
  const { debugActive } = useCompete();
  const period = competePeriodWindow(state, competeNow(state), sport);
  const start = period.startsAt.toISOString(), end = period.endsAt.toISOString(), track = competitionTrack(sport);
  const key = `${user?.id ?? "guest"}:${offlineMode}:${debugActive}:${sport}:${track}:${start}:${end}`;
  const [load, setLoad] = useState<{ key: string; data?: CompetitionReplay; error?: string } | null>(null);
  const [attempt, retry] = useState(0);
  useEffect(() => {
    if (!active) return;
    const controller = new AbortController();
    let cancelled = false;
    setLoad({ key });
    const selection = { sport, track, periodStart: start, periodEnd: end };
    if (!user || offlineMode || debugActive) { setLoad({ key, data: localCompetitionReplay(state, selection) }); return; }
    const timeout = setTimeout(() => controller.abort(), 20_000);
    const query = new URLSearchParams({ sport, track, start, end });
    void fetch(`/api/compete/replay?${query}`, { signal: controller.signal, cache: "no-store" }).then(async response => {
      if (!response.ok) throw new Error("Updates unavailable");
      return response.json() as Promise<CompetitionReplay>;
    }).then(data => { if (!cancelled) setLoad({ key, data }); }).catch(() => { if (!cancelled) setLoad({ key, error: "Could not load race updates." }); }).finally(() => clearTimeout(timeout));
    return () => { cancelled = true; clearTimeout(timeout); controller.abort(); };
  }, [key, active, user?.id, offlineMode, state.activities, state.enrollments, state.demoNow, attempt]);
  const data = active && load?.key === key ? load.data : undefined;
  const index = useMemo(() => data ? indexCompetitionReplay(data, state.units) : null, [data, state.units]);
  const rows = useMemo(() => index ? competitionActivityLog(index) : [], [index]);
  const error = load?.key === key ? load.error : undefined;
  return { rows, loading: !index, error, scope: data?.scope, retry: () => retry(value => value + 1) };
}
