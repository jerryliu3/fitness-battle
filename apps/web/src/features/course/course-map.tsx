"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { createCourseCamera, raceCourseScene, type RaceCourse, type ArenaSceneLane, type CourseCameraPose } from "@fitness-battle/shared";
import { webEnv } from "@/lib/env";

export default function CourseMap({ course, lanes, unit, selectedId, focusRequest, onSelect }: {
  course: RaceCourse; lanes: ArenaSceneLane[]; unit: string; selectedId: string; focusRequest: number; onSelect(id: string): void;
}) {
  const container = useRef<HTMLDivElement>(null), map = useRef<mapboxgl.Map | null>(null);
  const [ready, setReady] = useState(false), [error, setError] = useState(""), [flat, setFlat] = useState(false), [following, setFollowing] = useState(true);
  const [spaced, setSpaced] = useState(true);
  const scene = useMemo(() => raceCourseScene(course, lanes, unit, selectedId, spaced ? 2 : 0), [course, lanes, unit, selectedId, spaced]);
  const latest = useRef({ scene, onSelect }); latest.current = { scene, onSelect };
  const reduced = useRef(false);
  const camera = useRef<ReturnType<typeof createCourseCamera> | null>(null);
  useEffect(() => {
    if (!container.current) return;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    reduced.current = preference.matches;
    let instance: mapboxgl.Map;
    try { instance = new mapboxgl.Map({ container: container.current, accessToken: webEnv.mapboxAccessToken,
      style: "mapbox://styles/mapbox/standard", center: latest.current.scene.selected?.coordinate ?? course.coordinates[0], zoom: 16, pitch: 60,
      attributionControl: true, antialias: true }); }
    catch { setError("This browser could not start the 3D map."); return; }
    setReady(false);
    map.current = instance;
    const read = (): CourseCameraPose => ({ center: instance.getCenter().toArray(), zoom: instance.getZoom(), pitch: instance.getPitch(), bearing: instance.getBearing() });
    const buildCamera = () => { camera.current = createCourseCamera({ read, fit: (bounds, duration) => { instance.fitBounds([bounds.sw, bounds.ne], { padding: 48, pitch: 0, bearing: 0, duration }); }, stop: userGesture => { if (!userGesture) instance.stop(); }, move: (pose, duration) => instance.easeTo({ center: pose.center, zoom: pose.zoom, pitch: pose.pitch, bearing: pose.bearing, duration }) }, reduced.current); };
    buildCamera();
    const preferenceChanged = () => { reduced.current = preference.matches; camera.current?.setReducedMotion(reduced.current); };
    preference.addEventListener("change", preferenceChanged);
    const interrupt = (event: { originalEvent?: unknown }) => { if (event.originalEvent) { camera.current?.interrupt(); setFollowing(false); } };
    instance.on("movestart", interrupt);
    instance.on("error", () => setError("Map data could not load. Check your connection and Mapbox access."));
    instance.on("load", () => {
      const s = latest.current.scene;
      instance.addSource("course", { type: "geojson", data: s.route });
      instance.addSource("completed", { type: "geojson", data: s.trails });
      instance.addSource("athletes", { type: "geojson", data: s.markers });
      instance.addLayer({ id: "course-line", type: "line", source: "course", slot: "middle", paint: { "line-color": "#637482", "line-width": 4, "line-opacity": .7 } });
      instance.addLayer({ id: "completed-line", type: "line", source: "completed", slot: "middle", layout: { "line-cap": "round", "line-join": "round", "line-sort-key": ["get", "priority"] }, paint: { "line-color": ["get", "color"], "line-width": 6 } });
      instance.addLayer({ id: "athlete-dots", type: "circle", source: "athletes", slot: "top", paint: { "circle-radius": ["case", ["get", "selected"], 10, 7], "circle-color": ["case", ["get", "you"], "#f7c948", "#20b9c6"], "circle-stroke-color": "#ffffff", "circle-stroke-width": 2 } });
      instance.on("click", "athlete-dots", event => { const id = event.features?.[0]?.properties?.id; if (typeof id === "string") latest.current.onSelect(id); });
      setReady(true); setError("");
    });
    const observer = new ResizeObserver(() => instance.resize()); observer.observe(container.current);
    return () => { observer.disconnect(); preference.removeEventListener("change", preferenceChanged); instance.remove(); map.current = null; camera.current = null; };
  }, [course]);
  useEffect(() => {
    const instance = map.current; if (!ready || !instance || !instance.getSource("completed")) return;
    for (const [id, data] of [["completed", scene.trails], ["athletes", scene.markers]] as const) (instance.getSource(id) as mapboxgl.GeoJSONSource | undefined)?.setData(data);
  }, [ready, scene]);
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
  return <div style={{ flex: 1, minHeight: 200, display: "flex", flexDirection: "column" }}>
    <div ref={container} aria-label="Geographic race course. Drag to explore; pinch or scroll to zoom." style={{ flex: 1, minHeight: 160 }} />
    {error ? <p role="alert" className="fb-copy">{error}</p> : null}
    <div style={{ display: "flex", overflowX: "auto", flexShrink: 0, gap: 8, padding: 8 }}>
      {control(following ? "Following" : "Recenter", () => { if (scene.selected) camera.current?.focus(course, scene.selected.metres, false, scene.selected.lateralMetres); })}
      {control(flat ? "3D chase" : "2D map", () => { camera.current?.dimension(flat ? "3d" : "2d"); setFlat(!flat); })}
      {control(spaced ? "Racers: spaced" : "Racers: together", () => setSpaced(value => !value))}
      {control("Whole route", () => { camera.current?.overview(course); setFlat(true); })}
      {control("Zoom in", () => camera.current?.zoom(1))}{control("Zoom out", () => camera.current?.zoom(-1))}
    </div>
  </div>;
}
