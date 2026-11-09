"use client";
import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/auth-context";
import { useCompete } from "@/components/compete-context";
import { roundReveal, stripWebProductPrefix, type CompeteState } from "@fitness-battle/shared";
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
      social={!preview && !offlineMode && !debugActive}
      results={reveal.results}
      onDismiss={() => {
        setDismissed(true); onDismiss(reveal.ids); if(debugActive)resetDebugState?.();
        if (replay) router.replace("/app/arena");
      }}
    />
  );
}
