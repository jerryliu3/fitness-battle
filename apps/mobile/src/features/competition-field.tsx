import { MapHudBackdrop, useMapHud } from "../ui/map-hud";
import { useCompetitionTimeline } from "./competition-timeline-context";
import { CoursePositionRail } from "../ui/course-position-rail";
import { MaterialBack } from "../ui/material-back";
import { useFocusStyles } from "../ui/focus";
import { useThemeColors } from "../theme";
import { AthleteProfileSheet, type AthleteProfileSelection } from "./athlete-profile-sheet";
import { QueuedField } from "./queued-field";
import { FieldViewSwitcher } from "../ui/field-view-switcher";
import { FieldArenaChromeStack } from "../ui/field-arena-chrome-stack";
import type { FieldMapChromeSlot } from "@fitness-battle/shared";
import { FieldGroundSwitcher } from "../ui/field-ground-switcher";
import { CompeteTimeSeriesChart } from "../ui/compete-time-series-chart";
import { GeographicCourse } from "./geographic-course";
import { useCompetitionCourse } from "./use-competition-course";
import { useFieldTimeline } from "./use-field-timeline";
import { FieldTimeline } from "./field-timeline";
import { StandingsList } from "./standings-list";
import { AppText, textStyle } from "../ui/section";
import { useFieldFlight } from "../ui/use-field-flight";
import { FieldOverlayView, SlidingFieldPanel } from "../ui/field-overlay-motion";
import { GraphOptions, CourseOptions } from "../ui/course-options";
import {
  coursePositionLeaders,
  competitionQueue,
  createFieldOverlayHold,
  arenaFieldHigh,
  clampCourseCenter,
  competeNow,
  competePeriodWindow,
  competitionCourseWindow,
  defaultCompeteFieldView,
  buildCompeteTimeSeriesModel,
  fieldDefaultSpan,
  competitionCourseReplayFrame,
  athleteLatestReplayContribution,
  buildArenaModel,
  initialsFromName,
  isGeographicCompete,
  normalizeCompeteFieldView,
  arenaValueDecimals,
  formatArenaVolume,
  ordinalPlace,
  shellTabFromPath,
  weeklyBoard,
  type CompeteArenaEvent,
  type CompeteTimeSeriesView,
  type CourseDistanceTarget,
  type FieldViewDimension,
  type ArenaSceneLane,
  type ScoreTrack,
  type SportId,
} from "@fitness-battle/shared";
import { usePathname } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AppState, Modal, Pressable, ScrollView, Text, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { IconButton } from "../ui/icon-button";
import { useAthleteBlocks } from "../lib/athlete-blocks";
import { useCompeteStore } from "../lib/compete-store";
import { playCue } from "../lib/haptics";


import { LaneTrack, type LaneAnchor } from "../ui/lane-track";
import { FieldOverview, useFieldAppearance } from "../ui/field-course";
import { useReducedMotion } from "../ui/use-reduced-motion";

const rememberedFieldViews = new Map<string, FieldViewDimension>();
export function forgetFieldViews() { rememberedFieldViews.clear(); }

