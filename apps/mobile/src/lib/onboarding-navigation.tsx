import AsyncStorage from "@react-native-async-storage/async-storage";
import { GUEST_SIGNUP_PENDING_KEY, hasCompletedOnboardingIntro } from "@fitness-battle/shared";
import { readGuestIntroDraft } from "./guest-intro";
import { useEffect } from "react";
import { router, useGlobalSearchParams, usePathname } from "expo-router";
import { useAuth } from "./auth";
import { useCompeteStore } from "./compete-store";
import { useBootOpened } from "../ui/boot-readiness";

export function useOnboardingRequired() {
  const { user, loading } = useAuth();
  const { state, loadStatus, accountKey } = useCompeteStore();
  const pending = loading || Boolean(user && (loadStatus === "loading" || accountKey !== user.id));
  const required = Boolean(user && !pending && (loadStatus === "ready" || loadStatus === "local") && !state?.onboardingCompleted);
  return { pending, required };
}

/** Keep incomplete accounts in setup, including restored navigation stacks. */
export function OnboardingNavigation() {
  const { required } = useOnboardingRequired();
  const { user } = useAuth();
  const bootOpened = useBootOpened();
  const path = usePathname();
  const params = useGlobalSearchParams<{ panel?: string; tracker?: string; provider?: string; preview?: string }>();
  const connecting = (path === "/athlete" || path === "/athlete-settings") && (params.panel === "connections" || params.tracker !== undefined || params.provider !== undefined);
  useEffect(() => {
    if (params.preview === "1" && (path === "/welcome" || path === "/onboarding" || path === "/replay-tuning")) return;
    if (!required || !bootOpened || connecting) return;
    let alive = true;
    void Promise.all([readGuestIntroDraft(), AsyncStorage.getItem(GUEST_SIGNUP_PENDING_KEY)]).then(([draft, pending]) => {
      if (!alive) return;
      const target = hasCompletedOnboardingIntro(draft, pending, user?.email) ? "/onboarding" : "/welcome";
      if (path !== target) router.replace(target);
    }).catch(() => { if (alive && path !== "/welcome") router.replace("/welcome"); });
    return () => { alive = false; };
  }, [required, bootOpened, path, connecting, user?.id, user?.email, params.preview]);
  return null;
}
