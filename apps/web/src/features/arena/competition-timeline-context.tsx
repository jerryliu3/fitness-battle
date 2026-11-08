"use client";
import { createContext, useContext, type ReactNode } from "react";
import type { CompeteState, CompetitionReplaySelection } from "@fitness-battle/shared";
import { useFieldTimeline, type FieldTimelineState } from "@/features/replay/use-field-timeline";
import { FieldTimeline } from "@/features/replay/field-timeline";
const Context = createContext<FieldTimelineState | undefined>(undefined);
export const useCompetitionTimeline = () => useContext(Context);
export function CompetitionTimelineProvider({ state, selection, active, children }: { state: CompeteState; selection: CompetitionReplaySelection; active: boolean; children: ReactNode }) {
  const timeline = useFieldTimeline(state, selection, active);
  return <Context.Provider value={timeline}>{children}</Context.Provider>;
}
export function CompetitionTimelineControls() {
  const timeline = useCompetitionTimeline();
  return timeline ? <FieldTimeline timeline={timeline} /> : null;
}
