import { useCompetitionSheetHeight } from "./competition-sheet-height";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MapAttribution } from "./map-attribution";
import { useThemeColors } from "../theme";
import { useAuth } from "../lib/auth";
import Svg, { G } from "react-native-svg";
import { AthleteNode, athleteNodeDiameter } from "./athlete-node";
import { AthletePennant } from "./athlete-pennant";
import { useEffect, useId, useMemo, useRef, useState, type ComponentRef, type ReactNode } from "react";
import { View, Text, Pressable, useWindowDimensions } from "react-native";
import Mapbox, { MapView, Camera, ShapeSource, LineLayer, CircleLayer, MarkerView, CameraGestureObserver } from "@rnmapbox/maps";
import { courseReplayPose, type CourseReplayFrame, courseAthleteDetail, courseAthleteSubdetail, createCourseCamera, raceCourseRacerPosition, raceCourseStartCoordinate, raceEffortMetres, raceCourseScene, courseInitialZoom, RACE_OVERLAY_WIDTH_PIXELS, RACE_SEPARATE_WIDTH_PIXELS, RACE_SELECTED_RADIUS_PIXELS, RACE_ATHLETE_RADIUS_PIXELS, type CourseDistanceTarget, type RaceCourse, type ArenaSceneLane, type CourseCameraPose } from "@fitness-battle/shared";
import { mobileEnv } from "../lib/env";
import { CourseOptions } from "./course-options";
import { FieldFollowChip } from "./field-follow-chip";
import { FieldArenaChromeStack } from "./field-arena-chrome-stack";
import type { FieldMapChromeSlot } from "@fitness-battle/shared";
import { FieldOverlayView } from "./field-overlay-motion";
import { AppText, textStyle } from "./section";
import { useReducedMotion } from "./use-reduced-motion";
import { useSceneActive } from "./use-scene-active";

const START_NODE_RADIUS = 14;
const START_FIELD_METRES = 20;
// Mapbox uses a 512-point Mercator world at zoom zero.
const MERCATOR_METRES_PER_POINT = 78271.516964;
const startMetresPerPoint = START_FIELD_METRES / (
  athleteNodeDiameter(START_NODE_RADIUS, false, true)
  + 7 * athleteNodeDiameter(START_NODE_RADIUS, true, false)
);

const rememberedProgress = new Map<string, number>();
const rememberedCameras = new Map<string, CourseCameraPose>();
/** Entering an event starts from the same default camera its preview snapshot shows. */
export function forgetCourseCameras() { rememberedCameras.clear(); rememberedProgress.clear(); }
const isValidPose = (p?: CourseCameraPose | null): p is CourseCameraPose =>
  Boolean(p && p.center && Array.isArray(p.center) && (Math.abs(p.center[0]) >= 1e-6 || Math.abs(p.center[1]) >= 1e-6) && !Number.isNaN(p.center[0]) && !Number.isNaN(p.center[1]) && typeof p.zoom === "number" && p.zoom > 1);

