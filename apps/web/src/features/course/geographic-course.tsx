"use client";
import dynamic from "next/dynamic";
import { AppHeading } from "@/ui/section";
import { useEffect, useRef, useState } from "react";
import { MAX_COURSE_BYTES, raceCourseFromGpx, requestMapboxCourse, type CourseDistanceTarget, type RaceCourse, type ArenaSceneLane } from "@fitness-battle/shared";
import { webEnv } from "@/lib/env";
const CourseMap = dynamic(() => import("./course-map"), { ssr: false, loading: () => <p className="fb-copy">Loading map…</p> });
/** Shares the field/replay host rather than opening a separate visualization dialog. */
export function GeographicCourse({ lanes, unit, selectedId, focusRequest, onSelect, course, onCourseChange, controlsBottom = 8, distanceTarget, onResumeFollow }: {
  lanes: ArenaSceneLane[]; unit: string; selectedId: string; focusRequest: number; onSelect(id: string): void;
  distanceTarget?: CourseDistanceTarget | null; onResumeFollow?: () => void;
  course: RaceCourse | null; onCourseChange(course: RaceCourse | null): void; controlsBottom?: number;
}) {
  const [start, setStart] = useState(""), [finish, setFinish] = useState(""), [profile, setProfile] = useState<"walking" | "cycling">("walking");
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const pending = useRef<AbortController | null>(null);
  useEffect(() => () => pending.current?.abort(), []);
  const load = async (work: (signal: AbortSignal) => Promise<RaceCourse>) => {
    pending.current?.abort(); const request = new AbortController(); pending.current = request; setBusy(true); setError("");
    try { const result = await work(request.signal); if (!request.signal.aborted) onCourseChange(result); }
    catch (cause) { if (!request.signal.aborted) setError(cause instanceof Error ? cause.message : "The course could not be loaded."); }
    finally { if (!request.signal.aborted) setBusy(false); }
  };
  if (unit !== "mi" && unit !== "km") return null;
  return <div className="geographic-field-scene" style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 360, position: "relative" }}>
        {!webEnv.mapboxAccessToken ? <p className="fb-copy">Mapbox access is not configured.</p> : course ? <CourseMap key={course.name + course.length} course={course} lanes={lanes} unit={unit} selectedId={selectedId} focusRequest={focusRequest} onSelect={onSelect} distanceTarget={distanceTarget} onResumeFollow={onResumeFollow} controlsBottom={controlsBottom} extraControls={<button type="button" className="fb-btn-line" title={`${course.name} · ${(course.length / (unit === "mi" ? 1609.344 : 1000)).toFixed(2)} ${unit} · Out-and-back`} style={{ whiteSpace: "nowrap", flexShrink: 0 }} onClick={() => onCourseChange(null)}>Change course</button>} /> : <div className="geographic-course-chooser" style={{ display: "grid", gap: 16, overflow: "auto", maxWidth: 640, padding: controlsBottom > 8 ? "120px 16px 180px" : 16, margin: "0 auto", width: "100%" }}>
          <AppHeading level={2} role="heading">Choose a race course</AppHeading><p className="fb-copy">Import GPX scenery or request a route. This does not record an activity or change scores.</p>
          <label className="fb-copy">Import GPX course<input type="file" accept=".gpx,application/gpx+xml" disabled={busy} onChange={event => {
            const file = event.target.files?.[0]; event.target.value = ""; if (!file) return;
            void load(async () => { if (file.size > MAX_COURSE_BYTES) throw new Error("Choose a GPX file under 4 MB."); return raceCourseFromGpx(await file.text(), file.name.replace(/\.gpx$/i, "")); });
          }} /></label>
          <form style={{ display: "grid", gap: 12 }} onSubmit={event => { event.preventDefault(); void load(signal => requestMapboxCourse(start, finish, profile, webEnv.mapboxAccessToken, signal)); }}>
            <label className="fb-copy">Start address, city or longitude,latitude<input className="fb-input" required value={start} onChange={event => setStart(event.target.value)} maxLength={240} style={{ display: "block", width: "100%", minHeight: 44 }} /></label>
            <label className="fb-copy">Destination address, city or longitude,latitude<input className="fb-input" required value={finish} onChange={event => setFinish(event.target.value)} maxLength={240} style={{ display: "block", width: "100%", minHeight: 44 }} /></label>
            <label className="fb-copy">Route type<select className="fb-input" value={profile} onChange={event => setProfile(event.target.value as "walking" | "cycling")}><option value="walking">Walking</option><option value="cycling">Cycling</option></select></label>
            <button className="fb-btn" disabled={busy || !start.trim() || !finish.trim()}>{busy ? "Finding route…" : "Find course"}</button>
            <p className="fb-copy">For precise endpoints, enter longitude,latitude. Place searches use the first matching location; inspect the route before using it.</p>
          </form>
        </div>}
        {error ? <p role="alert" className="fb-copy">{error}</p> : null}
  </div>;
}
