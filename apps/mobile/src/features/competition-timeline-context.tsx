import { createContext, useContext, type ReactNode } from "react";
import type { CompeteState, CompetitionReplaySelection } from "@fitness-battle/shared";
import { useFieldTimeline, type FieldTimelineState } from "./use-field-timeline";
import { FieldTimeline } from "./field-timeline";

const Context = createContext<FieldTimelineState | undefined>(undefined);
export const useCompetitionTimeline = () => useContext(Context);
export function CompetitionTimelineProvider({ state, selection, enabled, active, children }: { state: CompeteState; selection: CompetitionReplaySelection; enabled: boolean; active: boolean; children: ReactNode }) {
  const timeline = useFieldTimeline(enabled ? state : undefined, selection, enabled && active);
  return <Context.Provider value={enabled ? timeline : undefined}>{children}</Context.Provider>;
}
export function CompetitionTimelineControls() {
  const timeline = useCompetitionTimeline();
  return timeline ? <FieldTimeline timeline={timeline} compact /> : null;
}
