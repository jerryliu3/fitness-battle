"use client";

import { useAuth } from "@/components/auth-context";
import {
  buildSignupHref,
  resolveSafePostLoginPath,
} from "@/lib/auth/login-redirect";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useState } from "react";

function LoginForm() {
  const { signIn, user, loading, demoMode } = useAuth();
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
      <p className="fb-kicker">overtaek</p>
      <h1 className="fb-title">Sign in</h1>
      <p className="fb-copy">
        Your weekly fields, training progress and crew are waiting.
        {demoMode ? " Demo mode stores your session on this device." : ""}
      </p>
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
          <p className="fb-error" role="alert" aria-live="assertive">
            {error}
          </p>
        ) : null}
        <button type="submit" className="fb-btn" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p className="fb-note">
        New here?{" "}
        <Link href={buildSignupHref(next)}>Create an account</Link>
      </p>
      <p className="fb-note">
        <Link href="/privacy">Privacy Policy</Link>
      </p>
    </section>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<p className="fb-copy">Loading…</p>}>
      <LoginForm />
    </Suspense>
  );
}
