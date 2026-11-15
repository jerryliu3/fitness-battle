"use client";
import { typographyStyle } from "@/ui/section";
import { useState } from "react";
import { coursePreviewLanes, initialsFromName, type ArenaSceneLane, buildArenaModel, competitionTrack, competePeriodWindow, competeNow, isMetricCompete, type CompeteState, type SportId } from "@fitness-battle/shared";
import { useCompetitionCourse } from "@/features/course/use-competition-course";
import { GeographicCourse } from "@/features/course/geographic-course";
import { useAuth } from "@/components/auth-context";
import { useCompete } from "@/components/compete-context";
import { CompeteTimeSeriesChart } from "@/features/field/components/compete-time-series-chart";
const snapshotCache = new Map<string, string>();
export function CoursePreview({ sport, queued, state }: { sport: SportId; queued: boolean; state: CompeteState }) {
  const { user } = useAuth();
  const { debugActive } = useCompete();
  const period = competePeriodWindow(state, competeNow(state), sport);
  const { course } = useCompetitionCourse(sport, period.startsAt.toISOString(), period.endsAt.toISOString(), debugActive, true);
  const model = buildArenaModel(state, undefined, competitionTrack(sport), sport), lane = model?.lanes.find(lane => lane.you);

  if (!queued && isMetricCompete(sport)) {
    return (
      <div
        className="compete-event-preview"
        style={{
          position: "relative",
          borderRadius: 12,
          overflow: "hidden",
          border: "1px solid var(--line)",
          background: "var(--paper)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          boxSizing: "border-box",
        }}
      >
        <CompeteTimeSeriesChart state={state} sport={sport} track={competitionTrack(sport)} compact />
      </div>
    );
  }

  const previewLanes = queued ? [{ id: "you", name: lane?.name ?? state.name, initials: "", you: true, value: 0 }, ...Array.from({ length: model?.lanes.filter(l => l.mystery).length ?? 0 }, (_, i) => ({ id: `mystery-${i}`, name: `Athlete #${i + 1}`, initials: "?", mystery: true, value: 0 }))] : coursePreviewLanes((model?.lanes ?? []).map(lane => ({ id: lane.id, name: lane.name, initials: lane.mystery ? "?" : initialsFromName(lane.name), avatarUrl: lane.avatarUrl, you: lane.you, ghost: lane.ghost, mystery: lane.mystery, value: lane.values[2] })), model?.unit ?? "");
  const cacheKey = `race-card-local-v8:${JSON.stringify(previewLanes)}:${queued}:${user?.id}:${sport}:${course?.name}:${course?.length}:${lane?.values[2]}:${state.units}`;
  return <div style={{ position: "relative", borderRadius: 12, overflow: "hidden" }}><Snapshot key={cacheKey} cacheKey={cacheKey} course={course} lanes={previewLanes} unit={model?.unit ?? ""} />{course ? <small style={{ ...typographyStyle("nav"), position: "absolute", zIndex: 2, bottom: 4, right: 6, textAlign: "right", background: "rgba(255,255,255,.85)", padding: "0 4px", borderRadius: 4 }}><a href="https://www.mapbox.com/about/maps" onClick={event => event.stopPropagation()}>© Mapbox</a> · <a href="https://www.openstreetmap.org/copyright" onClick={event => event.stopPropagation()}>© OpenStreetMap</a> · <a href="https://apps.mapbox.com/feedback/" title="Improve this map" aria-label="Improve this map" onClick={event => event.stopPropagation()}>ⓘ</a></small> : null}</div>;
}
function Snapshot({ cacheKey, course, lanes, unit }: { cacheKey: string; course: ReturnType<typeof useCompetitionCourse>["course"]; lanes: ArenaSceneLane[]; unit: string }) {
  const [uri, setUri] = useState(() => snapshotCache.get(cacheKey) ?? "");
  const capture = (value: string) => { if (snapshotCache.size >= 32) snapshotCache.delete(snapshotCache.keys().next().value!); snapshotCache.set(cacheKey, value); setUri(value); };
  return <div className="compete-event-preview" style={{ position: "relative", pointerEvents: "none" }}>
    {uri ? <img src={uri} alt="3D snapshot of your current race position" style={{ display: "block", width: "100%", height: "100%", objectFit: "cover" }} /> : course && lanes.length > 0 && (unit === "mi" || unit === "km") ? <GeographicCourse course={course} lanes={lanes} unit={unit} selectedId={lanes.find(lane => lane.you)?.id ?? ""} focusRequest={0} onSelect={() => {}} onSnapshot={capture} /> : <small>{unit === "hrs" || unit === "steps" ? "Chart preview" : "Preview unavailable"}</small>}
  </div>;
}
