"use client";

import { useAuth } from "@/components/auth-context";
import {
  buildLoginHref,
  resolveSafePostLoginPath,
} from "@/lib/auth/login-redirect";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useState } from "react";

function SignupForm() {
  const { signUp, user, loading, demoMode } = useAuth();
  const router = useRouter();
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
      router.replace("/onboarding");
    }
  }, [loading, user, router]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const result = await signUp({ email, password, displayName });
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.needsEmailConfirm) {
        setMessage(
          "Account created. Check your email to confirm, then sign in.",
        );
        return;
      }
      const dest =
        next && next !== "/"
          ? `/onboarding?next=${encodeURIComponent(next)}`
          : "/onboarding";
      router.replace(dest);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not create the account.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="fb-card fb-auth-card">
      <p className="fb-kicker">Fitness Battle</p>
      <h1 className="fb-title">Create account</h1>
      <p className="fb-copy">
        After signup you will set preferences and run a one-time 90-day
        calibration.
        {demoMode ? " Demo mode keeps everything on this device." : ""}
      </p>
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
        {error ? <p className="fb-error">{error}</p> : null}
        {message ? <p className="fb-note">{message}</p> : null}
        <button type="submit" className="fb-btn" disabled={busy}>
          {busy ? "Creating…" : "Create account"}
        </button>
      </form>
      <p className="fb-note">
        Already have an account?{" "}
        <Link href={buildLoginHref(next)}>Sign in</Link>
      </p>
      <p className="fb-note">
        <Link href="/privacy">Privacy Policy</Link>
      </p>
    </section>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<p className="fb-copy">Loading…</p>}>
      <SignupForm />
    </Suspense>
  );
}
