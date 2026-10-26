"use client";

import { useAuth } from "@/components/auth-context";
import { buildLoginHref } from "@/lib/auth/login-redirect";
import { AppHeading, AppParagraph } from "@/ui/section";
import { OVERTAEK_SUPPORT_EMAIL } from "@fitness-battle/shared";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function DeleteAccountClient() {
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
          Sign in to delete your Overtaek account from the web. This permanently
          removes your auth record and associated data we control.
        </AppParagraph>
        <p className="fb-marketing-actions">
          <Link href={buildLoginHref("/account/delete")} className="fb-btn">
            Sign in to continue
          </Link>
        </p>
        <AppParagraph typographyRole="caption" className="fb-note">
          Prefer email? Write{" "}
          <a href={`mailto:${OVERTAEK_SUPPORT_EMAIL}`}>
            {OVERTAEK_SUPPORT_EMAIL}
          </a>{" "}
          from your account address. See also{" "}
          <Link href="/support">Support</Link>.
        </AppParagraph>
      </>
    );
  }

  return (
    <>
      <AppParagraph typographyRole="body">
        Signed in as <strong>{user.email}</strong>. This action cannot be undone.
        Your standings, crews, synced activities, and profile data tied to this
        account will be removed from our systems, subject to the limited retention
        described in our <Link href="/privacy">Privacy Policy</Link>.
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
        <Link href="/support" className="fb-btn-line">
          Cancel
        </Link>
      </div>
    </>
  );
}
