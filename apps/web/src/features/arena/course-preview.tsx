"use client";
import { typographyStyle } from "@/ui/section";
import { useEffect, useState } from "react";
import { buildArenaModel, competitionTrack, competePeriodWindow, competeNow, type CompeteState, type SportId } from "@fitness-battle/shared";
import { useCompetitionCourse } from "@/features/course/use-competition-course";
import { GeographicCourse } from "@/features/course/geographic-course";
import { useAuth } from "@/components/auth-context";
import { useCompete } from "@/components/compete-context";
const snapshotCache = new Map<string, string>();
export function CoursePreview({ sport, queued, state }: { sport: SportId; queued: boolean; state: CompeteState }) {
  const { user } = useAuth();
  const { debugActive } = useCompete();
  const period = competePeriodWindow(state, competeNow(state), sport);
  const { course } = useCompetitionCourse(sport, period.startsAt.toISOString(), period.endsAt.toISOString(), debugActive, true);
  const model = buildArenaModel(state, undefined, competitionTrack(sport), sport), lane = model?.lanes.find(lane => lane.you);
  const cacheKey = `race-card-square-v6:${queued}:${user?.id}:${sport}:${course?.name}:${course?.length}:${lane?.values[2]}:${state.units}`;
  return <div style={{ position: "relative", borderRadius: 12, overflow: "hidden" }}><Snapshot key={cacheKey} cacheKey={cacheKey} course={course} value={lane?.values[2] ?? 0} unit={model?.unit ?? ""} queued={queued} name={lane?.name ?? state.name} mysteryCount={model?.lanes.filter(l => l.mystery).length ?? 0} />{course ? <small style={{ ...typographyStyle("nav"), position: "absolute", bottom: 4, right: 6, textAlign: "right", background: "rgba(255,255,255,.85)", padding: "0 4px", borderRadius: 4 }}><a href="https://www.mapbox.com/about/maps" onClick={event => event.stopPropagation()}>© Mapbox</a> · <a href="https://www.openstreetmap.org/copyright" onClick={event => event.stopPropagation()}>© OpenStreetMap</a> · <a href="https://apps.mapbox.com/feedback/" title="Improve this map" aria-label="Improve this map" onClick={event => event.stopPropagation()}>ⓘ</a></small> : null}</div>;
}
function Snapshot({ cacheKey, course, value, unit, queued, mysteryCount, name }: { cacheKey: string; course: ReturnType<typeof useCompetitionCourse>["course"]; value: number; unit: string; queued: boolean; mysteryCount: number; name: string }) {
  const [uri, setUri] = useState(() => snapshotCache.get(cacheKey) ?? ""), [expired, setExpired] = useState(false);
  useEffect(() => { const timer = setTimeout(() => setExpired(true), 15000); return () => clearTimeout(timer); }, []);
  const capture = (value: string) => { if (snapshotCache.size >= 32) snapshotCache.delete(snapshotCache.keys().next().value!); snapshotCache.set(cacheKey, value); setUri(value); };
  return <div className="compete-event-preview" style={{ position: "relative", pointerEvents: "none" }}>
    {uri ? <img src={uri} alt="3D snapshot of your current race position" style={{ display: "block", width: "100%", height: "100%", objectFit: "cover" }} /> : !expired && course && (unit === "mi" || unit === "km") ? <GeographicCourse course={course} lanes={[{ id: "you", name, initials: "", you: true, value: queued ? 0 : value }, ...(queued ? Array.from({ length: mysteryCount }, (_, i) => ({ id: `mystery-${i}`, name: "?", initials: "?", you: false, mystery: true, value: 0 })) : [])]} unit={unit} selectedId="you" focusRequest={0} onSelect={() => {}} onSnapshot={capture} /> : <small>{unit === "pts" ? "Points event" : "Preview unavailable"}</small>}
  </div>;
}
