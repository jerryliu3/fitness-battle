"use client";

import { useAuth } from "@/components/auth-context";
import {
  buildSignupHref,
  resolveSafePostLoginPath,
} from "@/lib/auth/login-redirect";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useState } from "react";

function LoginForm() {
  const { signIn, user, loading, demoMode } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = resolveSafePostLoginPath(searchParams.get("next"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      router.replace(next);
    }
  }, [loading, user, next, router]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const result = await signIn(email, password);
    setBusy(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    router.replace(next);
    router.refresh();
  }

  return (
    <section className="fb-card fb-auth-card">
      <p className="fb-kicker">Fitness Battle</p>
      <h1 className="fb-title">Sign in</h1>
      <p className="fb-copy">
        Browse freely. Sign in when you are ready to join a board or open You.
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
        {error ? <p className="fb-error">{error}</p> : null}
        <button type="submit" className="fb-btn" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
      <p className="fb-note">
        New here?{" "}
        <Link href={buildSignupHref(next)}>Create an account</Link>
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
