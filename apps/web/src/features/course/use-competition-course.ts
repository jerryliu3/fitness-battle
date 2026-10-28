"use client";
import { useEffect, useState } from "react";
import { raceCourseFromAssignment, weeklyRaceCourse, type RaceCourse } from "@fitness-battle/shared";
import { useAuth } from "@/components/auth-context";

export function useCompetitionCourse(sport: string, periodStart: string, periodEnd: string, debug = false) {
  const { user, offlineMode } = useAuth();
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{ key: string; course: RaceCourse | null; error: string } | null>(null);
  const key = `${user?.id ?? ""}:${sport}:${periodStart}:${periodEnd}:${attempt}`;
  const demo = user?.mode === "demo" || debug;
  const geographic = ["running", "cycling", "walking"].includes(sport);
  useEffect(() => {
    if (demo || !geographic || !user || offlineMode || !periodStart || !periodEnd) return;
    const controller = new AbortController();
    const query = new URLSearchParams({ sport, start: periodStart, end: periodEnd });
    void fetch(`/api/compete/course?${query}`, { signal: controller.signal, cache: "no-store" })
      .then(async response => {
        if (!response.ok) throw new Error("Weekly course is unavailable. Please try again.");
        return raceCourseFromAssignment(await response.json(), periodStart, periodEnd);
      })
      .then(course => { if (!controller.signal.aborted) setResult({ key, course, error: "" }); })
      .catch(() => { if (!controller.signal.aborted) setResult({ key, course: null, error: "Weekly course is unavailable. Please try again." }); });
    return () => controller.abort();
  }, [key, sport, periodStart, periodEnd, demo, geographic, user?.id, offlineMode]);
  if (!geographic || !periodStart || !periodEnd) return { course: null, error: "", retry: () => setAttempt(value => value + 1) };
  if (demo) return { course: weeklyRaceCourse(new Date(periodStart)), error: "", retry: () => setAttempt(value => value + 1) };
  return { course: result?.key === key ? result.course : null, error: offlineMode ? "Weekly course needs a connection." : result?.key === key ? result.error : "", retry: () => setAttempt(value => value + 1) };
}
