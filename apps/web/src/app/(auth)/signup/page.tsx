"use client";
import { AppParagraph, AppHeading } from "@/ui/section";

import { useAuth } from "@/components/auth-context";
import {
  buildLoginHref,
  resolveSafePostLoginPath,
} from "@/lib/auth/login-redirect";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useState } from "react";

function SignupForm() {
  const { signUp, user, loading, offlineMode } = useAuth();
  const searchParams = useSearchParams();
  const next = resolveSafePostLoginPath(searchParams.get("next"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      window.location.assign(next);
    }
  }, [loading, user, next]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const result = await signUp({ email, password, displayName });
      if (result.error) {
        setError(result.error);
        setBusy(false);
        return;
      }
      if (result.needsEmailConfirm) {
        setMessage("Account created. Check your email to confirm, then sign in.");
        setBusy(false);
        return;
      }
      const dest =
        next && next !== "/today" && next !== "/"
          ? `/onboarding?next=${encodeURIComponent(next)}`
          : "/onboarding";
      window.location.assign(dest);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the account.");
      setBusy(false);
    }
  }

  return (
    <section className="fb-card fb-auth-card">
      <AppParagraph typographyRole="label" className="fb-kicker">overtaek</AppParagraph>
      <AppHeading level={1} role="display" className="fb-title">Create account</AppHeading>
      <AppParagraph typographyRole="body" className="fb-copy">
        After signup you will set preferences and run a one-time 90-day
        calibration.
        {offlineMode ? " Demo mode keeps everything on this device." : ""}
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
        {error ? (
          <AppParagraph typographyRole="body" className="fb-error" role="alert" aria-live="assertive">
            {error}
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
