"use client";

import { buildLoginHref, buildSignupHref } from "@/lib/auth/login-redirect";
import { GUEST_ENTRY_COPY } from "@fitness-battle/shared";
import Link from "next/link";
import { AppParagraph } from "@/ui/section";
import { Sheet } from "@/ui/sheet";

interface GuestEntrySheetProps {
  open: boolean;
  reason: string;
  nextPath: string;
  onClose: () => void;
}

/** Bottom-sheet sign-up prompt for signed-out visitors on deep-linked pages. */
export function GuestEntrySheet({ open, reason, nextPath, onClose }: GuestEntrySheetProps) {
  return (
    <Sheet
      open={open}
      title={GUEST_ENTRY_COPY.sheetTitle}
      body={GUEST_ENTRY_COPY.sheetBody}
      onClose={onClose}
      preventAutoFocus
    >
      <AppParagraph typographyRole="body" className="fb-copy" style={{ marginBottom: 16 }}>
        {reason}
      </AppParagraph>
      <div className="fb-row" style={{ width: "100%", gap: 10, marginBottom: 10 }}>
        <Link
          href={buildSignupHref(nextPath)}
          className="fb-btn"
          style={{ flex: 1, textAlign: "center" }}
        >
          {GUEST_ENTRY_COPY.createAccount}
        </Link>
        <Link
          href={buildLoginHref(nextPath)}
          className="fb-btn-line"
          style={{ flex: 1, textAlign: "center" }}
        >
          {GUEST_ENTRY_COPY.signIn}
        </Link>
      </div>
      <button type="button" className="fb-btn-ghost" onClick={onClose} style={{ width: "100%" }}>
        {GUEST_ENTRY_COPY.keepBrowsing}
      </button>
    </Sheet>
  );
}