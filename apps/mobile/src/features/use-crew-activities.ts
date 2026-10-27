import { recentActivityStart, type CrewActivityPage } from "@fitness-battle/shared";
import { useCachedApi } from "../lib/use-cached-api";

export function crewActivitiesPath(now = new Date()) {
  return `/api/crews/activities?latestPerMember=true&limit=100&since=${encodeURIComponent(recentActivityStart(now))}`;
}

export function useCrewActivities() {
  const { data, error } = useCachedApi<CrewActivityPage>(crewActivitiesPath());
  return { activities: data?.activities ?? [], error: error ? "Crew activity could not load. Try Home again." : "" };
}
