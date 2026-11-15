import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useGlobalSearchParams } from "expo-router";
import { roundReveal, type Action, type CompeteState, type CompetitionReplay, type PeriodResult } from "@fitness-battle/shared";
import { requestApi } from "../lib/api";
import { useAthleteBlocks } from "../lib/athlete-blocks";
import { useAuth } from "../lib/auth";
import { useCompeteStore } from "../lib/compete-store";
import { mobileEnv } from "../lib/env";
import { WeekRecap } from "./week-recap";

export function RoundTakeover({
  state,
  ready,
  dispatch,
}: {
  state: CompeteState;
  ready: boolean;
  dispatch: (action: Action) => void;
}) {
  const { user, accessToken, offlineMode } = useAuth();
  const { debugActive, resetDebugState } = useCompeteStore();
  const { blocks } = useAthleteBlocks();
  const hiddenIds = useMemo(() => blocks.map((block) => block.id), [blocks]);
  const [dismissed, setDismissed] = useState(false);
  const path = usePathname();
  const router = useRouter();
  const replay = useGlobalSearchParams().results === "latest";
  useEffect(() => { setDismissed(false); }, [replay, user?.id]);
  const canLoadReplay = Boolean(user) && !offlineMode && !debugActive;
  const loadReplay = useCallback(async (result: PeriodResult): Promise<CompetitionReplay | null> => {
    if (!canLoadReplay) return null;
    const query = `sport=${result.sport}&track=${result.track}&start=${encodeURIComponent(result.periodStart)}&end=${encodeURIComponent(result.periodEnd)}`;
    return requestApi<CompetitionReplay>(mobileEnv.apiUrl, accessToken, `/api/compete/replay?${query}`);
  }, [canLoadReplay, accessToken]);
  const reveal = roundReveal(
    replay
      ? {
          ...state,
          periodResults: state.periodResults.map((row) => ({
            ...row,
            acknowledgedAt: null,
          })),
        }
      : state,
  );
  if (dismissed || !ready || path !== "/arena" || !replay || !reveal) return null;
  return (
    <WeekRecap
      key={`${user?.id ?? "guest"}:${reveal.key}`}
      state={state}
      results={reveal.results}
      social={canLoadReplay}
      hiddenIds={hiddenIds}
      loadReplay={canLoadReplay ? loadReplay : undefined}
      onClose={() => {
        setDismissed(true);
        dispatch({ type: "acknowledge-reveal", revealIds: reveal.ids });
        if (debugActive) resetDebugState?.();
        if (replay) router.replace("/arena");
      }}
    />
  );
}
