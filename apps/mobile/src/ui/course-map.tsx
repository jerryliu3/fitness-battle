import Svg, { G } from "react-native-svg";
import { AthletePennant } from "./athlete-pennant";
import { useEffect, useId, useMemo, useRef, useState, type ReactNode, type ComponentRef } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import Mapbox, { MapView, Camera, ShapeSource, LineLayer, CircleLayer, MarkerView, CameraGestureObserver } from "@rnmapbox/maps";
import { courseAthleteDetail, createCourseCamera, raceEffortMetres, raceCourseScene, RACE_LANE_SPACING_METRES, RACE_TRAIL_WIDTH_METRES, RACE_TRAIL_MIN_WIDTH_PIXELS, type CourseDistanceTarget, type RaceCourse, type ArenaSceneLane, type CourseCameraPose } from "@fitness-battle/shared";
import { mobileEnv } from "../lib/env";
import { FieldOverlayView } from "./field-overlay-motion";
import { textStyle } from "./section";
import { useReducedMotion } from "./use-reduced-motion";

Mapbox.setAccessToken(mobileEnv.mapboxAccessToken);
export default function CourseMap({ course, lanes, unit, selectedId, focusRequest, onSelect, controlsBottom = 8, extraControls, overlaysHidden = false, distanceTarget, onResumeFollow }: {
  distanceTarget?: CourseDistanceTarget | null; onResumeFollow?: () => void;
  course: RaceCourse; lanes: ArenaSceneLane[]; unit: string; selectedId: string; focusRequest: number; onSelect(id: string): void; controlsBottom?: number; extraControls?: ReactNode; overlaysHidden?: boolean;
}) {
  const prefix = useId();
  const ref = useRef<ComponentRef<typeof Camera>>(null);
  const reduced = useReducedMotion();
  const [spaced, setSpaced] = useState(true);
  const scene = useMemo(() => raceCourseScene(course, lanes, unit, selectedId, spaced ? RACE_LANE_SPACING_METRES : 0), [course, lanes, unit, selectedId, spaced]);
  const trailWidth = RACE_TRAIL_WIDTH_METRES / (78271.516964 * Math.cos(course.coordinates[0][1] * Math.PI / 180));
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
  const focus = () => { if (scene.selected) { controller.focus(course, scene.selected.metres, false, scene.selected.lateralMetres); setFollowing(true); onResumeFollow?.(); } };
  const lastFocus = useRef<{ course: RaceCourse; id: string; request: number } | null>(null);
  useEffect(() => {
    if (!ready || !scene.selected) return;
    const previous = lastFocus.current;
    const explicit = !previous || previous.course !== course || previous.id !== selectedId || previous.request !== focusRequest;
    lastFocus.current = { course, id: selectedId, request: focusRequest };
    controller.focus(course, scene.selected.metres, !explicit, scene.selected.lateralMetres);
    if (explicit) setFollowing(true);
  }, [ready, controller, course, selectedId, focusRequest, scene.selected?.metres, scene.selected?.lateralMetres]);
  useEffect(() => {
    if (!ready || !distanceTarget) return;
    const metres = raceEffortMetres(distanceTarget.value, unit);
    if (metres === null) return;
    controller.seek(course, metres);
    setFollowing(false);
  }, [ready, course, unit, distanceTarget?.value, distanceTarget?.request, controller]);
  const control = (label: string, action: () => void) => <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={() => { action(); setFollowing(controller.following); }} style={{ minHeight: 44, paddingHorizontal: 14, justifyContent: "center", borderRadius: 12, backgroundColor: "#ffffff" }}><Text style={textStyle("label")}>{label}</Text></Pressable>;
  return <View style={{ flex: 1, minHeight: 200 }}>
    <MapView accessibilityLabel={`${course.name}. Out-and-back geographic race course.`} style={{ flex: 1 }} styleURL="mapbox://styles/mapbox/standard" logoEnabled attributionEnabled
      logoPosition={{ bottom: controlsBottom + 60, left: 8 }} attributionPosition={{ bottom: controlsBottom + 60, right: 8 }}
      scaleBarPosition={{ bottom: controlsBottom + 100, left: 8 }}
      onDidFinishLoadingMap={() => { setReady(true); setError(""); }}
      onMapLoadingError={event => setError(ready && event?.type !== "style" ? "Some map scenery could not load. Check your connection." : "The map could not load. Check your connection and Mapbox access.")}
      onMapIdle={() => { if (ready) setError(""); }}
    >
      <Camera minZoomLevel={0} maxZoomLevel={20} ref={ref} defaultSettings={{ centerCoordinate: pose.current.center, zoomLevel: 16, pitch: 60 }} />
      <CameraGestureObserver onCameraChanged={({ nativeEvent }) => {
        const p = nativeEvent.properties;
        pose.current = { center: [p.center[0], p.center[1]], zoom: p.zoom, pitch: p.pitch, bearing: p.heading };
        if (p.isUserInteraction && controller.following) { controller.interrupt(); setFollowing(false); }
      }} />
      <ShapeSource id="completed" shape={scene.trails}><LineLayer id="completed-line" slot="middle" style={{ lineColor: ["get", "color"], lineSortKey: ["get", "priority"], lineWidth: ["interpolate", ["exponential", 2], ["zoom"], 0, RACE_TRAIL_MIN_WIDTH_PIXELS, 16, Math.max(RACE_TRAIL_MIN_WIDTH_PIXELS, trailWidth * 2 ** 16), 22, trailWidth * 2 ** 22], lineCap: "round", lineJoin: "round" }} /></ShapeSource>
      <ShapeSource id="athletes" shape={scene.markers} onPress={event => { const id = event.features[0]?.properties?.id; if (typeof id === "string") onSelect(id); }}>
        <CircleLayer id="athlete-dots" slot="top" style={{ circleRadius: ["case", ["get", "selected"], 5, 3], circleColor: ["case", ["get", "you"], "#f7c948", "#20b9c6"], circleStrokeColor: "#ffffff", circleStrokeWidth: 1 }} />
      </ShapeSource>
      {!overlaysHidden ? scene.callouts.map(lane => <MarkerView key={lane.id} coordinate={lane.coordinate} anchor={{ x: lane.callout.left ? 1 : 0, y: lane.callout.originY / lane.callout.height }} allowOverlap allowOverlapWithPuck allowZElevate={false}>
        <View collapsable={false} pointerEvents="box-none" style={{ width: 170, height: lane.callout.height }}>
          <Svg width={170} height={lane.callout.height} viewBox={`0 0 170 ${lane.callout.height}`} pointerEvents="none"><G transform={`translate(${lane.callout.originX} ${lane.callout.originY})`}>
            <AthletePennant lane={lane} x={lane.callout.left ? -158 : 12} y={lane.callout.y} detail={courseAthleteDetail(lanes, lane, unit)} prefix={`${prefix}-${lane.id}`} />
          </G></Svg>
          <Pressable accessibilityRole="button" accessibilityLabel={`Focus ${lane.name}, ${courseAthleteDetail(lanes, lane, unit)}`} onTouchStart={event => event.stopPropagation()} onPress={() => onSelect(lane.id)} style={{ position: "absolute", left: 12, top: lane.callout.cardTop, width: 146, height: 46 }} />
        </View>
      </MarkerView>) : null}
    </MapView>
    {error ? <Text accessibilityRole="alert" style={{ ...textStyle("body"), position: "absolute", left: 8, right: 8, bottom: controlsBottom + 136, padding: 12, borderRadius: 12, backgroundColor: "#ffffff" }}>{error}</Text> : null}
    <FieldOverlayView hidden={overlaysHidden} onTouchStart={event => event.stopPropagation()} style={{ position: "absolute", bottom: controlsBottom, left: 8, right: 8 }}><ScrollView horizontal style={{ flexGrow: 0, borderRadius: 12, backgroundColor: "#142b3b" }} contentContainerStyle={{ flexDirection: "row", gap: 6, padding: 8 }}>
      {extraControls}
      {control(following ? "Following" : "Recenter", focus)}
      {control(flat ? "3D chase" : "2D map", () => { controller.dimension(flat ? "3d" : "2d"); setFlat(!flat); if (controller.following) focus(); })}
      {control(spaced ? "Racers: spaced" : "Racers: together", () => setSpaced(value => !value))}
      {control("Race overview", () => { controller.overview({ coordinates: scene.overviewCoordinates }); setFlat(true); })}
      {control("Zoom in", () => controller.zoom(1))}{control("Zoom out", () => controller.zoom(-1))}
    </ScrollView></FieldOverlayView>
  </View>;
}
