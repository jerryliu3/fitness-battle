"use client";
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
  const { course } = useCompetitionCourse(sport, period.startsAt.toISOString(), period.endsAt.toISOString(), debugActive, !queued);
  const model = buildArenaModel(state, undefined, competitionTrack(sport), sport), lane = model?.lanes.find(lane => lane.you);
  const cacheKey = `${user?.id}:${sport}:${course?.name}:${course?.length}:${lane?.values[2]}:${state.units}`;
  return <Snapshot key={cacheKey} cacheKey={cacheKey} course={course} value={lane?.values[2] ?? 0} unit={model?.unit ?? ""} queued={queued} />;
}
function Snapshot({ cacheKey, course, value, unit, queued }: { cacheKey: string; course: ReturnType<typeof useCompetitionCourse>["course"]; value: number; unit: string; queued: boolean }) {
  const [uri, setUri] = useState(() => snapshotCache.get(cacheKey) ?? ""), [expired, setExpired] = useState(false);
  useEffect(() => { const timer = setTimeout(() => setExpired(true), 15000); return () => clearTimeout(timer); }, []);
  const capture = (value: string) => { if (snapshotCache.size >= 32) snapshotCache.delete(snapshotCache.keys().next().value!); snapshotCache.set(cacheKey, value); setUri(value); };
  return <div className="compete-event-preview" style={{ position: "relative", display: "block", pointerEvents: "none" }}>
    {uri ? <><img src={uri} alt="3D snapshot of your current race position" /><small style={{ position: "absolute", bottom: 0, left: 0, background: "#ffffffdd", color: "#142b3b" }}>© Mapbox © OpenStreetMap</small></> : !expired && !queued && course && (unit === "mi" || unit === "km") ? <GeographicCourse course={course} lanes={[{ id: "you", name: "You", initials: "", you: true, value }]} unit={unit} selectedId="you" focusRequest={0} onSelect={() => {}} onSnapshot={capture} /> : <small>{queued ? "Course assigned when your wave starts" : unit === "pts" ? "Points event" : "Preview unavailable"}</small>}
  </div>;
}
