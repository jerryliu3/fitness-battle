"use client";
import dynamic from "next/dynamic";
import { type CourseDistanceTarget, type RaceCourse, type ArenaSceneLane } from "@fitness-battle/shared";
import { webEnv } from "@/lib/env";

const CourseMap = dynamic(() => import("./course-map"), { ssr: false, loading: () => <p className="fb-copy">Loading map…</p> });

/** The weekly course is assigned by the competition, never selected by an athlete. */
export function GeographicCourse({ lanes, unit, selectedId, focusRequest, onSelect, course, error = "", onRetry, controlsBottom = 8, distanceTarget, onResumeFollow }: {
  lanes: ArenaSceneLane[]; unit: string; selectedId: string; focusRequest: number; onSelect(id: string): void;
  distanceTarget?: CourseDistanceTarget | null; onResumeFollow?: () => void;
  course: RaceCourse | null; error?: string; onRetry?: () => void; controlsBottom?: number;
}) {
  if (unit !== "mi" && unit !== "km") return null;
  return <div className="geographic-field-scene" style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 360, position: "relative" }}>
    {!webEnv.mapboxAccessToken ? <p className="fb-copy">Mapbox access is not configured.</p> : !course ?
      <div className="fb-copy" role="status" style={{ padding: 24 }}>{error || "Loading this competition’s course…"}{error && onRetry ? <button type="button" className="fb-btn-line" onClick={onRetry}>Retry</button> : null}</div> :
      <CourseMap key={course.name + course.length} course={course} lanes={lanes} unit={unit} selectedId={selectedId} focusRequest={focusRequest} onSelect={onSelect} distanceTarget={distanceTarget} onResumeFollow={onResumeFollow} controlsBottom={controlsBottom} extraControls={<span className="fb-btn-line" style={{ whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", cursor: "default" }}>Course: {course.name}</span>} />}
  </div>;
}
