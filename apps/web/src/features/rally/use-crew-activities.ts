"use client";
import { useBootLoading } from "@/shell/boot-readiness";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-context";
import { recentActivityStart, type CrewActivityPage } from "@fitness-battle/shared";

/** The same endpoint supports a future chronological Crew feed via its cursor. */
export function useCrewActivities(active = true) {
  const { user, offlineMode } = useAuth();
  const [result, setResult] = useState<{ account: string; activities: CrewActivityPage["activities"]; error: string }>({ account: "", activities: [], error: "" });
  useBootLoading(Boolean(user && !offlineMode && active && result.account !== user.id));
  useEffect(() => {
    if (!user || offlineMode || !active) return;
    const account = user.id, controller = new AbortController();
    void fetch(`/api/crews/activities?latestPerMember=true&limit=100&since=${encodeURIComponent(recentActivityStart(new Date()))}`, { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]) })
      .then(async response => { if (!response.ok) throw new Error(); return response.json() as Promise<CrewActivityPage>; })
      .then(page => { if (!controller.signal.aborted) setResult({ account, activities: page.activities, error: "" }); })
      .catch(() => { if (!controller.signal.aborted) setResult({ account, activities: [], error: "Crew activity could not load. Try Home again." }); });
    return () => controller.abort();
  }, [user?.id, offlineMode, active]);
  return result.account === user?.id ? result : { activities: [], error: "" };
}
