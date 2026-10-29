import { AthleteProfileSheet, type AthleteProfileSelection } from "./athlete-profile-sheet";
import { QueuedField } from "./queued-field";
import { FieldViewSwitcher } from "../ui/field-view-switcher";
import { FieldGroundSwitcher } from "../ui/field-ground-switcher";
import { GeographicCourse } from "./geographic-course";
import { useCompetitionCourse } from "./use-competition-course";
import { CompetitionReplayButton } from "./competition-replay";
import { UserAvatar } from "../ui/user-avatar";
import { textStyle } from "../ui/section";
import { useFieldFlight } from "../ui/use-field-flight";
import { FieldOverlayView, SlidingFieldPanel } from "../ui/field-overlay-motion";
import { PortraitField } from "../ui/portrait-field";
import {
  orderedArenaLanes,
  competitionQueue,
  createFieldOverlayHold,
  arenaFieldHigh,
  clampCourseCenter,
  competeNow,
  competePeriodWindow,
  fieldDefaultSpan,
  buildArenaModel,
  initialsFromName,
  ordinalPlace,
  selfLaneLabel,
  shellTabFromPath,
  weeklyBoard,
  type CourseDistanceTarget,
  type ArenaSceneLane,
  type ScoreTrack,
  type SportId,
} from "@fitness-battle/shared";
import { usePathname } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppState, Modal, Pressable, ScrollView, Text, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { IconButton } from "../ui/icon-button";
import { useAthleteBlocks } from "../lib/athlete-blocks";
import { useCompeteStore } from "../lib/compete-store";
import { playCue } from "../lib/haptics";
import { SHELL_COLORS as c } from "../theme";
import { f } from "../ui/focus";
import { LaneTrack, type LaneAnchor } from "../ui/lane-track";
import { FieldOverview, useFieldAppearance } from "../ui/field-course";
import { useReducedMotion } from "../ui/use-reduced-motion";

