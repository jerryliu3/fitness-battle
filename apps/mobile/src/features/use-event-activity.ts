import { useEffect, useMemo, useState } from "react";
import { competeNow, competePeriodWindow, competitionTrack, competitionActivityLog, indexCompetitionReplay, localCompetitionReplay, type CompetitionReplay, type CompeteState, type SportId } from "@fitness-battle/shared";
import { useAuth } from "../lib/auth";
import { useCompeteStore } from "../lib/compete-store";
import { useAthleteBlocks } from "../lib/athlete-blocks";
import { requestApi } from "../lib/api";
import { mobileEnv } from "../lib/env";

export function useEventActivity(state: CompeteState, sport: SportId, active: boolean) {
  const { user, accessToken, offlineMode } = useAuth();
  const { accountKey, debugActive } = useCompeteStore();
  const { blocks } = useAthleteBlocks();
  const period = competePeriodWindow(state, competeNow(state), sport);
  const start = period.startsAt.toISOString(), end = period.endsAt.toISOString(), track = competitionTrack(sport);
  const key = `${user?.id ?? "guest"}:${accountKey}:${offlineMode}:${debugActive}:${sport}:${track}:${start}:${end}`;
  const [load, setLoad] = useState<{ key: string; data?: CompetitionReplay; error?: string } | null>(null);
  const [attempt, retry] = useState(0);
  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    setLoad({ key });
    const selection = { sport, track, periodStart: start, periodEnd: end };
    if (!user || offlineMode || debugActive) { setLoad({ key, data: localCompetitionReplay(state, selection) }); return; }
    const query = `sport=${sport}&track=${track}&start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`;
    void requestApi<CompetitionReplay>(mobileEnv.apiUrl, accessToken, `/api/compete/replay?${query}`).then(data => { if (!cancelled) setLoad({ key, data }); }).catch(() => { if (!cancelled) setLoad({ key, error: "Could not load race updates." }); });
    return () => { cancelled = true; };
  }, [key, active, user?.id, accessToken, offlineMode, state.activities, state.enrollments, state.demoNow, attempt]);
  const data = active && load?.key === key ? load.data : undefined;
  const index = useMemo(() => data ? indexCompetitionReplay(data, state.units) : null, [data, state.units]);
  const rows = useMemo(() => index ? competitionActivityLog(index, blocks.map(block => block.id)) : [], [index, blocks]);
  const error = load?.key === key ? load.error : undefined;
  return { rows, loading: !index, error, scope: data?.scope, retry: () => retry(value => value + 1) };
}