export function CompetitionField({
  sport,
  track,
  persistent = false,
  backgroundMode = false,
  standingsOnly = false,
  onExit,
  onDetails,
  presentationActive,
  periodOverride,
  focusedOverride,
  externalAthleteFocus,
  onFocusAthlete,
  externalCourseTarget,
  onOptionsChange,
  competeEvent,
  chartView,
  onChartViewChange,
  timelineFraction,
  onTimelineChange,
}: {
  sport: SportId;
  track: ScoreTrack;
  competeEvent?: CompeteArenaEvent;
  persistent?: boolean;
  backgroundMode?: boolean;
  standingsOnly?: boolean;
  onExit?: () => void;
  onDetails?: () => void;
  presentationActive?: boolean;
  periodOverride?: { startsAt: Date; endsAt: Date };
  focusedOverride?: boolean;
  onOptionsChange?: (options: ReactNode | null) => void;
  externalAthleteFocus?: { id: string; request: number } | null;
  onFocusAthlete?: (id: string) => void;
  externalCourseTarget?: CourseDistanceTarget | null;
  chartView?: CompeteTimeSeriesView;
  onChartViewChange?: (view: CompeteTimeSeriesView) => void;
  timelineFraction?: number | null;
  onTimelineChange?: (value: number | null) => void;
}) {
const hud = useMapHud();

const c=useThemeColors();
const f=useFocusStyles();

  const presentationEvent: CompeteArenaEvent = competeEvent ?? sport;
  const geographic = isGeographicCompete(presentationEvent);
  const chartSleepMode = presentationEvent === "sleep";

  const { state, accountKey, debugActive, dispatch } = useCompeteStore();
  const { blocks } = useAthleteBlocks();
  const hiddenIds = useMemo(() => blocks.map(block => block.id), [blocks]);
  const now = state ? competeNow(state) : new Date();
  const queue = !periodOverride && state ? competitionQueue(state, sport, now) : null;
  const queued = Boolean(queue && (queue.queued || queue.awaitingField));
  const queueOverlay = queued && state && !backgroundMode ? <QueuedField overlay state={state} event={sport} now={now} onCancel={() => dispatch({ type: "opt-out", sport })} /> : null;
  const pathname = usePathname();
  const [appearance, setAppearance] = useFieldAppearance(accountKey, sport);
  const isFocused = focusedOverride ?? ((presentationActive ?? true) && shellTabFromPath(pathname)?.id === "arena");
  const viewSessionKey = `${accountKey}:${presentationEvent}`;
  const [sceneDimension, setSceneDimension] = useState<"2d" | "3d" | "4d" | "graph">(() =>
    normalizeCompeteFieldView(presentationEvent, (persistent ? rememberedFieldViews.get(viewSessionKey) : undefined) ?? defaultCompeteFieldView(presentationEvent)));
  const [courseTarget, setCourseTarget] = useState<CourseDistanceTarget | null>(null);

  useEffect(() => {
    setSceneDimension(normalizeCompeteFieldView(presentationEvent, (persistent ? rememberedFieldViews.get(viewSessionKey) : undefined) ?? defaultCompeteFieldView(presentationEvent)));
  }, [presentationEvent, sport, track, accountKey, viewSessionKey]);

  const chooseView = (value: "2d" | "3d" | "4d" | "graph") => {
    flight.cancel();
    const next = normalizeCompeteFieldView(presentationEvent, value);
    if (persistent) rememberedFieldViews.set(viewSessionKey, next);
    setSceneDimension(next);
  };
  const chooseViewRef = useRef(chooseView); chooseViewRef.current = chooseView;
  const mapChromeRef = useRef<Partial<Record<FieldMapChromeSlot, ReactNode>>>({});
  const publishArenaOptions = useCallback(() => {
    if (!onOptionsChange) return;
    onOptionsChange(
      <FieldArenaChromeStack
        slots={{
          view: <FieldViewSwitcher value={sceneDimension} event={presentationEvent} onChange={value => chooseViewRef.current(value)} />,
          options: sceneDimension === "graph" && onChartViewChange
            ? <GraphOptions eventView={(chartView ?? "event") === "event"} onToggleEventView={() => onChartViewChange((chartView ?? "event") === "event" ? "trajectory" : "event")} />
            : sceneDimension === "4d" ? mapChromeRef.current.options
              : sceneDimension === "2d" && geographic && backgroundMode
                ? <CourseOptions flat sharedLane onChoose3D={() => chooseViewRef.current("4d")} onToggleDimension={() => chooseViewRef.current("4d")} onToggleSpacing={() => {}} onOverview={() => {}} />
                : null,
          ground: sceneDimension === "2d" ? <FieldGroundSwitcher appearance={appearance} onChangeAppearance={setAppearance} /> : null,
          follow: sceneDimension === "4d" ? mapChromeRef.current.follow : null,
        }}
      />,
    );
  }, [onOptionsChange, sceneDimension, presentationEvent, geographic, backgroundMode, chartView, onChartViewChange, appearance, setAppearance]);
  useEffect(() => {
    if (!onOptionsChange) return;
    publishArenaOptions();
    return () => onOptionsChange(null);
  }, [onOptionsChange, publishArenaOptions]);
  const handleMapChromeChange = useCallback(
    (slots: Partial<Record<FieldMapChromeSlot, ReactNode>> | null) => {
      mapChromeRef.current = slots ?? {};
      publishArenaOptions();
    },
    [publishArenaOptions],
  );
  const [courseFlat, setCourseFlat] = useState(false);
  const [expanded, setExpanded] = useState(persistent);
  const [leadersHeight, setLeadersHeight] = useState(0);
  const [spotlightCollapsed, setSpotlightCollapsed] = useState(false);
  const [leadersCollapsed, setLeadersCollapsed] = useState(false);
  const [overlaysHidden, setOverlaysHidden] = useState(false);
  const hold = useRef<ReturnType<typeof createFieldOverlayHold> | null>(null);
  if (!hold.current) hold.current = createFieldOverlayHold(setOverlaysHidden);
  useEffect(() => {
    hold.current?.reset();
    if (!expanded || !isFocused) return;
    const subscription = AppState.addEventListener("change", status => {
      if (status !== "active") hold.current?.reset();
    });
    return () => { subscription.remove(); hold.current?.reset(); };
  }, [expanded, isFocused, sceneDimension]);
  const dimensions = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const safeTop = Math.max(insets.top, 56);
  const safeBottom = Math.max(insets.bottom, 28);
  const inlineHeight = sceneDimension === "2d"
    ? Math.max(300, Math.min(420, dimensions.height * .46))
    : Math.max(360, Math.min(480, dimensions.height * .56));
  const sceneHeight = Math.round(expanded
    ? Math.max(460, dimensions.height)
    : inlineHeight);
  const laneAnchor = useRef<LaneAnchor | null>(null);
  const expandField = () => { if (!expanded) { void playCue("light"); setExpanded(true); } };
  const [center, setCenter] = useState<number | null>(null);
  useEffect(() => { if (externalCourseTarget) { setCourseTarget(externalCourseTarget); setCenter(externalCourseTarget.value); } }, [externalCourseTarget]);
  const [span, setSpan] = useState<number | null>(null);
  const ghost = true;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [profileAthlete, setProfileAthlete] = useState<AthleteProfileSelection | null>(null);
  useEffect(() => { if (selectedId && hiddenIds.includes(selectedId)) setSelectedId(null); }, [hiddenIds, selectedId]);
  const [focusRequest, setFocusRequest] = useState(0);
  const [following, setFollowing] = useState(true);

  const reduceMotion = useReducedMotion();

  const liveArena = useMemo(
    () => (state ? buildArenaModel(state, undefined, track, sport) : null),
    [state, track, sport],
  );
  const period = periodOverride ?? (state ? competePeriodWindow(state, competeNow(state), sport) : null);
  const coursePeriod = periodOverride ?? (state ? competitionCourseWindow(state, competeNow(state), sport) : null);
  const { course, error: courseError, retry: retryCourse } = useCompetitionCourse(sport, coursePeriod?.startsAt.toISOString() ?? "", coursePeriod?.endsAt.toISOString() ?? "", debugActive, !standingsOnly && sceneDimension === "4d" && (persistent || isFocused));
  useEffect(() => setCourseTarget(null), [accountKey, sport, period?.startsAt.getTime(), liveArena?.unit]);
  const sharedTimeline = useCompetitionTimeline();
  const localTimeline = useFieldTimeline(!backgroundMode && !standingsOnly ? state ?? undefined : undefined, {
    sport, track, periodStart: period?.startsAt.toISOString() ?? "", periodEnd: period?.endsAt.toISOString() ?? "",
  }, !backgroundMode && !standingsOnly && !queued && isFocused && Boolean(period));
  const timeline = sharedTimeline ?? localTimeline;
  const metricFrame = useMemo(() => !geographic && !chartSleepMode && state && timelineFraction != null
    ? buildCompeteTimeSeriesModel(state, sport, track, now, { scrubFraction: timelineFraction }) : null,
    [state, sport, track, geographic, chartSleepMode, timelineFraction]);
  const arenaBase = useMemo(() => metricFrame && liveArena ? {
    ...liveArena, lanes: liveArena.lanes.map(lane => {
      const value = metricFrame.athletes.find(athlete => athlete.id === lane.id)?.valueAtCursor ?? lane.values[2];
      return { ...lane, values: [value, value, value] as [number, number, number] };
    }),
  } : !timeline.frame || !liveArena ? liveArena : {
    ...liveArena,
    lanes: timeline.frame.rows.map(row => ({
      ...row,
      initials: initialsFromName(row.name),
      ghost: false,
      mystery: false,
      values: [row.value, row.value, row.value] as [number, number, number],
    })),
  }, [liveArena, timeline.frame, metricFrame]);
  const arena = useMemo(() => {
    const replayIndex = timeline.index;
    if (!arenaBase || !replayIndex || !state) return arenaBase;
    const cursor = timeline.frame?.position ?? timeline.count;
    return {
      ...arenaBase,
      lanes: arenaBase.lanes.map((lane) => {
        const touch = athleteLatestReplayContribution(
          replayIndex,
          lane.id,
          cursor,
          state.units,
        );
        return touch
          ? { ...lane, lastUpdated: touch.at, lastActivityVolume: touch.volume }
          : lane;
      }),
    };
  }, [arenaBase, timeline.index, timeline.frame, timeline.count, state?.units]);
  useEffect(() => { if (externalAthleteFocus && !hiddenIds.includes(externalAthleteFocus.id)) { setSelectedId(externalAthleteFocus.id); const lane = arena?.lanes.find(item => item.id === externalAthleteFocus.id); if (lane) setCenter(lane.values[2]); setCourseTarget(null); setFollowing(true); setFocusRequest(value => value + 1); } }, [externalAthleteFocus, hiddenIds]);
  const defaultSpan = fieldDefaultSpan(arena?.unit ?? "km");
  const viewSpan = span ?? defaultSpan;
  useEffect(() => { if (!isFocused && !persistent) setExpanded(false); }, [isFocused, persistent]);
  const me = arena?.lanes.find((l) => l.you);
  const total = me?.values[2] ?? 0;

  const fieldLanes = useMemo<ArenaSceneLane[]>(
    () =>
      (arena?.lanes ?? [])
        .filter((l) => !l.ghost)
        .map((l) => ({
          id: l.id,
          name: l.name,
          avatarUrl: l.avatarUrl,
          initials: l.mystery ? "?" : initialsFromName(l.name),
          mystery: l.mystery,
          value: l.values[2],
          you: l.you,
          ghost: false,
          lastUpdated: "lastUpdated" in l ? l.lastUpdated : undefined,
          lastActivityVolume: "lastActivityVolume" in l ? l.lastActivityVolume : undefined,
        })),
    [arena?.lanes],
  );

  const courseReplay = useMemo(() => {
    if (!timeline.index || !timeline.frame) return undefined;
    const focusId = (expanded ? selectedId : null) ?? me?.id;
    if (!focusId) return undefined;
    return competitionCourseReplayFrame(timeline.index, timeline.frame.position, focusId, hiddenIds);
  }, [timeline.index, timeline.frame, expanded, selectedId, me?.id, hiddenIds]);
  const chaseReplay = following ? courseReplay : undefined;

  const view = {
    center: timeline.frame ? center ?? total : clampCourseCenter(center ?? total, viewSpan, arenaFieldHigh(fieldLanes), arena?.unit ?? "km", appearance.ground),
    span: viewSpan,
  };
  const flight = useFieldFlight(view, next => { setCenter(next.center); setSpan(next.span); }, reduceMotion);
  const applyView = (next: typeof view) => { flight.cancel(); setCenter(next.center); setSpan(next.span); };
  const panTo = (value: number) => applyView({ ...view, center: value });
  const directZoom = (value: number) => applyView({ ...view, span: value });
  const zoomTo = (value: number) => flight.fly({ ...view, span: value });
  if (!state || !arena || !period) return null;
  const displayTotal = total;
  const selectAthlete = (id: string) => {
    const lane = arena.lanes.find((item) => item.id === id);
    if (!lane || lane.mystery || hiddenIds.includes(id)) return;
    void playCue("selection");
    setCourseTarget(null);
    setSelectedId(id);
    setFollowing(true);
    setFocusRequest(value => value + 1);
    if (sceneDimension !== "4d" && sceneDimension !== "graph") flight.fly({ ...view, center: clampCourseCenter(lane.values[2], view.span, arenaFieldHigh(fieldLanes), arena.unit, appearance.ground) });
  };

  const ranked = arena.lanes
    .filter((lane) => !lane.ghost)
    .sort((a, b) => b.values[2] - a.values[2]);
  const place = (value: number) =>
    1 + ranked.filter((lane) => lane.values[2] > value).length;
  const scores = weeklyBoard(state, sport, track);
  const volumeDecimals = arenaValueDecimals(arena.unit);
  const openProfile = (lane: (typeof ranked)[number]) => {
    const row = scores.find((entry) => entry.id === lane.id);
    setProfileAthlete({
      id: lane.id, name: lane.name, avatarUrl: lane.avatarUrl, you: lane.you,
      score: row?.elo,
      contextLabel: "This week",
      contextValue: row
        ? formatArenaVolume(sport, row, state.units)
        : `${lane.values[2].toFixed(volumeDecimals)} ${arena.unit}`,
      contextDetail: `Place ${place(lane.values[2])} · ${sport}`,
    });
  };
  const leader = ranked[0];
  const leadersTied = leader ? ranked.filter(lane => lane.values[2] === leader.values[2]).length > 1 : false;
  const leaderValue = Math.max(leader?.values[2] ?? 0, 0.0001);
  const myRankIndex = ranked.findIndex((lane) => lane.you);
  const focusedLane =
    ranked.find((lane) => !hiddenIds.includes(lane.id) && lane.id === (selectedId ?? me?.id)) ??
    me ??
    ranked[0];
  const focusedRank = focusedLane ? place(focusedLane.values[2]) : 1;

  const focusedDeltaToYou = focusedLane ? focusedLane.values[2] - total : 0;
  const focusedDeltaToLeader =
    focusedLane && leader ? focusedLane.values[2] - leader.values[2] : 0;

  const fieldContent = (
    <View
      onTouchStart={event => {
        if (!expanded) return;
        const { pageX, pageY, touches } = event.nativeEvent;
        hold.current?.start(pageX, pageY, touches.length);
      }}
      onTouchMove={event => {
        const { pageX, pageY, touches } = event.nativeEvent;
        hold.current?.move(pageX, pageY, touches.length);
      }}
      onTouchEnd={() => hold.current?.end()}
      onTouchCancel={() => hold.current?.end()}
    >
      {sceneDimension === "graph" ? (
        <CompeteTimeSeriesChart
          state={state}
          sport={chartSleepMode ? undefined : sport}
          mode={chartSleepMode ? "sleep" : "sport"}
          track={track}
          selectedId={selectedId}
          onSelectAthlete={(id) => {
            if (!hold.current?.suppressSelection()) selectAthlete(id);
          }}
          hiddenIds={hiddenIds}
          reserveTopControls={!expanded && !backgroundMode}
          immersive={backgroundMode && expanded}
          topInset={insets.top}
          bottomInset={insets.bottom}
          view={chartView}
          onViewChange={onChartViewChange}
          timelineFraction={timelineFraction}
          onTimelineChange={onTimelineChange}
        />
      ) : null}
      {sceneDimension === "4d" ? <View style={{ height: sceneHeight }}>
        <View pointerEvents={expanded ? "auto" : "none"} style={{ flex: 1 }}>
          <GeographicCourse presentationActive={isFocused} cardSessionKey={expanded} initialFlat={courseFlat} onFlatChange={setCourseFlat} followAthlete={following && !chaseReplay} onFollowChange={setFollowing} mapFollowing={following} followAthleteName={focusedLane?.name ?? me?.name ?? "your athlete"} onFollowChipPress={expanded && !queued ? () => { if (following) setFollowing(false); else { setCourseTarget(null); setFollowing(true); setFocusRequest(value => value + 1); } } : undefined} hiddenIds={hiddenIds} lanes={fieldLanes} unit={arena.unit} selectedId={expanded ? (selectedId ?? "") : ""} focusRequest={expanded ? focusRequest : 0} onSelect={id => { if (!hold.current?.suppressSelection()) selectAthlete(id); }} course={course} error={courseError} onRetry={retryCourse} distanceTarget={chaseReplay ? undefined : courseTarget} replay={chaseReplay} onReplay={timeline.toggle} onChoose2D={backgroundMode ? () => chooseView("2d") : undefined} onMapChromeChange={onOptionsChange ? handleMapChromeChange : undefined} optionsTop={expanded && !queued ? Math.max(insets.top, 0) + 6 : null} controlsBottom={expanded ? safeBottom + (spotlightCollapsed ? 132 : 216) + (backgroundMode ? 0 : 128) : 8} overlaysHidden={overlaysHidden} />
        </View>
        {!expanded ? <Pressable accessibilityRole="button" accessibilityLabel="Open 3D course in full screen" onPress={expandField} style={{ position: "absolute", inset: 0, alignItems: "center", justifyContent: "flex-end", paddingBottom: 10 }}>
          <View pointerEvents="none" style={{ backgroundColor: "rgba(20, 20, 19, 0.75)", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, ...hud.chrome }}><MapHudBackdrop radius={999} /><Text style={{ ...textStyle("caption"), color: hud.ink }}>Tap to open full screen</Text></View>
        </Pressable> : null}
      </View> : null}
      {sceneDimension === "2d" ? (
        <>
          <View style={{ position: "relative" }}>
            <LaneTrack
              clampView={!timeline.frame}
              hiddenIds={hiddenIds}
              appearance={appearance}
              onChangeAppearance={setAppearance}
              height={sceneHeight}
              fullscreen={expanded}
              overlaysHidden={overlaysHidden}
              onExpand={expandField}
              onZoom={directZoom}
              anchor={laneAnchor}
              active={isFocused && sceneDimension === "2d"}
              focusRequest={focusRequest}
              animateSelection={!reduceMotion}
              onGestureStart={flight.cancel}
              onViewChange={applyView}
              selectedId={selectedId ?? undefined}
              lanes={arena.lanes}
              unit={arena.unit}
              showGhost={ghost}
              index={2}
              onSelect={lane => { if (!hold.current?.suppressSelection()) selectAthlete(lane.id); }}
              view={view}
              onPan={panTo}
            />
          </View>
          {!expanded ? (
            <View style={{ marginTop: 8, borderRadius: 12, overflow: "hidden" }}>
              <FieldOverview
                hiddenIds={hiddenIds}
                lanes={fieldLanes}
                view={view}
                unit={arena.unit}
                onNavigate={(value) => {
                  setCenter(value);
                  if (appearance.ground === "oval")
                    setSpan(Math.min(view.span, fieldDefaultSpan(arena.unit) / 2));
                }}
              />
            </View>
          ) : null}
        </>
      ) : null}
    </View>
  );

  const viewControls = <FieldArenaChromeStack slots={{
    view: <FieldViewSwitcher value={sceneDimension} event={presentationEvent} onChange={chooseView} />,
    options: sceneDimension === "2d" && geographic && backgroundMode
      ? <CourseOptions flat sharedLane onChoose3D={() => chooseView("4d")} onToggleDimension={() => chooseView("4d")} onToggleSpacing={() => {}} onOverview={() => {}} />
      : null,
    ground: sceneDimension === "2d" ? <FieldGroundSwitcher appearance={appearance} onChangeAppearance={setAppearance} /> : null,
  }} />;

  return (
    <View style={persistent ? { flex: 1 } : { gap: 14, position: "relative" }}>
      {!expanded && !standingsOnly ? (
        <View
          style={{
            position: "absolute",
            left: 12,
            top: 12,
            zIndex: 10,
          }}
        >
          {viewControls}
        </View>
      ) : null}
      {standingsOnly ? null : expanded ? (
        <FullscreenHost
          persistent={persistent}
          visible
          animationType={reduceMotion ? "none" : "fade"}
          presentationStyle="fullScreen"
          onRequestClose={() => persistent ? onExit?.() : setExpanded(false)}
        >
          <View onTouchStartCapture={() => hold.current?.reset()} style={[f.safe, { flex: sceneDimension === "graph" && backgroundMode ? 1 : undefined, backgroundColor: sceneDimension === "graph" && backgroundMode ? c.paper : "#0b242c", position: "relative" }]}>
            {fieldContent}
            {queueOverlay}
            {/* Top Bar HUD */}
            <FieldOverlayView
              hidden={overlaysHidden}
              pointerEvents="box-none"
              style={[
                f.row,
                {
                  position: "absolute",
                  top: Math.max(insets.top, 0) + 6,
                  left: 12,
                  right: 12,
                  justifyContent: "space-between",
                },
              ]}
            >
              {backgroundMode ? <MaterialBack onPress={() => onExit?.()} /> : (
                <IconButton
                  glass
                  icon="back"
                  label="Close full screen field"
                  onPress={() => persistent ? onExit?.() : setExpanded(false)}
                />
              )}
              {!backgroundMode && onDetails ? <Pressable accessibilityRole="button" accessibilityLabel={backgroundMode ? "Expand standings" : "Events & standings"} onPress={onDetails} style={{ minHeight: 44, justifyContent: "center", paddingHorizontal: 14, borderRadius: 999, backgroundColor: "rgba(20, 20, 19, 0.72)", ...hud.chrome }}><MapHudBackdrop radius={999} /><Text style={{ ...textStyle("caption"), color: hud.ink }}>{backgroundMode ? `${sport.charAt(0).toUpperCase()}${sport.slice(1)}` : "Events & standings"}</Text></Pressable> : null}
              {!onOptionsChange && !(backgroundMode && sceneDimension === "4d") && viewControls}
            </FieldOverlayView>

            {!queued && sceneDimension !== "graph" && (sceneDimension !== "4d" || course) ? <>
            {/* Broadcast HUD: Left Current Positions Tower */}
            <SlidingFieldPanel
              label="live standings"
              collapsible
              onHeightChange={setLeadersHeight}
              collapsed={leadersCollapsed}
              onToggle={() => setLeadersCollapsed(false)}
              overlaysHidden={overlaysHidden}
              style={{
                position: "absolute",
                top: Math.max(insets.top, 0) + 62,
                left: 12,
                maxWidth: 318,
                alignSelf: "flex-start",
              }}
              surfaceStyle={{
                backgroundColor: "rgba(20, 20, 19, 0.72)",
                borderRadius: 14,
                paddingVertical: 8,
                paddingHorizontal: 10,
                borderWidth: 1,
                borderColor: "rgba(255, 255, 255, 0.14)",
                ...hud.chrome,
                gap: 5,
                alignSelf: "flex-start",
              }}
            >
              <MapHudBackdrop radius={14} />
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <Text style={{ ...textStyle("label"), color: (hud.light ? hud.muted : "rgba(255,255,255,0.65)") }}>
                  Live standings
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Collapse live standings"
                  hitSlop={8}
                  onPress={() => setLeadersCollapsed(true)}
                  style={{ width: 28, height: 28, alignItems: "center", justifyContent: "center" }}
                >
                  <AppText role="caption" style={{ color: hud.ink }}>×</AppText>
                </Pressable>
              </View>
              {coursePositionLeaders(ranked).map((peer, idx) => {
                if (hiddenIds.includes(peer.id)) return <View key={peer.id} style={{ height: 24 }} />;
                const delta = peer.values[2] - leaderValue;
                const isSelected = selectedId === peer.id;
                const leads = place(peer.values[2]) === 1;
                return (
                  <View key={peer.id}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Focus ${peer.name}`}
                    onPress={() => {
                      selectAthlete(peer.id);
                    }}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                      paddingVertical: 2,
                      paddingHorizontal: 4,
                      borderRadius: 6,
                      backgroundColor: isSelected
                        ? (hud.light ? "rgba(247, 201, 72, 0.28)" : "rgba(200, 245, 59, 0.2)")
                        : "transparent",
                    }}
                  >
                    <Text
                      style={{
                        ...textStyle("caption"),
                        width: 18,
                        textAlign: "center",
                        borderRadius: 9,
                        overflow: "hidden",
                        backgroundColor: hud.light && leads ? c.tennis : undefined,
                        color: leads ? hud.accent : (hud.light ? hud.muted : "rgba(255,255,255,0.7)"),
                      }}
                    >
                      {place(peer.values[2])}
                    </Text>
                    <Text
                      numberOfLines={1}
                      style={{
                        ...textStyle("caption"),
                        color: leads ? hud.accent : hud.ink,
                        flexShrink: 1,
                      }}
                    >
                      {peer.name.split(" ")[0]}
                    </Text>
                    <Text
                      style={{
                        ...textStyle("caption"),
                        color: leads ? hud.accent : (hud.light ? hud.muted : "rgba(255,255,255,0.8)"),
                        flexShrink: 0,
                      }}
                    >
                      {leads ? "Leader" : `${delta.toFixed(1)}`}
                    </Text>
                  </Pressable>
                  </View>
                );
              })}
            </SlidingFieldPanel>

            {backgroundMode && <FieldOverlayView hidden={overlaysHidden || !leadersHeight} style={{ position: "absolute", left: 12, top: Math.max(insets.top, 0) + 62 + leadersHeight + 12 }}><CoursePositionRail markers={fieldLanes.filter(lane => !hiddenIds.includes(lane.id))} height={Math.max(44, Math.min(140, dimensions.height * .58 - Math.max(insets.top, 0) - 62 - leadersHeight - 68))} value={sceneDimension === "4d" ? courseTarget?.value ?? focusedLane?.values[2] ?? total : view.center} maximum={Math.max(0, ...fieldLanes.map(lane => lane.value))} unit={arena.unit} onChange={value => { if (courseReplay) return; if (sceneDimension === "4d") setCourseTarget(previous => ({ value, request: (previous?.request ?? 0) + 1 })); else panTo(value); }} /></FieldOverlayView>}
            {/* Broadcast HUD: Bottom Focused Athlete Spotlight + Player Chips */}
            {focusedLane && !backgroundMode ? (
              <SlidingFieldPanel
                label="athlete panel"
                collapseGrip
                collapsed={spotlightCollapsed}
                onToggle={() => setSpotlightCollapsed(value => !value)}
                overlaysHidden={overlaysHidden}
                style={{
                  position: "absolute",
                  left: 12,
                  right: 12,
                  bottom: safeBottom + 136,
                }}
                surfaceStyle={{
                  backgroundColor: "rgba(20, 20, 19, 0.86)",
                  borderRadius: 20,
                  paddingVertical: 10,
                  paddingHorizontal: 12,
                  borderWidth: 1,
                  borderColor: "rgba(255, 255, 255, 0.16)",
                  ...hud.chrome,
                  gap: 8,
                }}
              >
                <MapHudBackdrop radius={20} />
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 10,
                  }}
                >
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text
                      style={{
                        ...textStyle("caption"),
                        color: focusedRank === 1 ? hud.accent : (hud.light ? hud.muted : "rgba(255,255,255,0.65)"),
                      }}
                    >
                      {ordinalPlace(focusedRank).toUpperCase()} PLACE
                    </Text>
                    <Text
                      numberOfLines={1}
                      style={{ ...textStyle("label"), color: hud.ink }}
                    >
                      {focusedLane.name}
                    </Text>
                  </View>
                  <View style={{ alignItems: "flex-end", gap: 2 }}>
                    <Text style={{ ...textStyle("heading"), color: hud.accent }}>
                      {focusedLane.values[2].toFixed(volumeDecimals)} {arena.unit}
                    </Text>
                    <Text
                      style={{
                        ...textStyle("caption"),
                        color: (hud.light ? hud.muted : "rgba(255,255,255,0.72)"),
                      }}
                    >
                      {focusedLane.you
                        ? focusedRank === 1
                          ? "Leading the field"
                          : `${Math.abs(focusedDeltaToLeader).toFixed(volumeDecimals)} ${arena.unit} to 1st`
                        : `${focusedDeltaToYou > 0 ? "+" : ""}${focusedDeltaToYou.toFixed(volumeDecimals)} ${arena.unit} vs you`}
                    </Text>
                  </View>
                </View>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 6, paddingTop: 2 }}
                >
                  {ranked.filter(peer => !hiddenIds.includes(peer.id)).map((peer) => {
                    const activeChip = focusedLane.id === peer.id;
                    return (
                      <Pressable
                        key={peer.id}
                        accessibilityRole="button"
                        accessibilityLabel={`Focus ${peer.name}, place ${place(peer.values[2])}`}
                        onPress={() => {
                          selectAthlete(peer.id);
                        }}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 6,
                          paddingHorizontal: 10,
                          paddingVertical: 6,
                          borderRadius: 999,
                          backgroundColor: activeChip
                            ? c.tennis
                            : hud.light
                              ? c.soft
                              : "rgba(255, 255, 255, 0.1)",
                          borderWidth: 1,
                          borderColor: activeChip
                            ? c.tennis
                            : place(peer.values[2]) === 1
                              ? (hud.light ? c.tennis : "rgba(200, 245, 59, 0.45)")
                              : (hud.light ? "rgba(20, 43, 59, 0.14)" : "rgba(255, 255, 255, 0.14)"),
                        }}
                      >
                        <Text
                          style={{
                            ...textStyle("caption"),
                            color: activeChip
                              ? c.textOnAction
                              : place(peer.values[2]) === 1
                                ? hud.accent
                                : (hud.light ? hud.muted : "rgba(255,255,255,0.7)"),
                          }}
                        >
                          #{place(peer.values[2])}
                        </Text>
                        <Text
                          numberOfLines={1}
                          style={{
                            ...textStyle("caption"),
                            color: activeChip ? c.textOnAction : hud.ink,
                          }}
                        >
                          {peer.name.split(" ")[0]}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>

                <View style={{ borderRadius: 12, overflow: "hidden", marginTop: 4 }}>
                  <FieldOverview
                    hiddenIds={hiddenIds}
                    lanes={fieldLanes}
                    view={sceneDimension === "4d" ? { ...view, center: courseTarget?.value ?? focusedLane?.values[2] ?? total } : view}
                    unit={arena.unit}
                    positionOnly={sceneDimension === "4d"}
                    onNavigate={value => {
                      if (sceneDimension === "4d") setCourseTarget(previous => ({ value, request: (previous?.request ?? 0) + 1 }));
                      else panTo(value);
                    }}
                  />
                </View>
              </SlidingFieldPanel>
            ) : null}
          </> : null}
          {!backgroundMode && !queued && <FieldOverlayView hidden={overlaysHidden} style={{ position: "absolute", left: 12, right: 12, bottom: safeBottom + 8 }}><FieldTimeline timeline={timeline} floating /></FieldOverlayView>}
          <AthleteProfileSheet athlete={profileAthlete} onClose={() => setProfileAthlete(null)} />
          </View>
        </FullscreenHost>
      ) : (
        <View style={{ position: "relative" }}>{fieldContent}{queueOverlay}</View>
      )}

      {!standingsOnly && !expanded && !queued && <FieldTimeline timeline={timeline} />}
      {!expanded ? <AthleteProfileSheet athlete={profileAthlete} onClose={() => setProfileAthlete(null)} /> : null}
      {!queued && !persistent && <View style={[f.section, { paddingTop: 16 }]}>
        <StandingsList
          ranked={ranked.map((lane) => ({
            ...lane,
            value: lane.values[2],
          }))}
          hiddenIds={hiddenIds}
          unit={arena.unit}
          scores={scores}
          onSelectAthlete={(lane) => onFocusAthlete ? onFocusAthlete(lane.id) : selectAthlete(lane.id)}
          onOpenProfile={(lane) => {
            const target = ranked.find((item) => item.id === lane.id);
            if (target) openProfile(target);
          }}
        />
      </View>}
    </View>
  );
}

function FullscreenHost({ persistent, children, ...props }: React.ComponentProps<typeof Modal> & { persistent: boolean }) {
  return persistent ? <View style={{ position: "absolute", inset: 0 }}>{children}</View> : <Modal {...props}>{children}</Modal>;
}
