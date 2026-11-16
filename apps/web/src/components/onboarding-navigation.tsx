"use client";
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
  useEffect(() => {
    if (loading || !user || !state || (loadStatus !== "ready" && loadStatus !== "local")) return;
    if (path === "/app/welcome" || path === "/app") {
      router.replace(state.onboardingCompleted ? "/app/today" : "/app/onboarding");
    } else if (!state.onboardingCompleted && path !== "/app/onboarding" && !connecting) {
      router.replace(`/app/onboarding?next=${encodeURIComponent(path)}`);
    }
  }, [loading, user, state?.onboardingCompleted, loadStatus, path, connecting, router]);
  return null;
}
