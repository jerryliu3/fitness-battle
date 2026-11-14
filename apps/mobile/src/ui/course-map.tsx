import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MapAttribution } from "./map-attribution";
import { useThemeColors } from "../theme";
import { useAuth } from "../lib/auth";
import Svg, { G } from "react-native-svg";
import { AthletePennant } from "./athlete-pennant";
import { useEffect, useId, useMemo, useRef, useState, type ComponentRef, type ReactNode } from "react";
import { View, Text, Pressable } from "react-native";
import Mapbox, { MapView, Camera, ShapeSource, LineLayer, CircleLayer, MarkerView, CameraGestureObserver } from "@rnmapbox/maps";
import { courseReplayPose, type CourseReplayFrame, courseAthleteDetail, createCourseCamera, raceEffortMetres, raceCourseScene, RACE_LANE_SPACING_METRES, RACE_TRAIL_WIDTH_METRES, RACE_TRAIL_MIN_WIDTH_PIXELS, type CourseDistanceTarget, type RaceCourse, type ArenaSceneLane, type CourseCameraPose } from "@fitness-battle/shared";
import { mobileEnv } from "../lib/env";
import { CourseOptions } from "./course-options";
import { FieldOverlayView } from "./field-overlay-motion";
import { AppText, textStyle } from "./section";
import { useReducedMotion } from "./use-reduced-motion";
import { useSceneActive } from "./use-scene-active";

const rememberedProgress = new Map<string, number>();
const rememberedCameras = new Map<string, CourseCameraPose>();
const isValidPose = (p?: CourseCameraPose | null): p is CourseCameraPose =>
  Boolean(p && p.center && Array.isArray(p.center) && (Math.abs(p.center[0]) >= 1e-6 || Math.abs(p.center[1]) >= 1e-6) && !Number.isNaN(p.center[0]) && !Number.isNaN(p.center[1]) && typeof p.zoom === "number" && p.zoom > 1);

