"use client";
import { useState } from "react";
import { buildMapboxStaticImageUrl } from "@fitness-battle/shared";
import { useCompetitionCourse } from "@/features/course/use-competition-course";
import { useCompete } from "@/components/compete-context";
import { webEnv } from "@/lib/env";

export function CoursePreview({ sport, start, end, queued }: { sport: string; start: string; end: string; queued: boolean }) {
  const { debugActive } = useCompete();
  const { course, error } = useCompetitionCourse(sport, start, end, debugActive, !queued);
  const url = course ? buildMapboxStaticImageUrl({ coordinates: course.coordinates, width: 600, height: 240, mapboxToken: webEnv.mapboxAccessToken }) : "";
  const [failedUrl, setFailedUrl] = useState("");
  return <div className="compete-event-preview">
    {url && failedUrl !== url ? <img src={url} alt={`${course?.name} course preview`} loading="lazy" onError={() => setFailedUrl(url)} /> : <small>{queued ? "Course assigned when your wave starts" : !["running", "walking", "cycling"].includes(sport) ? "Points event" : error || failedUrl || !webEnv.mapboxAccessToken ? "Course preview unavailable" : "Loading course preview…"}</small>}
  </div>;
}
