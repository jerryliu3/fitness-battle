"use client";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { courseAthleteDetail, createCourseCamera, raceCourseScene, RACE_LANE_SPACING_METRES, RACE_TRAIL_WIDTH_METRES, RACE_TRAIL_MIN_WIDTH_PIXELS, type RaceCourse, type ArenaSceneLane, type CourseCameraPose } from "@fitness-battle/shared";
import { CourseCallout } from "./course-callout";
import { webEnv } from "@/lib/env";

export default function CourseMap({ course, lanes, unit, selectedId, focusRequest, onSelect, controlsBottom = 8, extraControls }: {
  course: RaceCourse; lanes: ArenaSceneLane[]; unit: string; selectedId: string; focusRequest: number; onSelect(id: string): void; controlsBottom?: number; extraControls?: ReactNode;
}) {
  const container = useRef<HTMLDivElement>(null), map = useRef<mapboxgl.Map | null>(null);
  const [ready, setReady] = useState(false), [error, setError] = useState(""), [flat, setFlat] = useState(false), [following, setFollowing] = useState(true);
  const [spaced, setSpaced] = useState(true);
  const scene = useMemo(() => raceCourseScene(course, lanes, unit, selectedId, spaced ? RACE_LANE_SPACING_METRES : 0), [course, lanes, unit, selectedId, spaced]);
  const latest = useRef({ scene, onSelect }); latest.current = { scene, onSelect };
  const reduced = useRef(false);
  const camera = useRef<ReturnType<typeof createCourseCamera> | null>(null);
  useEffect(() => {
    if (!container.current) return;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    reduced.current = preference.matches;
    let instance: mapboxgl.Map;
    try { instance = new mapboxgl.Map({ container: container.current, accessToken: webEnv.mapboxAccessToken,
      style: "mapbox://styles/mapbox/standard", center: latest.current.scene.selected?.coordinate ?? course.coordinates[0], zoom: 16, pitch: 60, minZoom: 0, maxZoom: 20,
      attributionControl: true, antialias: true }); }
    catch { setError("This browser could not start the 3D map."); return; }
    setReady(false);
    map.current = instance;
    const read = (): CourseCameraPose => ({ center: instance.getCenter().toArray(), zoom: instance.getZoom(), pitch: instance.getPitch(), bearing: instance.getBearing() });
    const buildCamera = () => { camera.current = createCourseCamera({ read, fit: (bounds, duration) => { instance.fitBounds([bounds.sw, bounds.ne], { padding: 48, pitch: 0, bearing: 0, maxZoom: 20, duration }); }, stop: userGesture => { if (!userGesture) instance.stop(); }, move: (pose, duration) => instance.easeTo({ center: pose.center, zoom: pose.zoom, pitch: pose.pitch, bearing: pose.bearing, duration }) }, reduced.current); };
    buildCamera();
    const preferenceChanged = () => { reduced.current = preference.matches; camera.current?.setReducedMotion(reduced.current); };
    preference.addEventListener("change", preferenceChanged);
    const interrupt = (event: { originalEvent?: unknown }) => { if (event.originalEvent) { camera.current?.interrupt(); setFollowing(false); } };
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
  const lastFocus = useRef<{ course: RaceCourse; id: string; request: number } | null>(null);
  useEffect(() => {
    if (!ready || !scene.selected) return;
    const previous = lastFocus.current;
    const explicit = !previous || previous.course !== course || previous.id !== selectedId || previous.request !== focusRequest;
    lastFocus.current = { course, id: selectedId, request: focusRequest };
    camera.current?.focus(course, scene.selected.metres, !explicit, scene.selected.lateralMetres);
    if (explicit) setFollowing(true);
  }, [ready, course, selectedId, focusRequest, scene.selected?.metres, scene.selected?.lateralMetres]);
  const control = (label: string, action: () => void) => <button type="button" className="fb-btn-line" style={{ whiteSpace: "nowrap", minHeight: 44 }} onClick={() => { action(); setFollowing(camera.current?.following ?? false); }}>{label}</button>;
  return <div className="geographic-map" style={{ flex: 1, minHeight: 200, display: "flex", flexDirection: "column", position: "relative", "--map-controls-bottom": `${controlsBottom}px` } as React.CSSProperties}>
    <div ref={container} aria-label="Geographic race course. Drag to explore; pinch or scroll to zoom." style={{ flex: 1, minHeight: 160, position: "relative", overflow: "hidden" }} />
    {ready && map.current ? scene.callouts.map(lane => <CourseCallout key={lane.id} map={map.current!} lane={lane} coordinate={lane.coordinate} layout={lane.callout} detail={courseAthleteDetail(lanes, lane, unit)} onSelect={onSelect} />) : null}
    {error ? <p role="alert" className="fb-copy" style={{ position: "absolute", left: 8, right: 8, bottom: controlsBottom + 100, padding: 12, background: "white" }}>{error}</p> : null}
    <div className="geographic-map-controls" style={{ position: "absolute", bottom: controlsBottom, left: 8, right: 8, display: "flex", overflowX: "auto", gap: 8, padding: 8 }}>
      {extraControls}
      {control(following ? "Following" : "Recenter", () => { if (scene.selected) camera.current?.focus(course, scene.selected.metres, false, scene.selected.lateralMetres); })}
      {control(flat ? "3D chase" : "2D map", () => { camera.current?.dimension(flat ? "3d" : "2d"); setFlat(!flat); if (camera.current?.following && scene.selected) camera.current.focus(course, scene.selected.metres, false, scene.selected.lateralMetres); })}
      {control(spaced ? "Racers: spaced" : "Racers: together", () => setSpaced(value => !value))}
      {control("Race overview", () => { camera.current?.overview({ coordinates: scene.overviewCoordinates }); setFlat(true); })}
      {control("Zoom in", () => camera.current?.zoom(1))}{control("Zoom out", () => camera.current?.zoom(-1))}
    </div>
  </div>;
}
