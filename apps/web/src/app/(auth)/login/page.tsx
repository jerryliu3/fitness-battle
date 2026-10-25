"use client";
import { AppParagraph, AppHeading } from "@/ui/section";

import { useAuth } from "@/components/auth-context";
import {
  buildSignupHref,
  resolveSafePostLoginPath,
} from "@/lib/auth/login-redirect";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useState } from "react";

function LoginForm() {
  const { signIn, user, loading, offlineMode } = useAuth();
  const searchParams = useSearchParams();
  const next = resolveSafePostLoginPath(searchParams.get("next"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
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
    try {
      const result = await signIn(email, password);
      if (result.error) {
        setError(result.error);
        setBusy(false);
        return;
      }
      window.location.assign(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in.");
      setBusy(false);
    }
  }

  return (
    <section className="fb-card fb-auth-card">
      <AppParagraph typographyRole="label" className="fb-kicker">overtaek</AppParagraph>
      <AppHeading level={1} role="display" className="fb-title">Sign in</AppHeading>
      <AppParagraph typographyRole="body" className="fb-copy">
        Your weekly fields, training progress and crew are waiting.
        {offlineMode ? " Demo mode stores your session on this device." : ""}
      </AppParagraph>
      <form className="fb-stack" onSubmit={onSubmit}>
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
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>
        {error ? (
          <AppParagraph typographyRole="body" className="fb-error" role="alert" aria-live="assertive">
            {error}
          </AppParagraph>
        ) : null}
        <button type="submit" className="fb-btn" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <AppParagraph typographyRole="caption" className="fb-note">
        New here?{" "}
        <Link href={buildSignupHref(next)}>Create an account</Link>
      </AppParagraph>
      <AppParagraph typographyRole="caption" className="fb-note">
        <Link href="/terms">Terms of Service</Link>
        {" · "}
        <Link href="/privacy">Privacy Policy</Link>
      </AppParagraph>
    </section>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<AppParagraph typographyRole="body" className="fb-copy">Loading…</AppParagraph>}>
      <LoginForm />
    </Suspense>
  );
}
