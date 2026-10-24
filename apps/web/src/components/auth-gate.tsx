"use client";
import { AppParagraph, SectionHeader, AppHeading } from "@/ui/section";


import { buildLoginHref, buildSignupHref } from "@/lib/auth/login-redirect";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "./auth-context";

interface AuthGateProps {
  /** Short reason shown above the CTAs. */
  reason: string;
  children: ReactNode;
  /** When true, render children only when signed in; otherwise show the wall. */
  require?: boolean;
}

/** Full-page wall for routes that must be authenticated (You, onboarding). */
export function AuthGate({ reason, children, require = true }: AuthGateProps) {
  const { user, loading } = useAuth();
  const path = usePathname();

  if (!require) return <>{children}</>;
  if (loading) return <AppParagraph typographyRole="body" className="fb-copy">Checking your account…</AppParagraph>;
  if (user) return <>{children}</>;

  return (
    <section className="fb-card fb-auth-wall">
      <AppParagraph typographyRole="badgeLabel" className="fb-kicker">Account</AppParagraph>
      <AppHeading level={1} role="pageTitle" className="fb-title">Sign in to continue</AppHeading>
      <AppParagraph typographyRole="body" className="fb-copy">{reason}</AppParagraph>
      <div className="fb-row" style={{ width: "100%", gap: 10 }}>
        <Link
          href={buildSignupHref(path)}
          className="fb-btn"
          style={{ flex: 1, textAlign: "center" }}
        >
          Create account
        </Link>
        <Link
          href={buildLoginHref(path)}
          className="fb-btn-line"
          style={{ flex: 1, textAlign: "center" }}
        >
          Sign in
        </Link>
      </div>
    </section>
  );
}

interface AuthPromptProps {
  open: boolean;
  reason: string;
  nextPath?: string;
  onClose: () => void;
}

/** Modal prompt when a guest hits Join / participate. Portals to body to stay on top of all sheets. */
export function AuthPrompt({ open, reason, nextPath, onClose }: AuthPromptProps) {
  const path = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;
  const next = nextPath ?? path;

  const content = (
    <div className="fb-modal" role="dialog" aria-modal="true" aria-label="Sign in">
      <button type="button" className="fb-modal-backdrop" onClick={onClose} aria-label="Close" />
      <div className="fb-modal-card">
        <AppParagraph typographyRole="badgeLabel" className="fb-kicker">Join in</AppParagraph>
        <SectionHeader title="Create an account to compete"/>
        <AppParagraph typographyRole="body" className="fb-copy">{reason}</AppParagraph>
        <div className="fb-stack">
          <div className="fb-row" style={{ width: "100%", gap: 10 }}>
            <Link
              href={buildSignupHref(next)}
              className="fb-btn"
              style={{ flex: 1, textAlign: "center" }}
            >
              Create account
            </Link>
            <Link
              href={buildLoginHref(next)}
              className="fb-btn-line"
              style={{ flex: 1, textAlign: "center" }}
            >
              Sign in
            </Link>
          </div>
          <button
            type="button"
            className="fb-btn-ghost"
            onClick={onClose}
            style={{ width: "100%", textAlign: "center" }}
          >
            Keep browsing
          </button>
        </div>
      </div>
    </div>
  );

  if (!mounted || typeof document === "undefined") {
    return content;
  }

  return createPortal(content, document.body);
}
