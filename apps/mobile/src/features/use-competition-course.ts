import { useEffect, useState } from "react";
import { raceCourseFromAssignment, DEMO_RACE_COURSE, type RaceCourse } from "@fitness-battle/shared";
import { useAuth } from "../lib/auth";
import { mobileEnv } from "../lib/env";
import { requestApi } from "../lib/api";

export function useCompetitionCourse(sport: string, periodStart: string, periodEnd: string, debug = false, enabled = true) {
  const { user, accessToken, offlineMode } = useAuth();
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{ key: string; course: RaceCourse | null; error: string } | null>(null);
  const key = `${user?.id ?? ""}:${sport}:${periodStart}:${periodEnd}:${attempt}`;
  const demo = user?.mode === "demo" || debug;
  const geographic = ["running", "cycling", "walking"].includes(sport);
  useEffect(() => {
    if (!enabled || demo || !geographic || !user || offlineMode || !accessToken || !periodStart || !periodEnd) return;
    let cancelled = false;
    const query = `sport=${encodeURIComponent(sport)}&start=${encodeURIComponent(periodStart)}&end=${encodeURIComponent(periodEnd)}`;
    void requestApi(mobileEnv.apiUrl, accessToken, `/api/compete/course?${query}`)
      .then(data => raceCourseFromAssignment(data, periodStart, periodEnd))
      .then(course => { if (!cancelled) setResult({ key, course, error: "" }); })
      .catch(() => { if (!cancelled) setResult({ key, course: null, error: "Weekly course is unavailable. Please try again." }); });
    return () => { cancelled = true; };
  }, [key, sport, periodStart, periodEnd, demo, geographic, enabled, user?.id, accessToken, offlineMode]);
  if (!enabled || !geographic || !periodStart || !periodEnd) return { course: null, error: "", retry: () => setAttempt(value => value + 1) };
  if (demo) return { course: DEMO_RACE_COURSE, error: "", retry: () => setAttempt(value => value + 1) };
  return { course: result?.key === key ? result.course : null, error: offlineMode ? "Weekly course needs a connection." : result?.key === key ? result.error : "", retry: () => setAttempt(value => value + 1) };
}
