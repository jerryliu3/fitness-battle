"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth-context";

export const PENDING_CREW_INVITE_KEY = "fb:pending-crew-invite:v1";
export const PENDING_CREW_ACCEPT_KEY = "fb:pending-crew-accept:v1";

export function readPendingCrewAccept(): boolean {
  if (typeof sessionStorage === "undefined") return false;
  try {
    return sessionStorage.getItem(PENDING_CREW_ACCEPT_KEY) === "1";
  } catch {
    return false;
  }
}

export function stashPendingCrewAccept(pending: boolean) {
  if (typeof sessionStorage === "undefined") return;
  try {
    if (pending) sessionStorage.setItem(PENDING_CREW_ACCEPT_KEY, "1");
    else sessionStorage.removeItem(PENDING_CREW_ACCEPT_KEY);
  } catch {
    /* ignore */
  }
}
const DISMISS_PREFIX = "fb:guest-entry-dismiss:v1:";

function dismissKey(path: string) {
  return `${DISMISS_PREFIX}${path}`;
}

export function readPendingCrewInvite(): string | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    return sessionStorage.getItem(PENDING_CREW_INVITE_KEY)?.trim() || null;
  } catch {
    return null;
  }
}

export function stashPendingCrewInvite(code: string | null | undefined) {
  if (typeof sessionStorage === "undefined") return;
  try {
    const trimmed = code?.trim();
    if (!trimmed) sessionStorage.removeItem(PENDING_CREW_INVITE_KEY);
    else sessionStorage.setItem(PENDING_CREW_INVITE_KEY, trimmed.toUpperCase());
  } catch {
    /* ignore quota */
  }
}

export function clearPendingCrewInvite() {
  stashPendingCrewInvite(null);
}

function isDismissed(path: string) {
  if (typeof sessionStorage === "undefined") return false;
  try {
    return sessionStorage.getItem(dismissKey(path)) === "1";
  } catch {
    return false;
  }
}

function rememberDismiss(path: string) {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(dismissKey(path), "1");
  } catch {
    /* ignore */
  }
}

export function isMobileWebClient() {
  if (typeof navigator === "undefined") return false;
  return /android|iphone|ipad|ipod/i.test(navigator.userAgent);
}

/** Invasive guest CTA shown once per destination until dismissed or the user signs in. */
export function useGuestEntryPrompt(options: {
  enabled?: boolean;
  nextPath: string;
  reason: string;
}) {
  const { user, loading } = useAuth();
  const { enabled = true, nextPath } = options;
  const [dismissed, setDismissed] = useState(() => isDismissed(nextPath));
  const open = useMemo(() => {
    if (!enabled || loading || user || dismissed) return false;
    return true;
  }, [dismissed, enabled, loading, user]);

  useEffect(() => {
    if (user) setDismissed(false);
  }, [user]);

  const dismiss = useCallback(() => {
    rememberDismiss(nextPath);
    setDismissed(true);
  }, [nextPath]);

  return { open, dismiss, reopen: () => setDismissed(false) };
}