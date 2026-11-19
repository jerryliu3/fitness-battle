"use client";
import { AppParagraph, AppHeading } from "@/ui/section";

import {
  GUEST_INTRO_DRAFT_KEY,
  GUEST_OAUTH_SIGNUP_PENDING,
  GUEST_SIGNUP_PENDING_KEY,
} from "@fitness-battle/shared";
import { readGuestIntroDraft } from "@/lib/guest-intro";
import { useAuth } from "@/components/auth-context";
import { SocialAuthButtons } from "@/components/social-auth-buttons";
import {
  buildLoginHref,
  resolveSafePostLoginPath,
} from "@/lib/auth/login-redirect";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useState } from "react";

function SignupForm() {
  const {
    signUp,
    signInWithGoogle,
    signInWithApple,
    offlineMode,
    user,
    loading,
  } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const callbackError = searchParams.get("error");
  const next = resolveSafePostLoginPath(searchParams.get("next"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const displayError = error ?? callbackError;

  useEffect(() => { setDisplayName(readGuestIntroDraft()?.name ?? ""); }, []);

  const setupHref = `/app/onboarding?next=${encodeURIComponent(next)}`;
  const welcomeHref = `/app/welcome?next=${encodeURIComponent(next)}`;
  useEffect(() => {
    if (loading || !user || busy) return;
    router.replace(setupHref);
  }, [loading, user, busy, setupHref, router]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const guest = readGuestIntroDraft();
      if (guest?.introCompleted) try {
        localStorage.setItem(GUEST_INTRO_DRAFT_KEY, JSON.stringify({ ...guest, name: displayName.trim() || guest.name }));
        localStorage.setItem(GUEST_SIGNUP_PENDING_KEY, email.trim().toLowerCase());
      } catch {}
      const result = await signUp({ email, password, displayName });
      if (result.error) {
        try { localStorage.removeItem(GUEST_SIGNUP_PENDING_KEY); } catch {}
        setError(result.error);
        setBusy(false);
        return;
      }
      if (result.needsEmailConfirm) {
        setMessage("Account created. Check your email to confirm, then sign in.");
        setBusy(false);
        return;
      }
      router.replace(guest?.introCompleted ? setupHref : welcomeHref);
    } catch (err) {
      try { localStorage.removeItem(GUEST_SIGNUP_PENDING_KEY); } catch {}
      setError(err instanceof Error ? err.message : "Could not create the account.");
      setBusy(false);
    }
  }

  async function submitSocial(provider: "google" | "apple") {
    if (busy) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const guest = readGuestIntroDraft();
      if (guest?.introCompleted) {
        try {
          localStorage.setItem(
            GUEST_INTRO_DRAFT_KEY,
            JSON.stringify({ ...guest, name: displayName.trim() || guest.name }),
          );
          localStorage.setItem(GUEST_SIGNUP_PENDING_KEY, GUEST_OAUTH_SIGNUP_PENDING);
        } catch {}
      }
      const action = provider === "google" ? signInWithGoogle : signInWithApple;
      const result = await action?.({ next, from: "signup" });
      if (result?.error) {
        try { localStorage.removeItem(GUEST_SIGNUP_PENDING_KEY); } catch {}
        setError(result.error);
        setBusy(false);
      }
    } catch (err) {
      try { localStorage.removeItem(GUEST_SIGNUP_PENDING_KEY); } catch {}
      setError(err instanceof Error ? err.message : "Could not create the account.");
      setBusy(false);
    }
  }

  return (
    <section className="fb-card fb-auth-card">
      <AppParagraph typographyRole="label" className="fb-kicker">overtaek</AppParagraph>
      <AppHeading level={1} role="display" className="fb-title">Create account</AppHeading>
      <AppParagraph typographyRole="body" className="fb-copy">
        Save your athlete, then connect your trackers and finish setup.
      </AppParagraph>
      <form className="fb-stack" onSubmit={onSubmit}>
        <label className="fb-field">
          Display name
          <input
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            placeholder="Alex"
            maxLength={80}
          />
        </label>
        <label className="fb-field">
          Email
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>
        <label className="fb-field">
          Password
          <input
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            minLength={6}
          />
        </label>
        {displayError ? (
          <AppParagraph typographyRole="body" className="fb-error" role="alert" aria-live="assertive">
            {displayError}
          </AppParagraph>
        ) : null}
        {message ? (
          <AppParagraph typographyRole="caption" className="fb-note" role="status" aria-live="polite">
            {message}
          </AppParagraph>
        ) : null}
        <button type="submit" className="fb-btn" disabled={busy}>
          {busy ? "Creating…" : "Create account"}
        </button>
      </form>
      {!offlineMode ? (
        <SocialAuthButtons
          busy={busy}
          onGoogle={() => void submitSocial("google")}
          onApple={() => void submitSocial("apple")}
        />
      ) : null}
      <AppParagraph typographyRole="caption" className="fb-note">
        Already have an account?{" "}
        <Link href={buildLoginHref(next)}>Sign in</Link>
      </AppParagraph>
      <AppParagraph typographyRole="caption" className="fb-note">
        By creating an account you agree to our{" "}
        <Link href="/terms">Terms of Service</Link>
        {" and "}
        <Link href="/privacy">Privacy Policy</Link>
        .{" "}
        <Link href="/support">Support</Link>
      </AppParagraph>
    </section>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<AppParagraph typographyRole="body" className="fb-copy">Loading…</AppParagraph>}>
      <SignupForm />
    </Suspense>
  );
}
