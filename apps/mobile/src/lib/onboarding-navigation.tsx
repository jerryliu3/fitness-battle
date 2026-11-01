import { useEffect } from "react";
import { router, useGlobalSearchParams, usePathname } from "expo-router";
import { useAuth } from "./auth";
import { useCompeteStore } from "./compete-store";

export function useOnboardingRequired() {
  const { user, loading } = useAuth();
  const { state, loadStatus, accountKey } = useCompeteStore();
  const pending = loading || Boolean(user && (!state || loadStatus === "loading" || accountKey !== user.id));
  const required = Boolean(user && !pending && (loadStatus === "ready" || loadStatus === "local") && !state?.onboardingCompleted);
  return { pending, required };
}

/** Keep incomplete accounts in setup, including restored navigation stacks. */
export function OnboardingNavigation() {
  const { required } = useOnboardingRequired();
  const path = usePathname();
  const params = useGlobalSearchParams<{ panel?: string; tracker?: string; provider?: string }>();
  const connecting = (path === "/athlete" || path === "/athlete-settings") && (params.panel === "connections" || params.tracker !== undefined || params.provider !== undefined);
  useEffect(() => {
    if (required && path !== "/onboarding" && !connecting) router.replace("/onboarding");
  }, [required, path, connecting]);
  return null;
}