Mapbox.setAccessToken(mobileEnv.mapboxAccessToken);
export default function CourseMap({ presentationActive = true, cardSessionKey, initialFlat = false, onFlatChange, onFollowChange, followAthlete = true, mapFollowing, onFollowChipPress, followAthleteName, onReady, onSnapshot, replay, course, lanes, hiddenIds = [], unit, selectedId, focusRequest, onSelect, controlsBottom = 8, optionsTop = 12, onReplay, onChoose2D, onOptionsChange, onMapChromeChange, overlaysHidden = false, distanceTarget }: {
  presentationActive?: boolean;
  cardSessionKey?: string | number | boolean;
  initialFlat?: boolean; onFlatChange?: (flat: boolean) => void; followAthlete?: boolean; onFollowChange?: (following: boolean) => void;
  mapFollowing?: boolean; onFollowChipPress?: () => void; followAthleteName?: string;
  onReady?: () => void; onSnapshot?: (uri: string) => void; replay?: CourseReplayFrame; distanceTarget?: CourseDistanceTarget | null;
  hiddenIds?: readonly string[]; course: RaceCourse; lanes: ArenaSceneLane[]; unit: string; selectedId: string; focusRequest: number; onSelect(id: string): void; controlsBottom?: number; optionsTop?: number | null; onReplay?: () => void; onChoose2D?: () => void;   onOptionsChange?: (options: ReactNode | null) => void;
  onMapChromeChange?: (slots: Partial<Record<FieldMapChromeSlot, ReactNode>> | null) => void;
  overlaysHidden?: boolean;
}) {
const appearanceColors = useThemeColors();
  const insets = useSafeAreaInsets();
  const { minimum: sheetMinimum } = useCompetitionSheetHeight();
  const dimensions = useWindowDimensions();
  const sceneActive = useSceneActive();
  const active = sceneActive && presentationActive;
  const initialized = useRef(false);
  const snapshotTaken = useRef(false);
  const snapshotPending = useRef(false);
  const mapRef = useRef<ComponentRef<typeof MapView>>(null);
  const reported = useRef(false);
  const { user } = useAuth();
  const queuedStart = lanes.some(lane => lane.mystery) && lanes.every(lane => lane.ghost || lane.value === 0);
  const cameraKey = `${user?.id ?? "guest"}:${course.name}:${course.length}:${course.coordinates[0].join(",")}:${unit}:${queuedStart}`;
  const cachedPose = replay || onSnapshot ? undefined : rememberedCameras.get(cameraKey);
  const restored = useRef(isValidPose(cachedPose) ? cachedPose : undefined);
  const [dismissed, setDismissed] = useState<string[]>([]);
  useEffect(() => { setDismissed([]); }, [course, cardSessionKey]);
  useEffect(() => { setDismissed(ids => ids.filter(id => id !== selectedId)); }, [selectedId, focusRequest]);
  const prefix = useId();
  const ref = useRef<ComponentRef<typeof Camera>>(null);
  const reduced = useReducedMotion();
  const [sharedLane, setSharedLane] = useState(true);
  const earnedDistance = Math.max(0, ...lanes.filter(lane => !lane.ghost).map(lane => lane.value));
  const clampedTarget = distanceTarget ? Math.max(0, Math.min(distanceTarget.value, earnedDistance)) : undefined;
  const scene = useMemo(() => raceCourseScene(course, lanes, unit, selectedId, sharedLane), [course, lanes, unit, selectedId, sharedLane]);
  const visibleTrails = useMemo(() => hiddenIds.length ? { ...scene.trails, features: scene.trails.features.filter(feature => !hiddenIds.includes(String(feature.id))) } : scene.trails, [scene.trails, hiddenIds]);
  const visibleMarkers = useMemo(() => {
    const features = scene.markers.features.filter((feature) => {
      if (hiddenIds.includes(String(feature.id))) return false;
      if (!sharedLane && feature.properties?.mystery) return false;
      return true;
    });
    return features.length === scene.markers.features.length && !hiddenIds.length ? scene.markers : { ...scene.markers, features };
  }, [scene.markers, hiddenIds, sharedLane]);
  const fallbackCenter = queuedStart ? course.coordinates[0] : scene.selected?.coordinate ?? course.coordinates[0];
  const selectedOffset = queuedStart ? 0 : scene.selected?.lateralMetres;
  const startLine = queuedStart && !overlaysHidden
    ? scene.callouts.filter(lane => !hiddenIds.includes(lane.id)).sort((a, b) => a.id.localeCompare(b.id))
    : [];
  const viewer = startLine.findIndex(lane => lane.you);
  if (viewer >= 0) {
    const [lane] = startLine.splice(viewer, 1);
    startLine.splice(Math.floor(startLine.length / 2), 0, lane);
  }
  const startMarkers = startLine.map(lane => {
    const selected = !lane.mystery && lane.id === selectedId;
    return { lane, selected, width: athleteNodeDiameter(START_NODE_RADIUS, lane.mystery, selected) };
  });
  const startHeight = Math.max(0, ...startMarkers.map(marker => marker.width)) + 2;
  const initialPitch = initialFlat ? 0 : 60;
  const startZoom = Math.log2(MERCATOR_METRES_PER_POINT * Math.cos(course.coordinates[0][1] * Math.PI / 180) / startMetresPerPoint);
  const startPose = queuedStart ? raceCourseRacerPosition(course, 0) : null;
  const pose = useRef<CourseCameraPose>(restored.current ?? {
    center: fallbackCenter,
    zoom: queuedStart ? Math.min(20, startZoom) : courseInitialZoom(fallbackCenter[1], dimensions.height, initialPitch),
    pitch: initialPitch,
    bearing: initialFlat ? 0 : startPose?.heading ?? 0,
  });
  const queuedCameraDefaults = useRef({
    centerCoordinate: pose.current.center,
    zoomLevel: pose.current.zoom,
    pitch: pose.current.pitch,
    heading: pose.current.bearing,
  });
  const [queuedZoom, setQueuedZoom] = useState(() => pose.current.zoom);
  const zoomFromFullSize = queuedZoom - startZoom;
  // Keep the full-size portraits shoulder to shoulder when zooming in further.
  // Below that zoom the lineup keeps its 20 m footprint while the portraits shrink.
  const startSpacing = startMetresPerPoint * 2 ** -Math.max(0, zoomFromFullSize);
  const startScale = Math.max(0.12, Math.min(1, 2 ** (0.75 * zoomFromFullSize)));
  let startX = -startMarkers.reduce((total, marker) => total + marker.width, 0) / 2;
  const [ready, setReady] = useState(false), [error, setError] = useState(""), [flat, setFlat] = useState(restored.current ? restored.current.pitch === 0 : initialFlat);
  const flatRef = useRef(flat);
  flatRef.current = flat;
  const overviewHold = useRef(false);
  const replayZoom = useRef<number | null>(null);
  /** True while the user is touching the map — filters programmatic isUserInteraction. */
  const mapUserGesture = useRef(false);
  const mapUserGestureTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const beginMapUserGesture = () => {
    if (mapUserGestureTimer.current) clearTimeout(mapUserGestureTimer.current);
    mapUserGesture.current = true;
  };
  const endMapUserGesture = () => {
    if (mapUserGestureTimer.current) clearTimeout(mapUserGestureTimer.current);
    mapUserGestureTimer.current = setTimeout(() => {
      mapUserGesture.current = false;
      mapUserGestureTimer.current = null;
    }, 200);
  };
  useEffect(() => {
    overviewHold.current = false;
    replayZoom.current = null;
    if (replayActive) setFlat(initialFlat);
  }, [course, cardSessionKey]);
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
  const focus = () => { if (scene.selected) { controller.focus(course, scene.selected.metres, false, selectedOffset); } };
  const lastFocus = useRef<{ course: RaceCourse; id: string; request: number; following: boolean; session?: string | number | boolean; metres?: number } | null>(null);
  useEffect(() => {
    if ((!active && initialized.current) || !ready || !scene.selected || replay) return;
    if (restored.current) {
      const savedMetres = rememberedProgress.get(cameraKey);
      const anchorMetres = followAthlete ? scene.selected.metres : (savedMetres ?? scene.selected.metres);
      controller.anchor(course, anchorMetres, selectedOffset);
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
    controller.focus(course, scene.selected.metres, !explicit, selectedOffset);
    initialized.current = true;
  }, [active, ready, controller, course, selectedId, focusRequest, cardSessionKey, followAthlete, scene.selected?.metres, selectedOffset, replay]);
  const replayTarget = useRef<CourseCameraPose | null>(null);
  replayTarget.current = replay && scene.selected
    ? courseReplayPose(course, scene.selected, scene.callouts.find(lane => lane.id === replay.nearestId), reduced ? 0 : replay.focus, replay.zoomBoost)
    : null;
  const replayActive = Boolean(replay);
  useEffect(() => {
    if (!active || !ready || !replayActive) return;
    // Keep one camera loop alive across rival changes and the final hold.
    // Native camera observations can lag, so interpolate our last commanded pose.
    let raf = 0, previous = Date.now();
    let current = pose.current;
    const tick = () => {
      if (overviewHold.current || mapUserGesture.current) { current = pose.current; previous = Date.now(); raf = requestAnimationFrame(tick); return; }
      const target = replayTarget.current;
      if (!target) { raf = requestAnimationFrame(tick); return; }
      const now = Date.now();
      const blend = reduced ? 1 : 1 - Math.exp(-Math.min(64, Math.max(1, now - previous)) / 220);
      previous = now;
      const angle = (from: number, to: number) => from + (((to - from) % 360 + 540) % 360 - 180) * blend;
      current = {
        center: [angle(current.center[0], target.center[0]), current.center[1] + (target.center[1] - current.center[1]) * blend],
        zoom: current.zoom + ((replayZoom.current ?? target.zoom) - current.zoom) * blend,
        pitch: flatRef.current ? 0 : target.pitch,
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
    toggleDimension: () => { overviewHold.current = false; controller.dimension(flat ? "3d" : "2d", !(followAthlete && controller.following && scene.selected)); setFlat(!flat); onFlatChange?.(!flat); if (followAthlete && controller.following) focus(); },
    toggleSpacing: () => setSharedLane(value => !value),
    overview: () => { overviewHold.current = Boolean(replay); onFollowChange?.(false); controller.overview({ coordinates: scene.overviewCoordinates }); setFlat(true); onFlatChange?.(true); },
  };
  const followChipPress = useRef(onFollowChipPress);
  followChipPress.current = onFollowChipPress;
  const courseOptionsMenu = (
    <CourseOptions
      flat={flat}
      sharedLane={sharedLane}
      onReplay={onReplay ? () => optionsHandlers.current.onReplay?.() : undefined}
      onChoose2D={onChoose2D ? () => optionsHandlers.current.onChoose2D?.() : undefined}
      onToggleDimension={() => optionsHandlers.current.toggleDimension()}
      onToggleSpacing={() => optionsHandlers.current.toggleSpacing()}
      onOverview={() => optionsHandlers.current.overview()}
    />
  );
  const mapChromeSlots: Partial<Record<FieldMapChromeSlot, ReactNode>> = {
    options: courseOptionsMenu,
    ...(onFollowChipPress != null
      ? {
          follow: (
            <FieldFollowChip
              following={mapFollowing ?? false}
              athleteName={followAthleteName ?? "athlete"}
              onPress={() => followChipPress.current?.()}
            />
          ),
        }
      : {}),
  };
  const publishedOptions = <FieldArenaChromeStack slots={mapChromeSlots} />;
  useEffect(() => {
    if (onMapChromeChange) {
      onMapChromeChange(mapChromeSlots);
      return () => onMapChromeChange(null);
    }
    if (!onOptionsChange) return;
    onOptionsChange(publishedOptions);
    return () => onOptionsChange(null);
  }, [onMapChromeChange, onOptionsChange, flat, sharedLane, mapFollowing, followAthleteName, Boolean(onReplay), Boolean(onChoose2D), onFollowChipPress != null]);
  return <View style={{ flex: 1, minHeight: 0 }} onLayout={({ nativeEvent }) => {
    if (queuedStart || initialized.current || restored.current || replay || mapUserGesture.current) return;
    pose.current.zoom = courseInitialZoom(pose.current.center[1], nativeEvent.layout.height, pose.current.pitch);
    if (ready) ref.current?.setCamera({ centerCoordinate: pose.current.center, zoomLevel: pose.current.zoom, pitch: pose.current.pitch, heading: pose.current.bearing, animationDuration: 0 });
  }}>
    <MapView ref={mapRef} accessibilityLabel="Geographic race course. Drag to explore; pinch to zoom." zoomEnabled scrollEnabled={!replay} rotateEnabled={!replay} pitchEnabled={!replay} style={{ flex: 1 }} styleURL="mapbox://styles/mapbox/standard" logoEnabled={!onSnapshot} attributionEnabled={false}
      onTouchStart={beginMapUserGesture}
      onTouchEnd={endMapUserGesture}
      onTouchCancel={endMapUserGesture}
      logoPosition={{ top: 8, right: 34 }} attributionPosition={{ top: 8, right: 8 }}
      scaleBarEnabled={!onSnapshot}
      scaleBarPosition={{ bottom: Math.max(insets.bottom, sheetMinimum) + 8, left: 8 }}
      onDidFinishLoadingMap={() => {
        setReady(true);
        setError("");
        const p = pose.current;
        if (isValidPose(p)) {
          ref.current?.setCamera({ centerCoordinate: p.center, zoomLevel: p.zoom, pitch: p.pitch, heading: p.bearing, animationDuration: 0 });
        }
      }}
      onMapLoadingError={event => setError(ready && event?.type !== "style" ? "Some map scenery could not load. Check your connection." : "The map could not load. Check your connection and Mapbox access.")}
      onMapIdle={() => { if (ready && onSnapshot && mapRef.current && !snapshotTaken.current && !snapshotPending.current) { snapshotPending.current = true; void mapRef.current.takeSnap(true).then(uri => { if (uri) { snapshotTaken.current = true; onSnapshot(uri); } }).catch(() => {}).finally(() => { snapshotPending.current = false; }); } if (ready && (initialized.current || replay) && !reported.current) { reported.current = true; onReady?.(); } }}
    >
      <Camera minZoomLevel={0} maxZoomLevel={20} ref={ref} defaultSettings={queuedStart ? queuedCameraDefaults.current : { centerCoordinate: pose.current.center, zoomLevel: pose.current.zoom, pitch: pose.current.pitch, heading: pose.current.bearing }} />
      <CameraGestureObserver onCameraChanged={({ nativeEvent }) => {
        const p = nativeEvent.properties;
        if (!p || !p.center || !Array.isArray(p.center)) return;
        if ((Math.abs(p.center[0]) < 1e-6 && Math.abs(p.center[1]) < 1e-6) || Number.isNaN(p.center[0]) || Number.isNaN(p.center[1])) return;
        if (!Number.isFinite(p.zoom) || p.zoom < 0) return;
        pose.current = { center: [p.center[0], p.center[1]], zoom: p.zoom, pitch: p.pitch, bearing: p.heading };
        if (queuedStart) setQueuedZoom(p.zoom);
        if (!replay && !onSnapshot) { rememberedCameras.set(cameraKey, pose.current); if (controller.courseMetres !== null) rememberedProgress.set(cameraKey, controller.courseMetres); else rememberedProgress.delete(cameraKey); }
        if (replay && p.isUserInteraction && mapUserGesture.current) replayZoom.current = p.zoom;
        if (!replay && p.isUserInteraction && controller.following && mapUserGesture.current) {
          if (mapUserGestureTimer.current) clearTimeout(mapUserGestureTimer.current);
          mapUserGesture.current = false;
          mapUserGestureTimer.current = null;
          controller.interrupt();
          onFollowChange?.(false);
        }
      }} />
      <ShapeSource id="completed" shape={visibleTrails}><LineLayer id="completed-line" slot="middle" style={{ lineColor: ["get", "color"], lineSortKey: ["get", "priority"], lineWidth: sharedLane ? RACE_OVERLAY_WIDTH_PIXELS : RACE_SEPARATE_WIDTH_PIXELS, lineCap: "round", lineJoin: "round" }} /></ShapeSource>
      {!sharedLane && !queuedStart ? <ShapeSource id="athletes" shape={visibleMarkers} onPress={event => { const id = event.features[0]?.properties?.id; if (typeof id === "string") onSelect(id); }}>
        <CircleLayer id="athlete-dots" slot="top" style={{ circleSortKey: ["case", ["get", "selected"], 2, ["get", "you"], 1, 0], circleRadius: ["case", ["get", "selected"], RACE_SELECTED_RADIUS_PIXELS, RACE_ATHLETE_RADIUS_PIXELS], circleColor: ["get", "color"], circleStrokeColor: "#ffffff", circleStrokeWidth: 1 }} />
      </ShapeSource> : null}
      {!reduced && replay ? replay.passEffects.filter(pass => !hiddenIds.includes(pass.id)).map(pass => {
        const lane = scene.callouts.find(lane => lane.id === pass.id);
        return lane ? <MarkerView key={`pass-${pass.id}`} coordinate={lane.coordinate} anchor={{x:.5,y:.5}} allowOverlap allowOverlapWithPuck><View pointerEvents="none" style={{width:100,height:100,alignItems:"center",justifyContent:"center"}}><View style={{width:32+64*(1-pass.strength),height:32+64*(1-pass.strength),borderRadius:60,borderWidth:4,borderColor:appearanceColors.actionPrimary,backgroundColor:"#f7c94833",opacity:pass.strength}}/></View></MarkerView> : null;
      }) : null}
      {startMarkers.map(({ lane, selected, width }) => {
        const offset = (startX + width / 2) * startSpacing;
        startX += width;
        const coordinate = raceCourseStartCoordinate(course, offset);
        return <MarkerView key={lane.id} coordinate={coordinate} anchor={{ x: 0.5, y: 0.5 }} allowOverlap allowOverlapWithPuck allowZElevate={false}>
          <View collapsable={false} style={{ width, height: startHeight }}>
            <Pressable accessibilityRole="button" accessibilityLabel={`Focus ${lane.name}`} onTouchStart={event => event.stopPropagation()} onPress={() => onSelect(lane.id)} style={{ width, height: startHeight, transform: [{ scale: startScale }] }}>
              <Svg width={width} height={startHeight} pointerEvents="none">
                <G transform={`translate(${width / 2} ${startHeight / 2})`}>
                  <AthleteNode lane={lane} x={0} y={0} detail="" nodeRadius={START_NODE_RADIUS} selected={selected} prefix={`${prefix}-${lane.id}`} />
                </G>
              </Svg>
            </Pressable>
          </View>
        </MarkerView>;
      })}
      {!queuedStart ? scene.callouts.filter(lane => !hiddenIds.includes(lane.id) && !dismissed.includes(lane.id)
        && (!overlaysHidden || (replay && (lane.id === selectedId || lane.id === replay.nearestId)))).map(lane => {
        const detail = courseAthleteDetail(lanes, lane, unit);
        if (!sharedLane && !lane.mystery) {
          return <MarkerView key={lane.id} coordinate={lane.coordinate} anchor={{ x: lane.callout.left ? 1 : 0, y: lane.callout.originY / lane.callout.height }} allowOverlap allowOverlapWithPuck allowZElevate={false}>
            <View collapsable={false} pointerEvents="box-none" style={{ width: 170, height: lane.callout.height }}>
              <Svg width={170} height={lane.callout.height} viewBox={`0 0 170 ${lane.callout.height}`} pointerEvents="none"><G transform={`translate(${lane.callout.originX} ${lane.callout.originY})`}>
                <AthletePennant lane={lane} x={lane.callout.left ? -158 : 12} y={lane.callout.y} detail={detail} prefix={`${prefix}-${lane.id}`} />
              </G></Svg>
              <Pressable accessibilityRole="button" accessibilityLabel={`Focus ${lane.name}, ${detail}`} onTouchStart={event => event.stopPropagation()} onPress={() => onSelect(lane.id)} style={{ position: "absolute", left: 12, top: lane.callout.cardTop, width: 146, height: 46 }} />
              {!onSnapshot && lane.id === selectedId ? <Pressable accessibilityRole="button" accessibilityLabel={`Hide ${lane.name} card`} onTouchStart={event => event.stopPropagation()} onPress={() => setDismissed(ids => [...ids, lane.id])} hitSlop={8} style={{ position: "absolute", right: 4, top: lane.callout.cardTop - 8, width: 28, height: 28, borderRadius: 14, backgroundColor: appearanceColors.card, alignItems: "center", justifyContent: "center" }}><AppText role="label">−</AppText></Pressable> : null}
            </View>
          </MarkerView>;
        }
        const rank = 1 + lanes.filter(peer => !peer.ghost && peer.value > lane.value).length;
        const subdetail = courseAthleteSubdetail(lanes, lane, unit);
        const selected = lane.id === selectedId;
        const expanded = selected || lane.id === replay?.nearestId;
        const pad = 30, boxWidth = 170 + pad * 2, boxHeight = lane.callout.height + pad * 2;
        const nodeX = lane.callout.originX + pad, nodeY = lane.callout.originY + pad;
        const cardX = nodeX + (lane.callout.left ? -140 : 12), cardY = lane.callout.cardTop + pad;
        return <MarkerView key={lane.id} coordinate={lane.coordinate} anchor={{ x: nodeX / boxWidth, y: nodeY / boxHeight }} allowOverlap allowOverlapWithPuck allowZElevate={false}>
          <View collapsable={false} pointerEvents="box-none" style={{ width: boxWidth, height: boxHeight }}>
            <Svg width={boxWidth} height={boxHeight} pointerEvents="none"><G transform={`translate(${nodeX} ${nodeY})`}>
              <AthleteNode lane={lane} x={lane.callout.left ? -140 : 12} y={lane.callout.y} detail={detail} subdetail={subdetail} expanded={expanded} selected={selected} gold={rank === 1} prefix={`${prefix}-${lane.id}`} />
            </G></Svg>
            {expanded ? <Pressable accessibilityRole="button" accessibilityLabel={`Focus ${lane.name}, ${detail}`} onTouchStart={event => event.stopPropagation()} onPress={() => onSelect(lane.id)} style={{ position: "absolute", left: cardX, top: cardY, width: 128, height: subdetail ? 44 : 30 }} /> : null}
            <Pressable accessibilityRole="button" accessibilityLabel={`Focus ${lane.name}, ${detail}`} onTouchStart={event => event.stopPropagation()} onPress={() => onSelect(lane.id)} style={{ position: "absolute", left: nodeX - 26, top: nodeY - 26, width: 52, height: 52, borderRadius: 26 }} />
            {!onSnapshot && !replay && selected ? <Pressable accessibilityRole="button" accessibilityLabel={`Close ${lane.name} card`} onTouchStart={event => event.stopPropagation()} onPress={() => setDismissed(ids => [...ids, lane.id])} hitSlop={10} style={{ position: "absolute", left: cardX + 128 - 22, top: cardY + 4, width: 18, height: 18, alignItems: "center", justifyContent: "center" }}><AppText role="caption" secondary>×</AppText></Pressable> : null}
          </View>
        </MarkerView>;
      }) : null}
    </MapView>
    {!onSnapshot ? <MapAttribution top={insets.top + 9} /> : null}
    {error ? <Text accessibilityRole="alert" style={{ ...textStyle("body"), color: appearanceColors.ink, position: "absolute", left: 8, right: 8, bottom: controlsBottom + 136, padding: 12, borderRadius: 12, backgroundColor: appearanceColors.surfaceCard }}>{error}</Text> : null}
    {!onMapChromeChange && !onOptionsChange && optionsTop != null ? <FieldOverlayView hidden={overlaysHidden} onTouchStart={event => event.stopPropagation()} style={{ position: "absolute", top: optionsTop, right: 12 }}>
      {publishedOptions}
    </FieldOverlayView> : null}
  </View>;
}