Mapbox.setAccessToken(mobileEnv.mapboxAccessToken);
export default function CourseMap({ presentationActive = true, cardSessionKey, initialFlat = false, onFlatChange, onFollowChange, followAthlete = true, onReady, onSnapshot, replay, course, lanes, hiddenIds = [], unit, selectedId, focusRequest, onSelect, controlsBottom = 8, optionsTop = 12, onReplay, onChoose2D, onOptionsChange, overlaysHidden = false, distanceTarget }: {
  presentationActive?: boolean;
  cardSessionKey?: string | number | boolean;
  initialFlat?: boolean; onFlatChange?: (flat: boolean) => void; followAthlete?: boolean; onFollowChange?: (following: boolean) => void;
  onReady?: () => void; onSnapshot?: (uri: string) => void; replay?: CourseReplayFrame; distanceTarget?: CourseDistanceTarget | null;
  hiddenIds?: readonly string[]; course: RaceCourse; lanes: ArenaSceneLane[]; unit: string; selectedId: string; focusRequest: number; onSelect(id: string): void; controlsBottom?: number; optionsTop?: number | null; onReplay?: () => void; onChoose2D?: () => void; onOptionsChange?: (options: ReactNode | null) => void; overlaysHidden?: boolean;
}) {
const appearanceColors = useThemeColors();
  const insets = useSafeAreaInsets();
  const sceneActive = useSceneActive();
  const active = sceneActive && presentationActive;
  const initialized = useRef(false);
  const snapshotTaken = useRef(false);
  const snapshotPending = useRef(false);
  const mapRef = useRef<ComponentRef<typeof MapView>>(null);
  const reported = useRef(false);
  const { user } = useAuth();
  const cameraKey = `${user?.id ?? "guest"}:${course.name}:${course.length}:${course.coordinates[0].join(",")}:${unit}`;
  const cachedPose = replay || onSnapshot ? undefined : rememberedCameras.get(cameraKey);
  const restored = useRef(isValidPose(cachedPose) ? cachedPose : undefined);
  const [dismissed, setDismissed] = useState<string[]>([]);
  useEffect(() => { setDismissed([]); }, [course, cardSessionKey]);
  useEffect(() => { setDismissed(ids => ids.filter(id => id !== selectedId)); }, [selectedId, focusRequest]);
  const prefix = useId();
  const ref = useRef<ComponentRef<typeof Camera>>(null);
  const reduced = useReducedMotion();
  const [spaced, setSpaced] = useState(true);
  const earnedDistance = Math.max(0, ...lanes.filter(lane => !lane.ghost).map(lane => lane.value));
  const clampedTarget = distanceTarget ? Math.max(0, Math.min(distanceTarget.value, earnedDistance)) : undefined;
  const scene = useMemo(() => raceCourseScene(course, lanes, unit, selectedId, spaced ? RACE_LANE_SPACING_METRES : 0), [course, lanes, unit, selectedId, spaced]);
  const visibleTrails = useMemo(() => hiddenIds.length ? { ...scene.trails, features: scene.trails.features.filter(feature => !hiddenIds.includes(String(feature.id))) } : scene.trails, [scene.trails, hiddenIds]);
  const visibleMarkers = useMemo(() => hiddenIds.length ? { ...scene.markers, features: scene.markers.features.filter(feature => !hiddenIds.includes(String(feature.id))) } : scene.markers, [scene.markers, hiddenIds]);
  const trailWidth = RACE_TRAIL_WIDTH_METRES / (78271.516964 * Math.cos(course.coordinates[0][1] * Math.PI / 180));
  const fallbackCenter = scene.selected?.coordinate ?? course.coordinates[0];
  const pose = useRef<CourseCameraPose>(restored.current ?? { center: fallbackCenter, zoom: 16, pitch: initialFlat ? 0 : 60, bearing: 0 });
  const [ready, setReady] = useState(false), [error, setError] = useState(""), [flat, setFlat] = useState(restored.current ? restored.current.pitch === 0 : initialFlat);
  const routeFrame = useRef(0);
  const controller = useMemo(() => createCourseCamera({
    read: () => pose.current,
    // Native input already cancels animations. Issuing setCamera during a gesture would fight it.
    stop(userGesture) { if (routeFrame.current) cancelAnimationFrame(routeFrame.current); routeFrame.current = 0; if (userGesture) return; const p = pose.current; ref.current?.setCamera({ centerCoordinate: p.center, zoomLevel: p.zoom, pitch: p.pitch, heading: p.bearing, animationDuration: 0 }); },
    follow(next) { ref.current?.setCamera({ centerCoordinate: next.center, zoomLevel: next.zoom, pitch: next.pitch, heading: next.bearing, animationDuration: 300, animationMode: "easeTo" }); },
    trace(poseAt, duration) {
      const start = Date.now();
      const tick = () => { const elapsed = Date.now() - start; const fraction = Math.min(1, elapsed / duration); const next = poseAt(fraction * fraction * (3 - 2 * fraction), elapsed); pose.current = next; ref.current?.setCamera({ centerCoordinate: next.center, zoomLevel: next.zoom, pitch: next.pitch, heading: next.bearing, animationDuration: 0 }); if (elapsed < duration + 1200) routeFrame.current = requestAnimationFrame(tick); else routeFrame.current = 0; };
      routeFrame.current = requestAnimationFrame(tick);
    },
    fit(bounds, duration) { ref.current?.setCamera({ bounds: { ...bounds, paddingTop: 48, paddingBottom: 48, paddingLeft: 48, paddingRight: 48 }, pitch: 0, heading: 0, animationDuration: duration, animationMode: "easeTo" }); },
    move(next, duration) { ref.current?.setCamera({ centerCoordinate: next.center, zoomLevel: next.zoom, pitch: next.pitch, heading: next.bearing, animationDuration: initialized.current ? duration : 0, animationMode: "easeTo" }); },
  }, Boolean(reduced), (restored.current ? restored.current.pitch === 0 : initialFlat) ? "2d" : "3d"), []);
  useEffect(() => { if (!active) controller.stopMotion(); return () => controller.stopMotion(); }, [controller, active]);
  useEffect(() => controller.setReducedMotion(Boolean(reduced)), [controller, reduced]);
  useEffect(() => { if (!followAthlete && controller.following) controller.interrupt(false); }, [controller, followAthlete, reduced]);
  const focus = () => { if (scene.selected) { controller.focus(course, scene.selected.metres, false, scene.selected.lateralMetres); } };
  const lastFocus = useRef<{ course: RaceCourse; id: string; request: number; following: boolean; session?: string | number | boolean; metres?: number } | null>(null);
  useEffect(() => {
    if ((!active && initialized.current) || !ready || !scene.selected || replay) return;
    if (restored.current) {
      const savedMetres = rememberedProgress.get(cameraKey);
      const anchorMetres = followAthlete ? scene.selected.metres : (savedMetres ?? scene.selected.metres);
      controller.anchor(course, anchorMetres, scene.selected.lateralMetres);
      initialized.current = true;
      lastFocus.current = { course, id: selectedId, request: focusRequest, following: followAthlete, session: cardSessionKey, metres: scene.selected.metres };
      restored.current = undefined;
      if (!followAthlete) {
        controller.interrupt(false);
        onFollowChange?.(false);
      }
      return;
    }
    const previous = lastFocus.current;
    const explicit = !previous || previous.course !== course || previous.id !== selectedId || previous.request !== focusRequest || !previous.following || previous.session !== cardSessionKey;
    lastFocus.current = { course, id: selectedId, request: focusRequest, following: followAthlete, session: cardSessionKey, metres: scene.selected.metres };
    if (!followAthlete) return;
    // Tab focus alone must never move a prepared camera.
    if (previous && !explicit && previous.metres === scene.selected.metres) return;
    controller.focus(course, scene.selected.metres, !explicit, scene.selected.lateralMetres);
    initialized.current = true;
  }, [active, ready, controller, course, selectedId, focusRequest, cardSessionKey, followAthlete, scene.selected?.metres, scene.selected?.lateralMetres, replay]);
  const replayTarget = useRef<CourseCameraPose | null>(null);
  replayTarget.current = replay && scene.selected
    ? courseReplayPose(course, scene.selected, scene.callouts.find(lane => lane.id === replay.nearestId), reduced ? 0 : replay.focus)
    : null;
  const replayActive = Boolean(replay);
  useEffect(() => {
    if (!active || !ready || !replayActive) return;
    // Keep one camera loop alive across rival changes and the final hold.
    // Native camera observations can lag, so interpolate our last commanded pose.
    let raf = 0, previous = Date.now();
    let current = pose.current;
    const tick = () => {
      const target = replayTarget.current;
      if (!target) return;
      const now = Date.now();
      const blend = reduced ? 1 : 1 - Math.exp(-Math.min(64, Math.max(1, now - previous)) / 220);
      previous = now;
      const angle = (from: number, to: number) => from + (((to - from) % 360 + 540) % 360 - 180) * blend;
      current = {
        center: [angle(current.center[0], target.center[0]), current.center[1] + (target.center[1] - current.center[1]) * blend],
        zoom: current.zoom + (target.zoom - current.zoom) * blend,
        pitch: target.pitch,
        bearing: angle(current.bearing, target.bearing),
      };
      ref.current?.setCamera({ centerCoordinate: current.center, zoomLevel: current.zoom, pitch: current.pitch, heading: current.bearing, padding: { paddingTop: 160, paddingBottom: 0, paddingLeft: 0, paddingRight: 0 }, animationDuration: 0 });
      pose.current = current;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, ready, course, replayActive, reduced]);
  useEffect(() => {
    if (!active || !ready || !distanceTarget) return;
    const metres = raceEffortMetres(clampedTarget ?? 0, unit);
    if (metres === null) return;
    controller.seek(course, metres);
  }, [active, ready, course, unit, distanceTarget?.value, distanceTarget?.request, clampedTarget, controller]);
  const optionsHandlers = useRef({ onReplay, onChoose2D, toggleDimension: () => {}, toggleSpacing: () => {}, overview: () => {} });
  optionsHandlers.current = { onReplay, onChoose2D,
    toggleDimension: () => { controller.dimension(flat ? "3d" : "2d", !(followAthlete && controller.following && scene.selected)); setFlat(!flat); onFlatChange?.(!flat); if (followAthlete && controller.following) focus(); },
    toggleSpacing: () => setSpaced(value => !value),
    overview: () => { onFollowChange?.(false); controller.overview({ coordinates: scene.overviewCoordinates }); setFlat(true); onFlatChange?.(true); },
  };
  useEffect(() => {
    if (!onOptionsChange) return;
    onOptionsChange(<CourseOptions flat={flat} spaced={spaced}
      onReplay={onReplay ? () => optionsHandlers.current.onReplay?.() : undefined}
      onChoose2D={onChoose2D ? () => optionsHandlers.current.onChoose2D?.() : undefined}
      onToggleDimension={() => optionsHandlers.current.toggleDimension()}
      onToggleSpacing={() => optionsHandlers.current.toggleSpacing()}
      onOverview={() => optionsHandlers.current.overview()} />);
    return () => onOptionsChange(null);
  }, [onOptionsChange, flat, spaced, Boolean(onReplay), Boolean(onChoose2D)]);
  return <View style={{ flex: 1, minHeight: 0 }}>
    <MapView ref={mapRef} accessibilityLabel="Geographic race course. Drag to explore; pinch to zoom." zoomEnabled={!replay} scrollEnabled={!replay} rotateEnabled={!replay} pitchEnabled={!replay} style={{ flex: 1 }} styleURL="mapbox://styles/mapbox/standard" logoEnabled={!onSnapshot} attributionEnabled={false}
      logoPosition={{ top: 8, right: 34 }} attributionPosition={{ top: 8, right: 8 }}
      scaleBarEnabled={optionsTop == null}
      scaleBarPosition={{ bottom: controlsBottom + 100, left: 8 }}
      onDidFinishLoadingMap={() => {
        setReady(true);
        setError("");
        const p = pose.current;
        if (isValidPose(p)) {
          ref.current?.setCamera({ centerCoordinate: p.center, zoomLevel: p.zoom, pitch: p.pitch, heading: p.bearing, animationDuration: 0 });
        }
      }}
      onMapLoadingError={event => setError(ready && event?.type !== "style" ? "Some map scenery could not load. Check your connection." : "The map could not load. Check your connection and Mapbox access.")}
      onMapIdle={() => { if (ready && onSnapshot && mapRef.current && !snapshotTaken.current && !snapshotPending.current) { snapshotPending.current = true; void mapRef.current.takeSnap(true).then(uri => { if (uri) { snapshotTaken.current = true; onSnapshot(uri); } }).catch(() => {}).finally(() => { snapshotPending.current = false; }); } if (ready) setError(""); if (ready && (initialized.current || replay) && !reported.current) { reported.current = true; onReady?.(); } }}
    >
      <Camera minZoomLevel={0} maxZoomLevel={20} ref={ref} defaultSettings={{ centerCoordinate: pose.current.center, zoomLevel: pose.current.zoom, pitch: pose.current.pitch, heading: pose.current.bearing }} />
      <CameraGestureObserver onCameraChanged={({ nativeEvent }) => {
        const p = nativeEvent.properties;
        if (!p || !p.center || !Array.isArray(p.center)) return;
        if ((Math.abs(p.center[0]) < 1e-6 && Math.abs(p.center[1]) < 1e-6) || Number.isNaN(p.center[0]) || Number.isNaN(p.center[1])) return;
        if (typeof p.zoom === "number" && p.zoom <= 0.1) return;
        pose.current = { center: [p.center[0], p.center[1]], zoom: p.zoom, pitch: p.pitch, bearing: p.heading };
        if (!replay) { rememberedCameras.set(cameraKey, pose.current); if (controller.courseMetres !== null) rememberedProgress.set(cameraKey, controller.courseMetres); else rememberedProgress.delete(cameraKey); }
        if (p.isUserInteraction && controller.following) { controller.interrupt(); onFollowChange?.(false); }
      }} />
      <ShapeSource id="completed" shape={visibleTrails}><LineLayer id="completed-line" slot="middle" style={{ lineColor: ["get", "color"], lineSortKey: ["get", "priority"], lineWidth: ["interpolate", ["exponential", 2], ["zoom"], 0, RACE_TRAIL_MIN_WIDTH_PIXELS, 16, Math.max(RACE_TRAIL_MIN_WIDTH_PIXELS, trailWidth * 2 ** 16), 22, trailWidth * 2 ** 22], lineCap: "round", lineJoin: "round" }} /></ShapeSource>
      <ShapeSource id="athletes" shape={visibleMarkers} onPress={event => { const id = event.features[0]?.properties?.id; if (typeof id === "string") onSelect(id); }}>
        <CircleLayer id="athlete-dots" slot="top" style={{ circleRadius: ["case", ["get", "selected"], 5, 3], circleColor: ["case", ["get", "you"], "#f7c948", "#20b9c6"], circleStrokeColor: "#ffffff", circleStrokeWidth: 1 }} />
      </ShapeSource>
      {!reduced && replay ? replay.passEffects.filter(pass => !hiddenIds.includes(pass.id)).map(pass => {
        const lane = scene.callouts.find(lane => lane.id === pass.id);
        return lane ? <MarkerView key={`pass-${pass.id}`} coordinate={lane.coordinate} anchor={{x:.5,y:.5}} allowOverlap allowOverlapWithPuck><View pointerEvents="none" style={{width:100,height:100,alignItems:"center",justifyContent:"center"}}><View style={{width:32+64*(1-pass.strength),height:32+64*(1-pass.strength),borderRadius:60,borderWidth:4,borderColor:appearanceColors.actionPrimary,backgroundColor:"#f7c94833",opacity:pass.strength}}/></View></MarkerView> : null;
      }) : null}
      {!overlaysHidden ? scene.callouts.filter(lane => !hiddenIds.includes(lane.id) && !dismissed.includes(lane.id)).map(lane => <MarkerView key={lane.id} coordinate={lane.coordinate} anchor={{ x: lane.callout.left ? 1 : 0, y: lane.callout.originY / lane.callout.height }} allowOverlap allowOverlapWithPuck allowZElevate={false}>
        <View collapsable={false} pointerEvents="box-none" style={{ width: 170, height: lane.callout.height }}>
          <Svg width={170} height={lane.callout.height} viewBox={`0 0 170 ${lane.callout.height}`} pointerEvents="none"><G transform={`translate(${lane.callout.originX} ${lane.callout.originY})`}>
            <AthletePennant lane={lane} x={lane.callout.left ? -158 : 12} y={lane.callout.y} detail={courseAthleteDetail(lanes, lane, unit)} prefix={`${prefix}-${lane.id}`} />
          </G></Svg>
          <Pressable accessibilityRole="button" accessibilityLabel={`Focus ${lane.name}, ${courseAthleteDetail(lanes, lane, unit)}`} onTouchStart={event => event.stopPropagation()} onPress={() => onSelect(lane.id)} style={{ position: "absolute", left: 12, top: lane.callout.cardTop, width: 146, height: 46 }} />
          {!onSnapshot && lane.id === selectedId && <Pressable accessibilityRole="button" accessibilityLabel={`Hide ${lane.name} card`} onTouchStart={event => event.stopPropagation()} onPress={() => setDismissed(ids => [...ids, lane.id])} hitSlop={8} style={{ position: "absolute", right: 4, top: lane.callout.cardTop - 8, width: 28, height: 28, borderRadius: 14, backgroundColor: appearanceColors.card, alignItems: "center", justifyContent: "center" }}><AppText role="label">−</AppText></Pressable>}
        </View>
      </MarkerView>) : null}
    </MapView>
    {!onSnapshot ? <MapAttribution top={insets.top + 9} /> : null}
    {error ? <Text accessibilityRole="alert" style={{ ...textStyle("body"), position: "absolute", left: 8, right: 8, bottom: controlsBottom + 136, padding: 12, borderRadius: 12, backgroundColor: appearanceColors.surfaceCard }}>{error}</Text> : null}
    {!onOptionsChange && optionsTop != null ? <FieldOverlayView hidden={overlaysHidden} onTouchStart={event => event.stopPropagation()} style={{ position: "absolute", top: optionsTop, right: 12 }}>
      <CourseOptions
        onReplay={onReplay} onChoose2D={onChoose2D}
        flat={flat}
        spaced={spaced}
        onToggleDimension={() => { controller.dimension(flat ? "3d" : "2d", !(followAthlete && controller.following && scene.selected)); setFlat(!flat); onFlatChange?.(!flat); if (followAthlete && controller.following) focus(); }}
        onToggleSpacing={() => setSpaced(value => !value)}
        onOverview={() => { onFollowChange?.(false); controller.overview({ coordinates: scene.overviewCoordinates }); setFlat(true); onFlatChange?.(true); }}
      />
    </FieldOverlayView> : null}
  </View>;
}
