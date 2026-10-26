"use client";

import { useAuth } from "@/components/auth-context";
import { buildLoginHref } from "@/lib/auth/login-redirect";
import { AppParagraph } from "@/ui/section";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

const SUPPORT_EMAIL = "support@overtaek.xyz";

export function DeleteAccountSection() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const phrase = "DELETE";
  const ready = confirm.trim().toUpperCase() === phrase;

  async function onDelete() {
    if (!user || busy || !ready) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/account", { method: "DELETE" });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(
          (body as { error?: string } | null)?.error ||
            "Could not delete your account. Please try again.",
        );
      }
      await signOut();
      router.replace("/?deleted=1");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <AppParagraph typographyRole="body" className="fb-copy">
        Loading…
      </AppParagraph>
    );
  }

  if (!user) {
    return (
      <>
        <AppParagraph typographyRole="body">
          Sign in below to delete your account from the web without reinstalling
          the mobile app.
        </AppParagraph>
        <p className="fb-marketing-actions">
          <Link
            href={buildLoginHref("/support#delete-account")}
            className="fb-btn"
          >
            Sign in to delete account
          </Link>
        </p>
        <AppParagraph typographyRole="caption" className="fb-note">
          Or email{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> from your
          account address.
        </AppParagraph>
      </>
    );
  }

  return (
    <>
      <AppParagraph typographyRole="body">
        Signed in as <strong>{user.email}</strong>. This cannot be undone.
      </AppParagraph>
      <label className="fb-field">
        Type {phrase} to confirm
        <input
          type="text"
          autoComplete="off"
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
          aria-label={`Type ${phrase} to confirm account deletion`}
        />
      </label>
      {error ? (
        <AppParagraph typographyRole="body" className="fb-error" role="alert">
          {error}
        </AppParagraph>
      ) : null}
      <div className="fb-marketing-actions">
        <button
          type="button"
          className="fb-btn"
          disabled={!ready || busy}
          onClick={() => void onDelete()}
        >
          {busy ? "Deleting…" : "Permanently delete account"}
        </button>
      </div>
    </>
  );
}
