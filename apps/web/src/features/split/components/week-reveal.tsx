"use client";
import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/auth-context";
import { useCompete } from "@/components/compete-context";
import { roundReveal, stripWebProductPrefix, type CompeteState, type CompetitionReplay, type PeriodResult } from "@fitness-battle/shared";
import { WeekRecap } from "./week-recap";

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
  const {debugActive,lastDebugEvent,resetDebugState}=useCompete();
  const [dismissed,setDismissed]=useState(false);
  const path = usePathname();
  const router = useRouter();
  const openingDebug=debugActive&&lastDebugEvent?.id==="week-closing";
  const debugNonce = openingDebug ? lastDebugEvent?.nonce : null;
  const replay = useSearchParams().get("results") === "latest" && !preview;
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
  useEffect(() => { setDismissed(false); }, [replay, user?.id, debugNonce]);
  const reveal = roundReveal(
    (replay||openingDebug)
      ? {
          ...state,
          periodResults: state.periodResults.map((row) => ({
            ...row,
            acknowledgedAt: null,
          })),
        }
      : state,
  );
  if (dismissed || !ready || (!preview && (stripWebProductPrefix(path) !== "/arena" || !(replay||openingDebug))) || !reveal) return null;
  return (
    <WeekRecap
      key={`${user?.id ?? "guest"}:${reveal.key}:${openingDebug?lastDebugEvent?.nonce:"saved"}`}
      state={state}
      social={live}
      results={reveal.results}
      loadReplay={loadReplay}
      onDismiss={() => {
        setDismissed(true); onDismiss(reveal.ids); if(debugActive)resetDebugState?.();
        if (replay) router.replace("/app/arena");
      }}
    />
  );
}
