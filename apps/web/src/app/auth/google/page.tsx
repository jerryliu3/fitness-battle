"use client";

import {
  GOOGLE_NONCE_STORAGE_KEY,
  type GoogleOAuthState,
} from "@fitness-battle/shared";
import { resolveSafePostLoginPath } from "@/lib/auth/login-redirect";
import { createClient } from "@/lib/supabase/client";
import { AppParagraph } from "@/ui/section";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

function parseState(raw: string | null): GoogleOAuthState | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as GoogleOAuthState;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

export default function GoogleAuthCallbackPage() {
  const router = useRouter();
  const [mobileReturnUrl, setMobileReturnUrl] = useState<string | null>(null);

  useEffect(() => {
    const hash = window.location.hash.startsWith("#")
      ? window.location.hash.slice(1)
      : window.location.hash;
    const hashParams = new URLSearchParams(hash);
    const searchParams = new URLSearchParams(window.location.search);
    const get = (key: string) =>
      hashParams.get(key) ?? searchParams.get(key);

    const idToken = get("id_token");
    const errorRaw = get("error_description") ?? get("error");
    const error = errorRaw ? errorRaw.replace(/\+/g, " ") : null;
    const state = parseState(get("state"));

    if (state?.mobile) {
      const mobileUrl = new URL("overtaek://auth/callback");
      if (error) {
        mobileUrl.searchParams.set("error", error);
      } else if (idToken) {
        mobileUrl.hash = new URLSearchParams({ id_token: idToken }).toString();
      } else {
        mobileUrl.searchParams.set("error", "Missing ID token from Google sign-in.");
      }
      const target = mobileUrl.toString();
      setMobileReturnUrl(target);
      window.location.replace(target);
      return;
    }

    const next = resolveSafePostLoginPath(state?.next);

    function redirectWithError(message: string) {
      const authPath = state?.from === "signup" ? "/signup" : "/login";
      const params = new URLSearchParams({ next, error: message });
      if (state?.from === "onboarding") {
        params.set("from", "onboarding");
      }
      router.replace(`${authPath}?${params.toString()}`);
    }

    if (error) {
      redirectWithError(error);
      return;
    }

    if (!idToken) {
      redirectWithError("Missing ID token from Google sign-in.");
      return;
    }

    let rawNonce: string | null = null;
    try {
      rawNonce = sessionStorage.getItem(GOOGLE_NONCE_STORAGE_KEY);
      sessionStorage.removeItem(GOOGLE_NONCE_STORAGE_KEY);
    } catch {
      // Ignore sessionStorage errors
    }

    const supabase = createClient();
    void supabase.auth
      .signInWithIdToken({
        provider: "google",
        token: idToken,
        nonce: rawNonce ?? undefined,
      })
      .then(({ error: signInError }) => {
        if (signInError) {
          redirectWithError(signInError.message || "Could not complete sign-in.");
          return;
        }
        const destination =
          state?.from === "onboarding" || state?.from === "signup"
            ? `/app/onboarding?next=${encodeURIComponent(next)}`
            : next;
        router.replace(destination);
      })
      .catch(() => {
        redirectWithError("Could not complete Google sign-in.");
      });
  }, [router]);

  return (
    <section className="fb-card fb-auth-card">
      <AppParagraph typographyRole="body" className="fb-copy">
        Completing Google sign-in…
      </AppParagraph>
      {mobileReturnUrl ? (
        <a href={mobileReturnUrl} className="fb-btn">
          Return to Overtaek
        </a>
      ) : null}
    </section>
  );
}
