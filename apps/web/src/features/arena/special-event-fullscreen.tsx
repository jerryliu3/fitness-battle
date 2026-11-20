"use client";

import {
  competeNow,
  specialEventFormatLabel,
  specialEventPhase,
  specialEventStatusBadge,
  type CompeteState,
  type SpecialEventEdition,
} from "@fitness-battle/shared";
import { AppHeading, AppText } from "@/ui/section";
import { CoursePreview } from "./course-preview";
import { CompeteIcon } from "./event-home";
import { SpecialEventRegistrationSheet } from "./special-event-sheet";

export function SpecialEventFullscreen({
  state,
  edition,
  busy,
  error,
  onCancel,
  onClose,
}: {
  state: CompeteState;
  edition: SpecialEventEdition;
  busy: boolean;
  error: string;
  onCancel(): void;
  onClose(): void;
}) {
  const now = competeNow(state);
  const phase = specialEventPhase(edition, now);
  const status = specialEventStatusBadge(edition, now);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={edition.title}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 60,
        background: "var(--paper)",
        overflowY: "auto",
      }}
    >
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "12px 16px",
          background: "var(--paper)",
          borderBottom: "1px solid var(--line)",
        }}
      >
        <button
          type="button"
          className="fb-btn-line"
          disabled={busy}
          onClick={onClose}
        >
          ← Back
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <AppHeading role="label">{edition.title}</AppHeading>
          <AppText role="caption" secondary>
            {specialEventFormatLabel(edition.config)} · {status}
          </AppText>
        </div>
        <CompeteIcon name={edition.sport} size={24} />
      </header>

      <main style={{ maxWidth: 680, margin: "0 auto", padding: "16px 16px 48px", display: "grid", gap: 16 }}>
        <CoursePreview sport={edition.sport} queued={phase !== "active"} state={state} />
        <SpecialEventRegistrationSheet
          state={state}
          edition={edition}
          busy={busy}
          error={error}
          fullscreen
          onRegister={() => {}}
          onCancel={onCancel}
          onClose={onClose}
        />
      </main>
    </div>
  );
}
