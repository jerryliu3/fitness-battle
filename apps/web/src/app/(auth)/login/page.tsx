"use client";
import { GUEST_SIGNUP_PENDING_KEY } from "@fitness-battle/shared";
import { BackButton } from "@/ui/back-button";
import { AppParagraph, AppHeading } from "@/ui/section";

import { useAuth } from "@/components/auth-context";
import { SocialAuthButtons } from "@/components/social-auth-buttons";
import {
  buildSignupHref,
  resolveSafePostLoginPath,
} from "@/lib/auth/login-redirect";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useState } from "react";

function LoginForm() {
  const {
    signIn,
    signInWithGoogle,
    signInWithApple,
    offlineMode,
    user,
    loading,
  } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const fromOnboarding = searchParams.get("from") === "onboarding";
  const callbackError = searchParams.get("error");
  const next = resolveSafePostLoginPath(searchParams.get("next"));
  const returnParams = new URLSearchParams();
  if (searchParams.get("preview") === "1") returnParams.set("preview", "1");
  if (searchParams.has("next")) returnParams.set("next", next);
  const onboardingHref = `/app/welcome${returnParams.size ? `?${returnParams}` : ""}`;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const displayError = error ?? callbackError;

  useEffect(() => {
    if (!loading && user && !fromOnboarding && !busy) {
      router.replace(next);
    }
  }, [loading, user, next, fromOnboarding, busy, router]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      if (fromOnboarding) try { localStorage.removeItem(GUEST_SIGNUP_PENDING_KEY); } catch {}
      const result = await signIn(email, password);
      if (result.error) {
        setError(result.error);
        setBusy(false);
        return;
      }
      router.replace(fromOnboarding ? `/app/onboarding?next=${encodeURIComponent(next)}` : next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in.");
      setBusy(false);
    }
  }

  async function submitSocial(provider: "google" | "apple") {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      if (fromOnboarding) try { localStorage.removeItem(GUEST_SIGNUP_PENDING_KEY); } catch {}
      const action = provider === "google" ? signInWithGoogle : signInWithApple;
      const result = await action?.({
        next,
        from: fromOnboarding ? "onboarding" : undefined,
      });
      if (result?.error) {
        setError(result.error);
        setBusy(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in.");
      setBusy(false);
    }
  }

  return (
    <section className="fb-card fb-auth-card">
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {fromOnboarding && <BackButton href={onboardingHref} />}
        <AppParagraph typographyRole="label" className="fb-kicker">overtaek</AppParagraph>
      </div>
      <AppHeading level={1} role="display" className="fb-title">Sign in</AppHeading>
      <AppParagraph typographyRole="body" className="fb-copy">
        Your weekly fields, training progress and crew are waiting.
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
        {displayError ? (
          <AppParagraph typographyRole="body" className="fb-error" role="alert" aria-live="assertive">
            {displayError}
          </AppParagraph>
        ) : null}
        <button type="submit" className="fb-btn" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
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
        New here?{" "}
        <Link href={fromOnboarding ? onboardingHref : buildSignupHref(next)}>Create an account</Link>
      </AppParagraph>
      <AppParagraph typographyRole="caption" className="fb-note">
        <Link href="/terms">Terms of Service</Link>
        {" · "}
        <Link href="/privacy">Privacy Policy</Link>
        {" · "}
        <Link href="/support">Support</Link>
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
