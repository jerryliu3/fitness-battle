"use client";

import { AppHeading, AppParagraph } from "@/ui/section";
import type { CrewInvitePreviewPayload } from "@fitness-battle/shared";
import { CrewInvitePreview } from "./crew-invite-preview";

export function CrewInviteLanding({
  inviteCode,
  loading,
  loadError,
  preview,
  joinBusy,
  joinError,
  onAccept,
  onDecline,
  onDismissError,
}: {
  inviteCode: string;
  loading: boolean;
  loadError: string | null;
  preview: CrewInvitePreviewPayload | null;
  joinBusy: boolean;
  joinError?: string | null;
  onAccept: () => void;
  onDecline: () => void;
  onDismissError: () => void;
}) {
  if (!inviteCode) return null;

  return (
    <>
      {loading ? (
        <AppParagraph typographyRole="body" className="fb-copy">
          Loading your invitation…
        </AppParagraph>
      ) : null}
      {loadError ? (
        <section className="focus-card crew-invite-error">
          <AppHeading level={2} role="heading">
            Invitation unavailable
          </AppHeading>
          <AppParagraph typographyRole="body" className="fb-copy" style={{ marginBottom: 16 }}>
            {loadError}
          </AppParagraph>
          <button type="button" className="fb-btn-line" onClick={onDismissError}>
            Dismiss
          </button>
        </section>
      ) : null}
      {preview ? (
        <CrewInvitePreview
          preview={preview}
          busy={joinBusy}
          error={joinError}
          onAccept={onAccept}
          onDecline={onDecline}
        />
      ) : null}
    </>
  );
}