"use client";
import * as Dialog from "@radix-ui/react-dialog";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { MAX_COURSE_BYTES, raceCourseFromGpx, requestMapboxCourse, type RaceCourse, type ArenaSceneLane } from "@fitness-battle/shared";
import { webEnv } from "@/lib/env";
const CourseMap = dynamic(() => import("./course-map"), { ssr: false, loading: () => <p className="fb-copy">Loading map…</p> });
export function GeographicCourse({ lanes, unit, selectedId: initialSelectedId, active = true }: {
  lanes: ArenaSceneLane[]; unit: string; selectedId: string; active?: boolean;
}) {
  const [selectedId, setSelectedId] = useState(initialSelectedId), [focusRequest, setFocusRequest] = useState(0);
  const onSelect = (id: string) => { setSelectedId(id); setFocusRequest(value => value + 1); };
  const [open, setOpen] = useState(false), [course, setCourse] = useState<RaceCourse | null>(null);
  const [start, setStart] = useState(""), [finish, setFinish] = useState(""), [profile, setProfile] = useState<"walking" | "cycling">("walking");
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const pending = useRef<AbortController | null>(null);
  useEffect(() => () => pending.current?.abort(), []);
  useEffect(() => { if (!active) { pending.current?.abort(); setBusy(false); setOpen(false); } }, [active]);
  const changeOpen = (next: boolean) => { if (next) setSelectedId(initialSelectedId); if (!next) { pending.current?.abort(); setBusy(false); } setOpen(next); };
  const load = async (work: (signal: AbortSignal) => Promise<RaceCourse>) => {
    pending.current?.abort(); const request = new AbortController(); pending.current = request; setBusy(true); setError("");
    try { const result = await work(request.signal); if (!request.signal.aborted) setCourse(result); }
    catch (cause) { if (!request.signal.aborted) setError(cause instanceof Error ? cause.message : "The course could not be loaded."); }
    finally { if (!request.signal.aborted) setBusy(false); }
  };
  if (unit !== "mi" && unit !== "km") return null;
  return <Dialog.Root open={open} onOpenChange={changeOpen}>
    <Dialog.Trigger asChild><button type="button" className="fb-btn-line">Race on a real course</button></Dialog.Trigger>
    <Dialog.Portal><Dialog.Overlay style={{ position: "fixed", inset: 0, background: "#142b3b99", zIndex: 200 }} />
      <Dialog.Content style={{ position: "fixed", inset: 0, zIndex: 201, background: "var(--paper, #f8f9f6)", display: "flex", flexDirection: "column", padding: 12, gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}><Dialog.Close asChild><button className="fb-btn-line">Back</button></Dialog.Close><Dialog.Title className="fb-title" style={{ flex: 1, minWidth: 0, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{course?.name ?? "Choose a race course"}</Dialog.Title>{course ? <button className="fb-btn-line" onClick={() => setCourse(null)}>Change course</button> : null}</div>
        <Dialog.Description className="fb-copy">{course ? `${(course.length / (unit === "mi" ? 1609.344 : 1000)).toFixed(2)} ${unit} · Competition totals on a shared route · Progress stops at the finish` : "Import GPX scenery or request a route. This does not record an activity or change scores."}</Dialog.Description>
        {!webEnv.mapboxAccessToken ? <p className="fb-copy">Mapbox access is not configured.</p> : course ? <CourseMap key={course.name + course.length} course={course} lanes={lanes} unit={unit} selectedId={selectedId} focusRequest={focusRequest} onSelect={onSelect} /> : <div style={{ display: "grid", gap: 16, overflow: "auto", maxWidth: 640 }}>
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
        {course ? <div style={{ display: "flex", gap: 8, overflowX: "auto", padding: 8, flexShrink: 0 }} aria-label="Course athletes">{lanes.filter(lane => !lane.ghost).map(lane => <button type="button" className="fb-btn-line" key={lane.id} aria-pressed={lane.id === selectedId} style={{ whiteSpace: "nowrap" }} onClick={() => onSelect(lane.id)}>{lane.you ? "You" : lane.name} · {lane.value.toFixed(2)} {unit}</button>)}</div> : null}
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}
