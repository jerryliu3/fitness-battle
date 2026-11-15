"use client";
import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/auth-context";
import { useCompete } from "@/components/compete-context";
import { useBootOpened } from "@/shell/boot-readiness";
import {
  nonRaceWeekBreakdownTarget, roundReveal, settledWeekBreakdownTarget, stripWebProductPrefix,
  type CompeteState, type CompetitionReplay, type PeriodResult,
} from "@fitness-battle/shared";
import { WeekRecap } from "./week-recap";

const DISMISSED_BREAKDOWN_KEY = "overtaek:dismissed_week_breakdown";

export function WeekReveal({
  state,
  ready,
  preview = false,
  onDismiss,
}: {
  state: CompeteState;
  ready: boolean;
  preview?: boolean;
  onDismiss: (revealIds: string[]) => void;
}) {
  const { user, offlineMode } = useAuth();
  const bootOpened = useBootOpened();
  const { dispatch, debugActive, lastDebugEvent, resetDebugState } = useCompete();
  const [dismissed, setDismissed] = useState(false);
  const [dismissedBreakdown, setDismissedBreakdown] = useState<string | null>(() =>
    typeof window !== "undefined" ? window.localStorage.getItem(DISMISSED_BREAKDOWN_KEY) : null,
  );
  const path = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const openingDebug = debugActive && lastDebugEvent?.id === "week-closing";
  const debugNonce = openingDebug ? lastDebugEvent?.nonce : null;
  const replay = searchParams.get("results") === "latest" && !preview;
  const breakdownRequested = !replay && searchParams.get("breakdown") === "latest" && !preview;
  const live = Boolean(user) && !offlineMode && !debugActive && !preview;
  const loadReplay = useCallback(async (result: PeriodResult): Promise<CompetitionReplay | null> => {
    if (!live) return null;
    const query = new URLSearchParams({
      sport: result.sport,
      track: result.track,
      start: result.periodStart,
      end: result.periodEnd,
    });
    const response = await fetch(`/api/compete/replay?${query}`, { cache: "no-store" });
    if (!response.ok) return null;
    return (await response.json()) as CompetitionReplay;
  }, [live]);
  useEffect(() => { setDismissed(false); }, [replay, breakdownRequested, user?.id, debugNonce]);

  const reveal = roundReveal(
    (replay || openingDebug)
      ? {
          ...state,
          periodResults: state.periodResults.map((row) => ({
            ...row,
            acknowledgedAt: null,
          })),
        }
      : state,
  );
  const onArena = stripWebProductPrefix(path) === "/arena";
  const autoBreakdown = onArena && !preview && !replay && !reveal ? nonRaceWeekBreakdownTarget(state) : null;
  const manualBreakdown = breakdownRequested ? settledWeekBreakdownTarget(state) : null;
  const breakdownTarget = manualBreakdown ?? (autoBreakdown && autoBreakdown.periodStart !== dismissedBreakdown ? autoBreakdown : null);

  if (dismissed || !ready || !bootOpened || (!preview && !onArena)) return null;
  if ((preview || replay || openingDebug) && reveal) {
    return (
      <WeekRecap
        key={`${user?.id ?? "guest"}:${reveal.key}:${openingDebug ? lastDebugEvent?.nonce : "saved"}`}
        state={state}
        social={live}
        dispatch={dispatch}
        results={reveal.results}
        loadReplay={loadReplay}
        onDismiss={() => {
          setDismissed(true);
          onDismiss(reveal.ids);
          if (debugActive) resetDebugState?.();
          if (replay) router.replace("/arena");
        }}
      />
    );
  }
  if (!breakdownTarget) return null;
  return (
    <WeekRecap
      key={`${user?.id ?? "guest"}:breakdown:${breakdownTarget.periodStart}`}
      state={state}
      social={false}
      dispatch={dispatch}
      results={[]}
      nonRaceWeek={breakdownTarget}
      onDismiss={() => {
        setDismissed(true);
        setDismissedBreakdown(breakdownTarget.periodStart);
        if (typeof window !== "undefined") window.localStorage.setItem(DISMISSED_BREAKDOWN_KEY, breakdownTarget.periodStart);
        if (breakdownRequested) router.replace("/arena");
      }}
    />
  );
}
