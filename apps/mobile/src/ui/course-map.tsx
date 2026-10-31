import Svg, { G } from "react-native-svg";
import { AthletePennant } from "./athlete-pennant";
import { useEffect, useId, useMemo, useRef, useState, type ComponentRef } from "react";
import { View, Text, Pressable } from "react-native";
import Mapbox, { MapView, Camera, ShapeSource, LineLayer, CircleLayer, MarkerView, CameraGestureObserver } from "@rnmapbox/maps";
import { courseReplayPose, type CourseReplayFrame, courseAthleteDetail, createCourseCamera, raceEffortMetres, raceCourseScene, RACE_LANE_SPACING_METRES, RACE_TRAIL_WIDTH_METRES, RACE_TRAIL_MIN_WIDTH_PIXELS, type CourseDistanceTarget, type RaceCourse, type ArenaSceneLane, type CourseCameraPose } from "@fitness-battle/shared";
import { mobileEnv } from "../lib/env";
import { CourseOptions } from "./course-options";
import { FieldOverlayView } from "./field-overlay-motion";
import { textStyle } from "./section";
import { useReducedMotion } from "./use-reduced-motion";

Mapbox.setAccessToken(mobileEnv.mapboxAccessToken);
export default function CourseMap({ cardSessionKey, initialFlat = false, onFlatChange, onFollowChange, followAthlete = true, onReady, replay, course, lanes, hiddenIds = [], unit, selectedId, focusRequest, onSelect, controlsBottom = 8, optionsTop = 12, onReplay, overlaysHidden = false, distanceTarget }: {
  cardSessionKey?: string | number | boolean;
  initialFlat?: boolean; onFlatChange?: (flat: boolean) => void; followAthlete?: boolean; onFollowChange?: (following: boolean) => void;
  onReady?: () => void; replay?: CourseReplayFrame; distanceTarget?: CourseDistanceTarget | null;
  hiddenIds?: readonly string[]; course: RaceCourse; lanes: ArenaSceneLane[]; unit: string; selectedId: string; focusRequest: number; onSelect(id: string): void; controlsBottom?: number; optionsTop?: number | null; onReplay?: () => void; overlaysHidden?: boolean;
}) {
  const [dismissed, setDismissed] = useState<string[]>([]);
  useEffect(() => { setDismissed([]); }, [course, cardSessionKey]);
  useEffect(() => { setDismissed(ids => ids.filter(id => id !== selectedId)); }, [selectedId, focusRequest]);
  const prefix = useId();
  const ref = useRef<ComponentRef<typeof Camera>>(null);
  const reduced = useReducedMotion();
  const [spaced, setSpaced] = useState(true);
  const scene = useMemo(() => raceCourseScene(course, lanes, unit, selectedId, spaced ? RACE_LANE_SPACING_METRES : 0), [course, lanes, unit, selectedId, spaced]);
  const visibleTrails = useMemo(() => hiddenIds.length ? { ...scene.trails, features: scene.trails.features.filter(feature => !hiddenIds.includes(String(feature.id))) } : scene.trails, [scene.trails, hiddenIds]);
  const visibleMarkers = useMemo(() => hiddenIds.length ? { ...scene.markers, features: scene.markers.features.filter(feature => !hiddenIds.includes(String(feature.id))) } : scene.markers, [scene.markers, hiddenIds]);
  const trailWidth = RACE_TRAIL_WIDTH_METRES / (78271.516964 * Math.cos(course.coordinates[0][1] * Math.PI / 180));
  const pose = useRef<CourseCameraPose>({ center: scene.selected?.coordinate ?? course.coordinates[0], zoom: 16, pitch: initialFlat ? 0 : 60, bearing: 0 });
  const [ready, setReady] = useState(false), [error, setError] = useState(""), [flat, setFlat] = useState(initialFlat);
  const controller = useMemo(() => createCourseCamera({
    read: () => pose.current,
    // Native input already cancels animations. Issuing setCamera during a gesture would fight it.
    stop(userGesture) { if (userGesture) return; const p = pose.current; ref.current?.setCamera({ centerCoordinate: p.center, zoomLevel: p.zoom, pitch: p.pitch, heading: p.bearing, animationDuration: 0 }); },
    follow(next) { ref.current?.setCamera({ centerCoordinate: next.center, zoomLevel: next.zoom, pitch: next.pitch, heading: next.bearing, animationDuration: 0 }); },
    fit(bounds, duration) { ref.current?.setCamera({ bounds: { ...bounds, paddingTop: 48, paddingBottom: 48, paddingLeft: 48, paddingRight: 48 }, pitch: 0, heading: 0, animationDuration: duration, animationMode: "easeTo" }); },
    move(next, duration) { ref.current?.setCamera({ centerCoordinate: next.center, zoomLevel: next.zoom, pitch: next.pitch, heading: next.bearing, animationDuration: duration, animationMode: "easeTo" }); },
  }, Boolean(reduced), initialFlat ? "2d" : "3d"), []);
  useEffect(() => controller.setReducedMotion(Boolean(reduced)), [controller, reduced]);
  useEffect(() => { if (!followAthlete && controller.following) controller.interrupt(false); }, [controller, followAthlete, reduced]);
  const focus = () => { if (scene.selected) { controller.focus(course, scene.selected.metres, false, scene.selected.lateralMetres); } };
  const lastFocus = useRef<{ course: RaceCourse; id: string; request: number; following: boolean; session?: string | number | boolean } | null>(null);
  useEffect(() => {
    if (!ready || !scene.selected || replay) return;
    const previous = lastFocus.current;
    const explicit = !previous || previous.course !== course || previous.id !== selectedId || previous.request !== focusRequest || !previous.following || previous.session !== cardSessionKey;
    lastFocus.current = { course, id: selectedId, request: focusRequest, following: followAthlete, session: cardSessionKey };
    if (!followAthlete) return;
    controller.focus(course, scene.selected.metres, !explicit, scene.selected.lateralMetres);
  }, [ready, controller, course, selectedId, focusRequest, cardSessionKey, followAthlete, scene.selected?.metres, scene.selected?.lateralMetres, replay]);
  useEffect(() => {
    if (!ready || !replay || !scene.selected) return;
    const rival = scene.callouts.find(lane => lane.id === replay.nearestId);
    const next = courseReplayPose(course, scene.selected, rival, reduced ? 0 : replay.focus);
    ref.current?.setCamera({ centerCoordinate: next.center, zoomLevel: next.zoom, pitch: next.pitch, heading: next.bearing, animationDuration: 0 });
  }, [ready, course, scene, replay, reduced]);
  useEffect(() => {
    if (!ready || !distanceTarget) return;
    const metres = raceEffortMetres(distanceTarget.value, unit);
    if (metres === null) return;
    controller.seek(course, metres);
  }, [ready, course, unit, distanceTarget?.value, distanceTarget?.request, controller]);
  return <View style={{ flex: 1, minHeight: 0 }}>
    <MapView accessibilityLabel="Geographic race course. Drag to explore; pinch to zoom." zoomEnabled={!replay} scrollEnabled={!replay} rotateEnabled={!replay} pitchEnabled={!replay} style={{ flex: 1 }} styleURL="mapbox://styles/mapbox/standard" logoEnabled attributionEnabled
      logoPosition={{ top: 8, left: 8 }} attributionPosition={{ top: 8, left: 100 }}
      scaleBarPosition={{ bottom: controlsBottom + 100, left: 8 }}
      onDidFinishLoadingMap={() => { setReady(true); setError(""); onReady?.(); }}
      onMapLoadingError={event => setError(ready && event?.type !== "style" ? "Some map scenery could not load. Check your connection." : "The map could not load. Check your connection and Mapbox access.")}
      onMapIdle={() => { if (ready) setError(""); }}
    >
      <Camera minZoomLevel={0} maxZoomLevel={20} ref={ref} defaultSettings={{ centerCoordinate: pose.current.center, zoomLevel: 16, pitch: initialFlat ? 0 : 60 }} />
      <CameraGestureObserver onCameraChanged={({ nativeEvent }) => {
        const p = nativeEvent.properties;
        pose.current = { center: [p.center[0], p.center[1]], zoom: p.zoom, pitch: p.pitch, bearing: p.heading };
        if (p.isUserInteraction && controller.following) { controller.interrupt(); onFollowChange?.(false); }
      }} />
      <ShapeSource id="completed" shape={visibleTrails}><LineLayer id="completed-line" slot="middle" style={{ lineColor: ["get", "color"], lineSortKey: ["get", "priority"], lineWidth: ["interpolate", ["exponential", 2], ["zoom"], 0, RACE_TRAIL_MIN_WIDTH_PIXELS, 16, Math.max(RACE_TRAIL_MIN_WIDTH_PIXELS, trailWidth * 2 ** 16), 22, trailWidth * 2 ** 22], lineCap: "round", lineJoin: "round" }} /></ShapeSource>
      <ShapeSource id="athletes" shape={visibleMarkers} onPress={event => { const id = event.features[0]?.properties?.id; if (typeof id === "string") onSelect(id); }}>
        <CircleLayer id="athlete-dots" slot="top" style={{ circleRadius: ["case", ["get", "selected"], 5, 3], circleColor: ["case", ["get", "you"], "#f7c948", "#20b9c6"], circleStrokeColor: "#ffffff", circleStrokeWidth: 1 }} />
      </ShapeSource>
      {!reduced && replay ? replay.passEffects.filter(pass => !hiddenIds.includes(pass.id)).map(pass => {
        const lane = scene.callouts.find(lane => lane.id === pass.id);
        return lane ? <MarkerView key={`pass-${pass.id}`} coordinate={lane.coordinate} anchor={{x:.5,y:.5}} allowOverlap allowOverlapWithPuck><View pointerEvents="none" style={{width:100,height:100,alignItems:"center",justifyContent:"center"}}><View style={{width:32+64*(1-pass.strength),height:32+64*(1-pass.strength),borderRadius:60,borderWidth:4,borderColor:"#f7c948",backgroundColor:"#f7c94833",opacity:pass.strength}}/></View></MarkerView> : null;
      }) : null}
      {!overlaysHidden ? scene.callouts.filter(lane => !hiddenIds.includes(lane.id) && !dismissed.includes(lane.id)).map(lane => <MarkerView key={lane.id} coordinate={lane.coordinate} anchor={{ x: lane.callout.left ? 1 : 0, y: lane.callout.originY / lane.callout.height }} allowOverlap allowOverlapWithPuck allowZElevate={false}>
        <View collapsable={false} pointerEvents="box-none" style={{ width: 170, height: lane.callout.height }}>
          <Svg width={170} height={lane.callout.height} viewBox={`0 0 170 ${lane.callout.height}`} pointerEvents="none"><G transform={`translate(${lane.callout.originX} ${lane.callout.originY})`}>
            <AthletePennant lane={lane} x={lane.callout.left ? -158 : 12} y={lane.callout.y} detail={courseAthleteDetail(lanes, lane, unit)} prefix={`${prefix}-${lane.id}`} />
          </G></Svg>
          <Pressable accessibilityRole="button" accessibilityLabel={`Focus ${lane.name}, ${courseAthleteDetail(lanes, lane, unit)}`} onTouchStart={event => event.stopPropagation()} onPress={() => onSelect(lane.id)} style={{ position: "absolute", left: 12, top: lane.callout.cardTop, width: 146, height: 46 }} />
          <Pressable accessibilityRole="button" accessibilityLabel={`Hide ${lane.name} card`} onTouchStart={event => event.stopPropagation()} onPress={() => setDismissed(ids => [...ids, lane.id])} hitSlop={8} style={{ position: "absolute", right: 4, top: lane.callout.cardTop - 8, width: 28, height: 28, borderRadius: 14, backgroundColor: "white", alignItems: "center", justifyContent: "center" }}><Text style={textStyle("label")}>−</Text></Pressable>
        </View>
      </MarkerView>) : null}
    </MapView>
    {error ? <Text accessibilityRole="alert" style={{ ...textStyle("body"), position: "absolute", left: 8, right: 8, bottom: controlsBottom + 136, padding: 12, borderRadius: 12, backgroundColor: "#ffffff" }}>{error}</Text> : null}
    {optionsTop != null ? <FieldOverlayView hidden={overlaysHidden} onTouchStart={event => event.stopPropagation()} style={{ position: "absolute", top: optionsTop, right: 12 }}>
      <CourseOptions
        onReplay={onReplay}
        flat={flat}
        spaced={spaced}
        onToggleDimension={() => { controller.dimension(flat ? "3d" : "2d", !(followAthlete && controller.following && scene.selected)); setFlat(!flat); onFlatChange?.(!flat); if (followAthlete && controller.following) focus(); }}
        onToggleSpacing={() => setSpaced(value => !value)}
        onOverview={() => { onFollowChange?.(false); controller.overview({ coordinates: scene.overviewCoordinates }); setFlat(true); onFlatChange?.(true); }}
      />
    </FieldOverlayView> : null}
  </View>;
}
