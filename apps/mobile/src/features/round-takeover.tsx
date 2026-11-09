import { useEffect, useState } from "react";
import { usePathname, useRouter, useGlobalSearchParams } from "expo-router";
import { roundReveal, type Action, type CompeteState } from "@fitness-battle/shared";
import { useAuth } from "../lib/auth";
import { useCompeteStore } from "../lib/compete-store";
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
  const { user, offlineMode } = useAuth();
  const {debugActive,resetDebugState}=useCompeteStore();
  const [dismissed,setDismissed]=useState(false);
  const path = usePathname();
  const router = useRouter();
  const replay = useGlobalSearchParams().results === "latest";
  useEffect(() => { setDismissed(false); }, [replay, user?.id]);
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
  if(dismissed || !ready || path !== "/arena" || !replay || !reveal) return null;
  return (
    <WeekRecap
      key={`${user?.id ?? "guest"}:${reveal.key}`}
      state={state}
      results={reveal.results}
      social={Boolean(user) && !offlineMode && !debugActive}
      onClose={() => {
        setDismissed(true);
        dispatch({ type: "acknowledge-reveal", revealIds: reveal.ids });if(debugActive)resetDebugState?.();
        if (replay) router.replace("/arena");
      }}
    />
  );
}
