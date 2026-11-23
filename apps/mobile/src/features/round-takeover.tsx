import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useGlobalSearchParams } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  nonRaceWeekBreakdownTarget, roundReveal, settledWeekBreakdownTarget,
  type Action, type CompeteState, type CompetitionReplay, type PeriodResult,
} from "@fitness-battle/shared";
import { requestApi } from "../lib/api";
import { useAthleteBlocks } from "../lib/athlete-blocks";
import { useAuth } from "../lib/auth";
import { useCompeteStore } from "../lib/compete-store";
import { mobileEnv } from "../lib/env";
import { useBootOpened } from "../ui/boot-readiness";
import { WeekRecap } from "./week-recap";

const DISMISSED_BREAKDOWN_KEY = "@overtaek/dismissed_week_breakdown";

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
  const bootOpened = useBootOpened();
  const { debugActive, resetDebugState } = useCompeteStore();
  const { blocks } = useAthleteBlocks();
  const hiddenIds = useMemo(() => blocks.map((block) => block.id), [blocks]);
  const [dismissed, setDismissed] = useState(false);
  const [dismissedBreakdown, setDismissedBreakdown] = useState<string | null>(null);
  const path = usePathname();
  const router = useRouter();
  const params = useGlobalSearchParams();
  const replay = params.results === "latest";
  const breakdownRequested = params.breakdown === "latest";

  useEffect(() => { setDismissed(false); }, [replay, breakdownRequested, user?.id]);
  useEffect(() => {
    void AsyncStorage.getItem(DISMISSED_BREAKDOWN_KEY).then((val) => {
      if (val) setDismissedBreakdown(val);
    }).catch(() => {});
  }, []);

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
  const autoBreakdown = !replay && !reveal ? nonRaceWeekBreakdownTarget(state, debugActive || offlineMode ? undefined : user?.createdAt ?? "") : null;
  const manualBreakdown = breakdownRequested ? settledWeekBreakdownTarget(state) : null;
  const breakdownTarget = manualBreakdown ?? (autoBreakdown && autoBreakdown.periodStart !== dismissedBreakdown ? autoBreakdown : null);

  if (dismissed || !ready || !bootOpened || path !== "/arena") return null;
  if (replay && reveal) {
    return (
      <WeekRecap
        key={`${user?.id ?? "guest"}:${reveal.key}`}
        state={state}
        results={reveal.results}
        social={canLoadReplay}
        debug={debugActive}
        dispatch={dispatch}
        hiddenIds={hiddenIds}
        loadReplay={canLoadReplay ? loadReplay : undefined}
        onClose={() => {
          setDismissed(true);
          dispatch({ type: "acknowledge-reveal", revealIds: reveal.ids });
          if (debugActive) resetDebugState?.();
          router.replace("/arena");
        }}
      />
    );
  }
  if (!breakdownTarget) return null;
  return (
    <WeekRecap
      key={`${user?.id ?? "guest"}:breakdown:${breakdownTarget.periodStart}`}
      state={state}
      results={[]}
      nonRaceWeek={breakdownTarget}
      social={false}
      debug={debugActive}
      dispatch={dispatch}
      hiddenIds={hiddenIds}
      onClose={() => {
        setDismissed(true);
        setDismissedBreakdown(breakdownTarget.periodStart);
        void AsyncStorage.setItem(DISMISSED_BREAKDOWN_KEY, breakdownTarget.periodStart).catch(() => {});
        if (breakdownRequested) router.replace("/arena");
      }}
    />
  );
}
