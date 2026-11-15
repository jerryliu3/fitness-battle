"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useMemo, useState, type ReactNode } from "react";
import { APP_ICON_PATHS, sportById, type CompeteState, type CompetitionReplaySelection } from "@fitness-battle/shared";
import { AppText } from "@/ui/section";
import { CompeteSheet } from "@/features/arena/compete-sheet";
import { CompetitionPanel } from "@/features/arena/competition-panel";
import { CompetitionTimelineControls, CompetitionTimelineProvider } from "@/features/arena/competition-timeline-context";
import { RaceUpdates } from "@/features/arena/race-updates";
import { FieldStage } from "@/features/field/components/field-stage";
import { buildFieldModel } from "@/features/field/model";
import { buildSplitBoard } from "@/features/split/model";

export function CompetitionReplayButton({
  state,
  selection,
  label = "Replay competition",
  variant = "button",
}: {
  state: CompeteState;
  selection: CompetitionReplaySelection;
  label?: string;
  variant?: "button" | "link" | "recap";
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          className={
            variant === "link"
              ? "week-recap-link-btn"
              : variant === "recap"
                ? "week-recap-secondary-btn"
                : "fb-btn-line competition-replay-trigger"
          }
        >
          {variant === "link" && (
            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d={APP_ICON_PATHS.replay} />
            </svg>
          )}
          <AppText role={variant === "recap" ? "label" : undefined}>{label}</AppText>
        </button>
      </Dialog.Trigger>
      {open && (
        <Dialog.Portal>
          <Dialog.Overlay className="competition-replay-overlay" />
          <Dialog.Content className="round-replay-dialog" aria-describedby={undefined}>
            <Dialog.Title className="fb-sr-only">{sportById(selection.sport).name} replay</Dialog.Title>
            <RoundReplayBody
              key={`${selection.sport}:${selection.track}:${selection.periodStart}:${selection.periodEnd}`}
              state={state}
              selection={selection}
              onClose={() => setOpen(false)}
            />
          </Dialog.Content>
        </Dialog.Portal>
      )}
    </Dialog.Root>
  );
}

function RoundReplayBody({
  state,
  selection,
  onClose,
}: {
  state: CompeteState;
  selection: CompetitionReplaySelection;
  onClose(): void;
}) {
  const [courseOptions, setCourseOptions] = useState<ReactNode>(null);
  const [athleteFocus, setAthleteFocus] = useState<{ id: string; request: number } | null>(null);
  const periodNow = useMemo(() => new Date(Date.parse(selection.periodEnd) - 1), [selection.periodEnd]);
  const model = useMemo(
    () => ({
      ...buildFieldModel(state, selection.sport, selection.track, periodNow),
      periodStart: selection.periodStart,
      periodEnd: selection.periodEnd,
    }),
    [state, selection.sport, selection.track, selection.periodStart, selection.periodEnd, periodNow],
  );
  const boardRows = useMemo(
    () => buildSplitBoard(state, selection.sport, selection.track, periodNow).rows,
    [state, selection.sport, selection.track, periodNow],
  );
  const sportTitle = sportById(selection.sport).name;

  return (
    <CompetitionTimelineProvider state={state} selection={selection} active replay>
      <div className="focus-arena">
        <FieldStage
          externalAthleteFocus={athleteFocus}
          onOptionsChange={setCourseOptions}
          persistent
          backgroundMode
          presentationVisible
          onExit={onClose}
          tabActive
          replayState={state}
          sportTitle={sportTitle}
          model={model}
          boardRows={boardRows}
        />
        <div className="compete-field-options">{courseOptions}</div>
        <CompeteSheet scrollable active overview={<CompetitionTimelineControls />}>
          <CompetitionPanel
            active
            standings={
              <FieldStage
                onFocusAthlete={(id) => {
                  setAthleteFocus((previous) => ({ id, request: (previous?.request ?? 0) + 1 }));
                }}
                standingsOnly
                tabActive
                replayState={state}
                sportTitle={sportTitle}
                model={model}
                boardRows={boardRows}
              />
            }
            activity={(visible) => <RaceUpdates state={state} sport={selection.sport} active={visible} />}
          />
        </CompeteSheet>
      </div>
    </CompetitionTimelineProvider>
  );
}
