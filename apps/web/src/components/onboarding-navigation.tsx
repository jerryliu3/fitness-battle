"use client";
import { GUEST_SIGNUP_PENDING_KEY, hasCompletedOnboardingIntro } from "@fitness-battle/shared";
import { resolveSafePostLoginPath } from "@/lib/auth/login-redirect";
import { readGuestIntroDraft } from "@/lib/guest-intro";
import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "./auth-context";
import { useCompete } from "./compete-context";

/** Keep restored sessions in setup while allowing tracker authorization to return. */
export function OnboardingNavigation() {
  const { user, loading } = useAuth();
  const { state, loadStatus } = useCompete();
  const path = usePathname(), params = useSearchParams(), router = useRouter();
  const connecting = path === "/app/athlete" && (params.get("panel") === "connections" || params.has("tracker") || params.has("provider"));
  const next = params.get("next");
  const preview = (path === "/app/welcome" || path === "/app/onboarding") && params.get("preview") === "1";
  useEffect(() => {
    if (preview) return;
    if (loading || !user || !state || (loadStatus !== "ready" && loadStatus !== "local")) return;
    if (state.onboardingCompleted) {
      if (path === "/app/welcome" || path === "/app") router.replace("/app/today");
      return;
    }
    if (connecting) return;
    let pending: string | null = null;
    try { pending = localStorage.getItem(GUEST_SIGNUP_PENDING_KEY); } catch {}
    const introDone = hasCompletedOnboardingIntro(readGuestIntroDraft(), pending, user.email);
    const target = introDone ? "/app/onboarding" : "/app/welcome";
    if (path !== target) router.replace(next ? `${target}?next=${encodeURIComponent(resolveSafePostLoginPath(next))}` : target);

  }, [loading, user, state?.onboardingCompleted, loadStatus, path, connecting, preview, next, router]);
  return null;
}
