import { useEffect, useMemo, useRef, useState, type ComponentRef } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import Mapbox, { MapView, Camera, ShapeSource, LineLayer, CircleLayer, CameraGestureObserver } from "@rnmapbox/maps";
import { createCourseCamera, raceCourseScene, type RaceCourse, type ArenaSceneLane, type CourseCameraPose } from "@fitness-battle/shared";
import { mobileEnv } from "../lib/env";
import { textStyle } from "./section";
import { useReducedMotion } from "./use-reduced-motion";

Mapbox.setAccessToken(mobileEnv.mapboxAccessToken);
export default function CourseMap({ course, lanes, unit, selectedId, focusRequest, onSelect }: {
  course: RaceCourse; lanes: ArenaSceneLane[]; unit: string; selectedId: string; focusRequest: number; onSelect(id: string): void;
}) {
  const ref = useRef<ComponentRef<typeof Camera>>(null);
  const reduced = useReducedMotion();
  const [spaced, setSpaced] = useState(true);
  const scene = useMemo(() => raceCourseScene(course, lanes, unit, selectedId, spaced ? 2 : 0), [course, lanes, unit, selectedId, spaced]);
  // Athlete updates must not resend the static 20k-point course to the native source.
  const route = useMemo(() => scene.route, [course]);
  const pose = useRef<CourseCameraPose>({ center: scene.selected?.coordinate ?? course.coordinates[0], zoom: 16, pitch: 60, bearing: 0 });
  const [ready, setReady] = useState(false), [error, setError] = useState(""), [flat, setFlat] = useState(false);
  const [following, setFollowing] = useState(true);
  const controller = useMemo(() => createCourseCamera({
    read: () => pose.current,
    // Native input already cancels animations. Issuing setCamera during a gesture would fight it.
    stop(userGesture) { if (userGesture) return; const p = pose.current; ref.current?.setCamera({ centerCoordinate: p.center, zoomLevel: p.zoom, pitch: p.pitch, heading: p.bearing, animationDuration: 0 }); },
    fit(bounds, duration) { ref.current?.setCamera({ bounds: { ...bounds, paddingTop: 48, paddingBottom: 48, paddingLeft: 48, paddingRight: 48 }, pitch: 0, heading: 0, animationDuration: duration, animationMode: "easeTo" }); },
    move(next, duration) { ref.current?.setCamera({ centerCoordinate: next.center, zoomLevel: next.zoom, pitch: next.pitch, heading: next.bearing, animationDuration: duration, animationMode: "easeTo" }); },
  }), []);
  useEffect(() => controller.setReducedMotion(Boolean(reduced)), [controller, reduced]);
  const focus = () => { if (scene.selected) { controller.focus(course, scene.selected.metres, false, scene.selected.lateralMetres); setFollowing(true); } };
  const lastFocus = useRef<{ course: RaceCourse; id: string; request: number } | null>(null);
  useEffect(() => {
    if (!ready || !scene.selected) return;
    const previous = lastFocus.current;
    const explicit = !previous || previous.course !== course || previous.id !== selectedId || previous.request !== focusRequest;
    lastFocus.current = { course, id: selectedId, request: focusRequest };
    controller.focus(course, scene.selected.metres, !explicit, scene.selected.lateralMetres);
    if (explicit) setFollowing(true);
  }, [ready, controller, course, selectedId, focusRequest, scene.selected?.metres, scene.selected?.lateralMetres]);
  const control = (label: string, action: () => void) => <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={() => { action(); setFollowing(controller.following); }} style={{ minHeight: 44, paddingHorizontal: 14, justifyContent: "center", borderRadius: 12, backgroundColor: "#ffffff" }}><Text style={textStyle("label")}>{label}</Text></Pressable>;
  return <View style={{ flex: 1, minHeight: 200 }}>
    <MapView style={{ flex: 1 }} styleURL="mapbox://styles/mapbox/standard" logoEnabled attributionEnabled
      onDidFinishLoadingMap={() => { setReady(true); setError(""); }}
      onMapLoadingError={() => setError("The map could not load. Check your connection and Mapbox access.")}
    >
      <Camera ref={ref} defaultSettings={{ centerCoordinate: pose.current.center, zoomLevel: 16, pitch: 60 }} />
      <CameraGestureObserver onCameraChanged={({ nativeEvent }) => {
        const p = nativeEvent.properties;
        pose.current = { center: [p.center[0], p.center[1]], zoom: p.zoom, pitch: p.pitch, bearing: p.heading };
        if (p.isUserInteraction && controller.following) { controller.interrupt(); setFollowing(false); }
      }} />
      <ShapeSource id="course" shape={route}><LineLayer id="course-line" slot="middle" style={{ lineColor: "#637482", lineWidth: 4, lineOpacity: .7 }} /></ShapeSource>
      <ShapeSource id="completed" shape={scene.trails}><LineLayer id="completed-line" slot="middle" style={{ lineColor: ["get", "color"], lineSortKey: ["get", "priority"], lineWidth: 6, lineCap: "round", lineJoin: "round" }} /></ShapeSource>
      <ShapeSource id="athletes" shape={scene.markers} onPress={event => { const id = event.features[0]?.properties?.id; if (typeof id === "string") onSelect(id); }}>
        <CircleLayer id="athlete-dots" slot="top" style={{ circleRadius: ["case", ["get", "selected"], 10, 7], circleColor: ["case", ["get", "you"], "#f7c948", "#20b9c6"], circleStrokeColor: "#ffffff", circleStrokeWidth: 2 }} />
      </ShapeSource>
    </MapView>
    {error ? <Text accessibilityRole="alert" style={{ ...textStyle("body"), padding: 12, backgroundColor: "#ffffff" }}>{error}</Text> : null}
    <ScrollView horizontal style={{ flexGrow: 0, backgroundColor: "#142b3b" }} contentContainerStyle={{ flexDirection: "row", gap: 6, padding: 8 }}>
      {control(following ? "Following" : "Recenter", focus)}
      {control(flat ? "3D chase" : "2D map", () => { controller.dimension(flat ? "3d" : "2d"); setFlat(!flat); })}
      {control(spaced ? "Racers: spaced" : "Racers: together", () => setSpaced(value => !value))}
      {control("Whole route", () => { controller.overview(course); setFlat(true); })}
      {control("Zoom in", () => controller.zoom(1))}{control("Zoom out", () => controller.zoom(-1))}
    </ScrollView>
  </View>;
}
