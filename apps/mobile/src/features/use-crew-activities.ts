import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { recentActivityStart, type CrewActivityPage } from "@fitness-battle/shared";
import { useAuth } from "../lib/auth";
import { requestApi } from "../lib/api";
import { mobileEnv } from "../lib/env";

export function useCrewActivities() {
  const { user, offlineMode, accessToken } = useAuth();
  const [result, setResult] = useState<{ account: string; activities: CrewActivityPage["activities"]; error: string }>({ account: "", activities: [], error: "" });
  useFocusEffect(useCallback(() => {
    if (!user || offlineMode || !accessToken) return;
    let current = true;
    const account = user.id;
    void requestApi<CrewActivityPage>(mobileEnv.apiUrl, accessToken,
      `/api/crews/activities?latestPerMember=true&limit=100&since=${encodeURIComponent(recentActivityStart(new Date()))}`)
      .then(page => { if (current) setResult({ account, activities: page.activities, error: "" }); })
      .catch(() => { if (current) setResult({ account, activities: [], error: "Crew activity could not load. Try Home again." }); });
    return () => { current = false; };
  }, [user?.id, offlineMode, accessToken]));
  return result.account === user?.id ? result : { activities: [], error: "" };
}