export function CompetitionField({
  sport,
  track,
}: {
  sport: SportId;
  track: ScoreTrack;
}) {
  const { state, accountKey, debugActive, dispatch } = useCompeteStore();
  const { blocks } = useAthleteBlocks();
  const hiddenIds = useMemo(() => blocks.map(block => block.id), [blocks]);
  const now = state ? competeNow(state) : new Date();
  const queue = state ? competitionQueue(state, sport, now) : null;
  const queued = Boolean(queue && (queue.queued || queue.awaitingField));
  const queueOverlay = queued && state ? <QueuedField overlay state={state} event={sport} now={now} onCancel={() => dispatch({ type: "opt-out", sport })} /> : null;
  const pathname = usePathname();
  const [appearance, setAppearance] = useFieldAppearance(accountKey, sport);
  const isFocused = shellTabFromPath(pathname)?.id === "arena";
  const [sceneDimension, setSceneDimension] = useState<"2d" | "3d" | "4d">("2d");
  const [courseTarget, setCourseTarget] = useState<CourseDistanceTarget | null>(null);
  const chooseView = (value: "2d" | "3d" | "4d") => {
    void playCue("selection");
    flight.cancel();
    setSceneDimension(value);
  };
  const [expanded, setExpanded] = useState(false);
  const [intervalsCollapsed, setIntervalsCollapsed] = useState(false);
  const [spotlightCollapsed, setSpotlightCollapsed] = useState(false);
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
  const portraitAnchor = useRef(0);
  const expandField = () => { setExpanded(true); void playCue("light"); };
  const [center, setCenter] = useState<number | null>(null);
  const [span, setSpan] = useState<number | null>(null);
  const ghost = true;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [profileAthlete, setProfileAthlete] = useState<AthleteProfileSelection | null>(null);
  useEffect(() => { if (selectedId && hiddenIds.includes(selectedId)) setSelectedId(null); }, [hiddenIds, selectedId]);
  const [focusRequest, setFocusRequest] = useState(0);
  const reduceMotion = useReducedMotion();

  const arena = useMemo(
    () => (state ? buildArenaModel(state, undefined, track, sport) : null),
    [state, track, sport],
  );
  const period = state ? competePeriodWindow(state, competeNow(state), sport) : null;
  const { course, error: courseError, retry: retryCourse } = useCompetitionCourse(sport, period?.startsAt.toISOString() ?? "", period?.endsAt.toISOString() ?? "", debugActive, sceneDimension === "4d" && isFocused);
  useEffect(() => setCourseTarget(null), [accountKey, sport, period?.startsAt.getTime(), arena?.unit]);
  const defaultSpan = fieldDefaultSpan(arena?.unit ?? "km");
  const viewSpan = span ?? defaultSpan;
  useEffect(() => { if (!isFocused) setExpanded(false); }, [isFocused]);
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
        })),
    [arena?.lanes],
  );

  const view = {
    center: clampCourseCenter(center ?? total, viewSpan, arenaFieldHigh(fieldLanes), arena?.unit ?? "km", appearance.ground),
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
    setCourseTarget(null);
    const ordered = orderedArenaLanes(arena.lanes);
    portraitAnchor.current = Math.max(0, ordered.findIndex(l => l.id === id)) - Math.max(0, ordered.findIndex(l => l.you));
    setSelectedId(id);
    setFocusRequest(value => value + 1);
    if (sceneDimension !== "4d") flight.fly({ ...view, center: clampCourseCenter(lane.values[2], view.span, arenaFieldHigh(fieldLanes), arena.unit, appearance.ground) });
  };

  const ranked = arena.lanes
    .filter((lane) => !lane.ghost)
    .sort((a, b) => b.values[2] - a.values[2]);
  const place = (value: number) =>
    1 + ranked.filter((lane) => lane.values[2] > value).length;
  const scores = weeklyBoard(state, sport, track);
  const openProfile = (lane: (typeof ranked)[number]) => {
    setProfileAthlete({
      id: lane.id, name: lane.name, avatarUrl: lane.avatarUrl, you: lane.you,
      sample: !lane.you && Boolean(state.enrollments.find((item) => item.sport === sport)?.syntheticIds.includes(lane.id)),
      score: scores.find((row) => row.id === lane.id)?.elo,
      contextLabel: "This week", contextValue: `${lane.values[2].toFixed(1)} ${arena.unit}`,
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
  const focusedElo = focusedLane
    ? scores.find((row) => row.id === focusedLane.id)?.elo
    : undefined;
  const focusedDeltaToYou = focusedLane ? focusedLane.values[2] - total : 0;
  const focusedDeltaToLeader =
    focusedLane && leader ? focusedLane.values[2] - leader.values[2] : 0;

  const replaySelection = {
    sport,
    track,
    periodStart: period.startsAt.toISOString(),
    periodEnd: period.endsAt.toISOString(),
  };

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
      {sceneDimension === "4d" && isFocused ? <View style={{ height: sceneHeight }}>
        <GeographicCourse hiddenIds={hiddenIds} lanes={fieldLanes} unit={arena.unit} selectedId={selectedId ?? me?.id ?? ""} focusRequest={focusRequest} onSelect={id => { if (!hold.current?.suppressSelection()) selectAthlete(id); }} course={course} error={courseError} onRetry={retryCourse} distanceTarget={courseTarget} onResumeFollow={() => setCourseTarget(null)} controlsBottom={expanded ? safeBottom + (spotlightCollapsed ? 132 : 216) : 8} overlaysHidden={overlaysHidden} />
        {!expanded ? <View style={{ position: "absolute", right: 12, top: 12 }}><IconButton icon="expand" label="Expand 4D course to full screen" onPress={expandField} /></View> : null}
      </View> : null}
      {sceneDimension === "3d" && isFocused ? (
        <PortraitField
          hiddenIds={hiddenIds}
          lanes={arena.lanes.map((l) => ({
            ...l,
            initials: l.mystery ? "?" : initialsFromName(l.name),
          mystery: l.mystery,
            value: l.values[2],
          }))}
          view={view}
          unit={arena.unit}
          selectedId={selectedId ?? me?.id}
          focusRequest={focusRequest}
          animateSelection={!reduceMotion}
          onGestureStart={flight.cancel}
          onViewChange={applyView}
          onZoom={zoomTo}
          onPan={panTo}
          height={sceneHeight}
          fullscreen={expanded}
          controlsTop={expanded ? 12 : 66}
          fullscreenControlsBottom={safeBottom + 220}
          overlaysHidden={overlaysHidden}
          onExpand={expandField}
          laneAnchor={portraitAnchor}
          onSelect={id => { if (!hold.current?.suppressSelection()) selectAthlete(id); }}
        />
      ) : null}
      <View
        style={{
          display: sceneDimension === "2d" ? "flex" : "none",
        }}
      >
        <View style={{ position: "relative" }}>
          <LaneTrack
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
            selectedId={selectedId ?? me?.id}
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
      </View>
    </View>
  );

  return (
    <View style={{ gap: 14, position: "relative" }}>
      {!expanded ? (
        <View
          style={{
            position: "absolute",
            left: 12,
            top: 12,
            zIndex: 10,
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          <FieldViewSwitcher
            value={sceneDimension}
            geographic={arena.unit !== "pts"}
            onChange={chooseView}
          />
          {sceneDimension === "2d" ? (
            <FieldGroundSwitcher
              appearance={appearance}
              onChangeAppearance={setAppearance}
            />
          ) : null}
          {!queued && <CompetitionReplayButton
            state={state}
            selection={replaySelection}
            dimension={sceneDimension}
            variant="inline"
            label="Replay"
          />}
        </View>
      ) : null}
      {expanded ? (
        <Modal
          visible
          animationType={reduceMotion ? "none" : "slide"}
          presentationStyle="fullScreen"
          onRequestClose={() => setExpanded(false)}
        >
          <View onTouchStartCapture={() => hold.current?.reset()} style={[f.safe, { backgroundColor: "#0b242c", position: "relative" }]}>
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
                  top: safeTop + 6,
                  left: 12,
                  right: 12,
                  justifyContent: "space-between",
                },
              ]}
            >
              <View
                style={{
                  backgroundColor: "rgba(20, 20, 19, 0.72)",
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: "rgba(255, 255, 255, 0.16)",
                }}
              >
                <IconButton
                  icon="back"
                  label="Close full screen field"
                  onPress={() => setExpanded(false)}
                />
              </View>
              <FieldViewSwitcher value={sceneDimension} geographic={arena.unit !== "pts"} onChange={chooseView} />
            </FieldOverlayView>

            {!queued && (sceneDimension !== "4d" || course) ? <>
            {/* Broadcast HUD: Left Current Positions Tower */}
            <SlidingFieldPanel
              label="current positions"
              collapsed={intervalsCollapsed}
              onToggle={() => setIntervalsCollapsed(value => !value)}
              overlaysHidden={overlaysHidden}
              style={{
                position: "absolute",
                top: safeTop + 62,
                left: 12,
                maxWidth: 274, // 230 px panel plus the 44 px grip target.
              }}
              surfaceStyle={{
                backgroundColor: "rgba(20, 20, 19, 0.72)",
                borderRadius: 14,
                paddingVertical: 8,
                paddingHorizontal: 10,
                borderWidth: 1,
                borderColor: "rgba(255, 255, 255, 0.14)",
                gap: 5,
              }}
            >
              <Text style={{ ...textStyle("caption"), color: "rgba(255,255,255,0.65)" }}>
                CURRENT POSITIONS
              </Text>
              {ranked.slice(0, 4).map((peer, idx) => {
                if (hiddenIds.includes(peer.id)) return <View key={peer.id} style={{ height: 24 }} />;
                const delta = peer.values[2] - leaderValue;
                const isSelected = (selectedId ?? me?.id) === peer.id;
                return (
                  <Pressable
                    key={peer.id}
                    accessibilityRole="button"
                    accessibilityLabel={`View ${peer.name}'s profile`}
                    onPress={() => {
                      void playCue("selection");
                      selectAthlete(peer.id);
                      openProfile(peer);
                    }}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                      paddingVertical: 2,
                      paddingHorizontal: 4,
                      borderRadius: 6,
                      backgroundColor: isSelected
                        ? "rgba(200, 245, 59, 0.2)"
                        : "transparent",
                    }}
                  >
                    <Text
                      style={{
                        ...textStyle("caption"),
                        width: 14,
                        color: peer.you ? c.tennis : "rgba(255,255,255,0.7)",
                      }}
                    >
                      {place(peer.values[2])}
                    </Text>
                    <Text
                      numberOfLines={1}
                      style={{
                        ...textStyle("caption"),
                        color: peer.you ? c.tennis : "#ffffff",
                        flex: 1,
                      }}
                    >
                      {peer.you ? "YOU" : peer.name.split(" ")[0]}
                    </Text>
                    <Text
                      style={{
                        ...textStyle("caption"),
                        color: idx === 0 ? c.tennis : "rgba(255,255,255,0.8)",
                      }}
                    >
                      {idx === 0
                        ? `${peer.values[2].toFixed(1)}`
                        : `${delta.toFixed(1)}`}
                    </Text>
                  </Pressable>
                );
              })}
            </SlidingFieldPanel>

            {/* Right Replay action positioned underneath the 2D dropdown */}
            <FieldOverlayView
              hidden={overlaysHidden}
              pointerEvents="box-none"
              style={{
                position: "absolute",
                top: safeTop + 54,
                right: 12,
                zIndex: 10,
              }}
            >
              <View onTouchStart={event => event.stopPropagation()}>
                {!queued && <CompetitionReplayButton
                  state={state}
                  selection={replaySelection}
                  dimension={sceneDimension}
                  variant="inline"
                  label="Replay"
                />}
              </View>
            </FieldOverlayView>

            {/* Broadcast HUD: Bottom Focused Athlete Spotlight + Player Chips */}
            {focusedLane ? (
              <SlidingFieldPanel
                label="athlete panel"
                collapsed={spotlightCollapsed}
                onToggle={() => setSpotlightCollapsed(value => !value)}
                overlaysHidden={overlaysHidden}
                style={{
                  position: "absolute",
                  left: 12,
                  right: 12,
                  bottom: safeBottom + 8,
                }}
                surfaceStyle={{
                  backgroundColor: "rgba(20, 20, 19, 0.86)",
                  borderRadius: 20,
                  paddingVertical: 10,
                  paddingHorizontal: 12,
                  borderWidth: 1,
                  borderColor: "rgba(255, 255, 255, 0.16)",
                  gap: 8,
                }}
              >
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
                        color: focusedLane.you ? c.tennis : "rgba(255,255,255,0.65)",
                      }}
                    >
                      {ordinalPlace(focusedRank).toUpperCase()} PLACE
                      {focusedLane.you ? " · YOU" : ""}
                      {focusedElo ? ` · ${focusedElo} ELO` : ""}
                    </Text>
                    <Text
                      numberOfLines={1}
                      style={{ ...textStyle("label"), color: "#ffffff" }}
                    >
                      {focusedLane.you
                        ? selfLaneLabel(focusedLane.name)
                        : focusedLane.name}
                    </Text>
                  </View>
                  <View style={{ alignItems: "flex-end", gap: 2 }}>
                    <Text style={{ ...textStyle("heading"), color: c.tennis }}>
                      {focusedLane.values[2].toFixed(1)} {arena.unit}
                    </Text>
                    <Text
                      style={{
                        ...textStyle("caption"),
                        color: "rgba(255,255,255,0.72)",
                      }}
                    >
                      {focusedLane.you
                        ? focusedRank === 1
                          ? "Leading the field"
                          : `${Math.abs(focusedDeltaToLeader).toFixed(1)} ${arena.unit} to 1st`
                        : `${focusedDeltaToYou > 0 ? "+" : ""}${focusedDeltaToYou.toFixed(1)} ${arena.unit} vs you`}
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
                          void playCue("selection");
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
                            : "rgba(255, 255, 255, 0.1)",
                          borderWidth: 1,
                          borderColor: activeChip
                            ? c.tennis
                            : peer.you
                              ? "rgba(200, 245, 59, 0.45)"
                              : "rgba(255, 255, 255, 0.14)",
                        }}
                      >
                        <Text
                          style={{
                            ...textStyle("caption"),
                            color: activeChip
                              ? c.ink
                              : peer.you
                                ? c.tennis
                                : "rgba(255,255,255,0.7)",
                          }}
                        >
                          #{place(peer.values[2])}
                        </Text>
                        <Text
                          numberOfLines={1}
                          style={{
                            ...textStyle("caption"),
                            color: activeChip ? c.ink : "#ffffff",
                          }}
                        >
                          {peer.you ? "You" : peer.name.split(" ")[0]}
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
          <AthleteProfileSheet athlete={profileAthlete} onClose={() => setProfileAthlete(null)} />
          </View>
        </Modal>
      ) : (
        <View>{fieldContent}{queueOverlay}</View>
      )}

      {!expanded ? <AthleteProfileSheet athlete={profileAthlete} onClose={() => setProfileAthlete(null)} /> : null}
      {!queued && <View style={[f.section, { paddingTop: 16 }]}>
        <View style={{ gap: 10 }}>
          {ranked.map((lane) => {
            if (hiddenIds.includes(lane.id)) return <View key={lane.id} style={{ minHeight: 72 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />;
            const rank = place(lane.values[2]);
            const pct = Math.max(
              6,
              Math.min(100, Math.round((lane.values[2] / leaderValue) * 100)),
            );
            const elo = scores.find((row) => row.id === lane.id)?.elo;
            return (
              <Pressable
                key={lane.id}
                accessibilityRole="button"
                accessibilityLabel={`${lane.name}, place ${rank}, ${lane.values[2].toFixed(1)} ${arena.unit}`}
                onPress={() => openProfile(lane)}
                style={[
                  f.row,
                  {
                    paddingVertical: 10,
                    paddingHorizontal: lane.you ? 10 : 4,
                    borderRadius: 12,
                    backgroundColor: lane.you ? c.soft : "transparent",
                  },
                ]}
              >
                <Text style={[textStyle("label"), { width: 22 }]}>{rank}</Text>
                <UserAvatar
                  src={lane.avatarUrl}
                  name={lane.name}
                  size={36}
                />
                <View style={[f.grow, { gap: 6 }]}>
                  <View style={[f.row, { alignItems: "center", justifyContent: "space-between" }]}>
                    <View style={{ flex: 1, gap: 2, marginRight: 12 }}>
                      <Text style={textStyle("label")} numberOfLines={1}>
                        {lane.you ? selfLaneLabel(lane.name) : lane.name}
                      </Text>
                      <Text style={[textStyle("caption"), { color: c.muted }]}>
                        {elo ?? "—"} effort score
                      </Text>
                    </View>
                    <View style={{ alignItems: "flex-end" }}>
                      <Text style={{ ...textStyle("heading"), color: c.ink }}>
                        {lane.values[2].toFixed(1)} {arena.unit}
                      </Text>
                    </View>
                  </View>
                  {/* Visual proportion bar aligned underneath the user's name */}
                  <View
                    style={{
                      height: 6,
                      borderRadius: 999,
                      backgroundColor: c.line,
                      overflow: "hidden",
                    }}
                  >
                    <View
                      style={{
                        width: `${pct}%`,
                        height: "100%",
                        borderRadius: 999,
                        backgroundColor:
                          rank === 1 ? c.ink : lane.you ? c.tennis : c.muted,
                      }}
                    />
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>}
    </View>
  );
}
