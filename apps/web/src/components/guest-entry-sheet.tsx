"use client";

import { buildLoginHref, buildSignupHref } from "@/lib/auth/login-redirect";
import Link from "next/link";
import { AppParagraph, SectionHeader } from "@/ui/section";
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
      title="Join in"
      body="Create an account to compete and keep your progress."
      onClose={onClose}
      preventAutoFocus
    >
      <SectionHeader title="Sign in to continue" />
      <AppParagraph typographyRole="body" className="fb-copy" style={{ marginBottom: 16 }}>
        {reason}
      </AppParagraph>
      <div className="fb-row" style={{ width: "100%", gap: 10, marginBottom: 10 }}>
        <Link
          href={buildSignupHref(nextPath)}
          className="fb-btn"
          style={{ flex: 1, textAlign: "center" }}
        >
          Create account
        </Link>
        <Link
          href={buildLoginHref(nextPath)}
          className="fb-btn-line"
          style={{ flex: 1, textAlign: "center" }}
        >
          Sign in
        </Link>
      </div>
      <button type="button" className="fb-btn-ghost" onClick={onClose} style={{ width: "100%" }}>
        Keep browsing
      </button>
    </Sheet>
  );
}