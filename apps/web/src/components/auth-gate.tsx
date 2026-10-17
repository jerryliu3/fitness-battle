"use client";

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
  if (loading) return <p className="fb-copy">Checking your account…</p>;
  if (user) return <>{children}</>;

  return (
    <section className="fb-card fb-auth-wall">
      <p className="fb-kicker">Account</p>
      <h1 className="fb-title">Sign in to continue</h1>
      <p className="fb-copy">{reason}</p>
      <div className="fb-stack">
        <Link href={buildSignupHref(path)} className="fb-btn">
          Create account
        </Link>
        <Link href={buildLoginHref(path)} className="fb-btn-line">
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
        <p className="fb-kicker">Join in</p>
        <h2>Create an account to compete</h2>
        <p className="fb-copy">{reason}</p>
        <div className="fb-stack">
          <Link href={buildSignupHref(next)} className="fb-btn">
            Create account
          </Link>
          <Link href={buildLoginHref(next)} className="fb-btn-line">
            Sign in
          </Link>
          <button type="button" className="fb-btn-ghost" onClick={onClose}>
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
