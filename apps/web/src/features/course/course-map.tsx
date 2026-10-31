"use client";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { courseAthleteDetail, createCourseCamera, raceEffortMetres, raceCourseScene, RACE_LANE_SPACING_METRES, RACE_TRAIL_WIDTH_METRES, RACE_TRAIL_MIN_WIDTH_PIXELS, type CourseDistanceTarget, type RaceCourse, type ArenaSceneLane, type CourseCameraPose } from "@fitness-battle/shared";
import { CourseCallout } from "./course-callout";
import { webEnv } from "@/lib/env";

export default function CourseMap({ initialFlat = false, onFlatChange, onFollowChange, followAthlete = true, course, lanes, unit, selectedId, focusRequest, onSelect, controlsBottom = 8, extraControls, distanceTarget, onResumeFollow }: {
  initialFlat?: boolean; onFlatChange?: (flat: boolean) => void; followAthlete?: boolean; onFollowChange?: (following: boolean) => void;
  distanceTarget?: CourseDistanceTarget | null; onResumeFollow?: () => void;
  course: RaceCourse; lanes: ArenaSceneLane[]; unit: string; selectedId: string; focusRequest: number; onSelect(id: string): void; controlsBottom?: number; extraControls?: ReactNode;
}) {
  const [dismissed, setDismissed] = useState<string[]>([]);
  useEffect(() => { setDismissed(ids => ids.filter(id => id !== selectedId)); }, [selectedId, focusRequest]);
  const container = useRef<HTMLDivElement>(null), map = useRef<mapboxgl.Map | null>(null);
  const [ready, setReady] = useState(false), [error, setError] = useState(""), [flat, setFlat] = useState(initialFlat), [following, setFollowing] = useState(true);
  const [spaced, setSpaced] = useState(true);
  const scene = useMemo(() => raceCourseScene(course, lanes, unit, selectedId, spaced ? RACE_LANE_SPACING_METRES : 0), [course, lanes, unit, selectedId, spaced]);
  const latest = useRef({ scene, onSelect, onFollowChange }); latest.current = { scene, onSelect, onFollowChange };
  const reduced = useRef(false);
  const camera = useRef<ReturnType<typeof createCourseCamera> | null>(null);
  useEffect(() => {
    if (!container.current) return;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    reduced.current = preference.matches;
    let instance: mapboxgl.Map;
    try { instance = new mapboxgl.Map({ container: container.current, accessToken: webEnv.mapboxAccessToken,
      style: "mapbox://styles/mapbox/standard", center: latest.current.scene.selected?.coordinate ?? course.coordinates[0], zoom: 16, pitch: initialFlat ? 0 : 60, minZoom: 0, maxZoom: 20,
      attributionControl: false, logoPosition: "top-left", antialias: true }); }
    catch { setError("This browser could not start the 3D map."); return; }
    setReady(false);
    map.current = instance;
    instance.addControl(new mapboxgl.AttributionControl({ compact: true }), "top-left");
    const read = (): CourseCameraPose => ({ center: instance.getCenter().toArray(), zoom: instance.getZoom(), pitch: instance.getPitch(), bearing: instance.getBearing() });
    const buildCamera = () => { camera.current = createCourseCamera({ read, fit: (bounds, duration) => { instance.fitBounds([bounds.sw, bounds.ne], { padding: 48, pitch: 0, bearing: 0, maxZoom: 20, duration }); }, stop: userGesture => { if (!userGesture) instance.stop(); }, move: (pose, duration) => instance.easeTo({ center: pose.center, zoom: pose.zoom, pitch: pose.pitch, bearing: pose.bearing, duration }) }, reduced.current); };
    buildCamera();
    camera.current?.dimension(initialFlat ? "2d" : "3d");
    const preferenceChanged = () => { reduced.current = preference.matches; camera.current?.setReducedMotion(reduced.current); };
    preference.addEventListener("change", preferenceChanged);
    const interrupt = (event: { originalEvent?: unknown }) => { if (event.originalEvent) { camera.current?.interrupt(); setFollowing(false); latest.current.onFollowChange?.(false); } };
    instance.on("movestart", interrupt);
    instance.on("error", () => setError("Some map data could not load. Check your connection and Mapbox access."));
    instance.on("idle", () => setError(""));
    instance.on("load", () => {
      const s = latest.current.scene;
      instance.addSource("completed", { type: "geojson", data: s.trails });
      instance.addSource("athletes", { type: "geojson", data: s.markers });
      const trailWidth = RACE_TRAIL_WIDTH_METRES / (78271.516964 * Math.cos(course.coordinates[0][1] * Math.PI / 180));
      instance.addLayer({ id: "completed-line", type: "line", source: "completed", slot: "middle", layout: { "line-cap": "round", "line-join": "round", "line-sort-key": ["get", "priority"] }, paint: { "line-color": ["get", "color"], "line-width": ["interpolate", ["exponential", 2], ["zoom"], 0, RACE_TRAIL_MIN_WIDTH_PIXELS, 16, Math.max(RACE_TRAIL_MIN_WIDTH_PIXELS, trailWidth * 2 ** 16), 22, trailWidth * 2 ** 22] } });
      instance.addLayer({ id: "athlete-dots", type: "circle", source: "athletes", slot: "top", paint: { "circle-radius": ["case", ["get", "selected"], 5, 3], "circle-color": ["case", ["get", "you"], "#f7c948", "#20b9c6"], "circle-stroke-color": "#ffffff", "circle-stroke-width": 1 } });
      instance.on("click", "athlete-dots", event => { const id = event.features?.[0]?.properties?.id; if (typeof id === "string") latest.current.onSelect(id); });
      setReady(true); setError("");
    });
    const observer = new ResizeObserver(() => instance.resize()); observer.observe(container.current);
    return () => { observer.disconnect(); preference.removeEventListener("change", preferenceChanged); instance.remove(); map.current = null; camera.current = null; };
  }, [course]);
  useEffect(() => {
    const instance = map.current; if (!ready || !instance || !instance.getSource("completed")) return;
    (instance.getSource("completed") as mapboxgl.GeoJSONSource).setData(scene.trails);
  }, [ready, scene.trails]);
  useEffect(() => {
    if (ready) (map.current?.getSource("athletes") as mapboxgl.GeoJSONSource | undefined)?.setData(scene.markers);
  }, [ready, scene.markers]);
  useEffect(() => { if (!followAthlete) { map.current?.stop(); camera.current?.interrupt(); setFollowing(false); } }, [followAthlete]);
  const lastFocus = useRef<{ course: RaceCourse; id: string; request: number } | null>(null);
  useEffect(() => {
    if (!ready || !scene.selected || !followAthlete) return;
    const previous = lastFocus.current;
    const explicit = !previous || previous.course !== course || previous.id !== selectedId || previous.request !== focusRequest;
    lastFocus.current = { course, id: selectedId, request: focusRequest };
    camera.current?.focus(course, scene.selected.metres, !explicit, scene.selected.lateralMetres);
    if (explicit) setFollowing(true);
  }, [ready, course, selectedId, focusRequest, followAthlete, scene.selected?.metres, scene.selected?.lateralMetres]);
  useEffect(() => {
    if (!ready || !distanceTarget) return;
    const metres = raceEffortMetres(distanceTarget.value, unit);
    if (metres === null) return;
    camera.current?.seek(course, metres);
    setFollowing(false);
  }, [ready, course, unit, distanceTarget?.value, distanceTarget?.request]);
  const control = (label: string, action: () => void) => <button type="button" className="fb-btn-line" style={{ whiteSpace: "nowrap", minHeight: 44 }} onClick={() => { action(); setFollowing(camera.current?.following ?? false); }}>{label}</button>;
  return <div className="geographic-map" style={{ flex: 1, minHeight: 200, display: "flex", flexDirection: "column", position: "relative", "--map-controls-bottom": `${controlsBottom}px` } as React.CSSProperties}>
    <div ref={container} aria-label="Geographic race course. Drag to explore; pinch or scroll to zoom." style={{ flex: 1, minHeight: 160, position: "relative", overflow: "hidden" }} />
    {ready && map.current ? scene.callouts.filter(lane => !dismissed.includes(lane.id)).map(lane => <CourseCallout key={lane.id} map={map.current!} lane={lane} coordinate={lane.coordinate} layout={lane.callout} detail={courseAthleteDetail(lanes, lane, unit)} onDismiss={() => setDismissed(ids => [...ids, lane.id])} onSelect={onSelect} />) : null}
    {error ? <p role="alert" className="fb-copy" style={{ position: "absolute", left: 8, right: 8, bottom: controlsBottom + 100, padding: 12, background: "white" }}>{error}</p> : null}
    <div className="geographic-map-controls" style={{ position: "absolute", bottom: controlsBottom, left: 8, right: 8, display: "flex", overflowX: "auto", gap: 8, padding: 8 }}>
      {extraControls}
      {control(following ? "Following" : "Recenter", () => { if (scene.selected) { camera.current?.focus(course, scene.selected.metres, false, scene.selected.lateralMetres); onResumeFollow?.(); onFollowChange?.(true); } })}
      {control(flat ? "3D chase" : "2D map", () => { camera.current?.dimension(flat ? "3d" : "2d"); setFlat(!flat); onFlatChange?.(!flat); if (followAthlete && camera.current?.following && scene.selected) camera.current.focus(course, scene.selected.metres, false, scene.selected.lateralMetres); })}
      {control(spaced ? "Shared lane: off" : "Shared lane: on", () => setSpaced(value => !value))}
      {control("Race overview", () => { camera.current?.overview({ coordinates: scene.overviewCoordinates }); setFlat(true); onFlatChange?.(true); })}
      {control("Zoom in", () => camera.current?.zoom(1))}{control("Zoom out", () => camera.current?.zoom(-1))}
    </div>
  </div>;
}
