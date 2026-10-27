import { CompetitionReplayButton } from "./competition-replay";
import { UserAvatar } from "../ui/user-avatar";
import { textStyle } from "../ui/section";
import { RankBadge } from "../ui/rank-badge";
import { useFieldFlight } from "../ui/use-field-flight";
import { FieldOverlayView, SlidingFieldPanel } from "../ui/field-overlay-motion";
import { PortraitField } from "../ui/portrait-field";
import {
  orderedArenaLanes,
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
  type ArenaSceneLane,
  type ScoreTrack,
  type SportId,
} from "@fitness-battle/shared";
import { usePathname } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppState, Modal, Pressable, ScrollView, Text, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { IconButton } from "../ui/icon-button";
import Svg from "react-native-svg";
import { useCompeteStore } from "../lib/compete-store";
import { playCue } from "../lib/haptics";
import { SHELL_COLORS as c } from "../theme";
import { f } from "../ui/focus";
import { LaneTrack, type LaneAnchor } from "../ui/lane-track";
import { FieldOverview, useFieldAppearance } from "../ui/field-course";
import { PolishedRacer } from "../ui/polished-racer";
import { useReducedMotion } from "../ui/use-reduced-motion";

export function CompetitionField({
  sport,
  track,
}: {
  sport: SportId;
  track: ScoreTrack;
}) {
  const { state, accountKey } = useCompeteStore();
  const pathname = usePathname();
  const [appearance, setAppearance] = useFieldAppearance(accountKey, sport);
  const isFocused = shellTabFromPath(pathname)?.id === "arena";
  const [sceneDimension, setSceneDimension] = useState<"2d" | "3d">("2d");
  const [standingsOpen, setStandingsOpen] = useState(false);
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
  const toggleDimension = () => {
    void playCue("selection");
    setSceneDimension((prev) => (prev === "2d" ? "3d" : "2d"));
  };
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
  const [focusRequest, setFocusRequest] = useState(0);
  const reduceMotion = useReducedMotion();

  const arena = useMemo(
    () => (state ? buildArenaModel(state, undefined, track, sport) : null),
    [state, track, sport],
  );
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
          initials: initialsFromName(l.name),
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
  if (!state || !arena) return null;
  const displayTotal = total;
  const selectAthlete = (id: string) => {
    const lane = arena.lanes.find((item) => item.id === id);
    if (!lane) return;
    const ordered = orderedArenaLanes(arena.lanes);
    portraitAnchor.current = Math.max(0, ordered.findIndex(l => l.id === id)) - Math.max(0, ordered.findIndex(l => l.you));
    setSelectedId(id);
    setFocusRequest(value => value + 1);
    flight.fly({ ...view, center: clampCourseCenter(lane.values[2], view.span, arenaFieldHigh(fieldLanes), arena.unit, appearance.ground) });
  };

  const ranked = arena.lanes
    .filter((lane) => !lane.ghost)
    .sort((a, b) => b.values[2] - a.values[2]);
  const place = (value: number) =>
    1 + ranked.filter((lane) => lane.values[2] > value).length;
  const scores = weeklyBoard(state, sport, track);
  const pastYou = arena.lanes.find(lane => lane.ghost);
  const leader = ranked[0];
  const leaderValue = Math.max(leader?.values[2] ?? 0, 0.0001);
  const myRankIndex = ranked.findIndex((lane) => lane.you);
  const aheadPeer = myRankIndex > 0 ? ranked[myRankIndex - 1] : null;
  const behindPeer =
    myRankIndex >= 0 && myRankIndex < ranked.length - 1
      ? ranked[myRankIndex + 1]
      : null;
  const focusedLane =
    ranked.find((lane) => lane.id === (selectedId ?? me?.id)) ??
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
    periodStart: competePeriodWindow(state, competeNow(state), sport).startsAt.toISOString(),
    periodEnd: competePeriodWindow(state, competeNow(state), sport).endsAt.toISOString(),
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
      {sceneDimension === "3d" && isFocused ? (
        <PortraitField
          lanes={arena.lanes.map((l) => ({
            ...l,
            initials: initialsFromName(l.name),
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
          overlaysHidden={overlaysHidden}
          onExpand={expandField}
          onToggleDimension={toggleDimension}
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
            appearance={appearance}
            onChangeAppearance={setAppearance}
            height={sceneHeight}
            fullscreen={expanded}
            overlaysHidden={overlaysHidden}
            onExpand={expandField}
            onToggleDimension={toggleDimension}
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
          <FieldOverlayView
            hidden={overlaysHidden}
            onTouchStart={event => event.stopPropagation()}
            pointerEvents="auto"
            style={{
              position: "absolute",
              bottom: expanded ? safeBottom + 148 : 14,
              alignSelf: "center",
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              borderRadius: 28,
              backgroundColor: "#102e38ed",
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.16)",
              paddingHorizontal: 8,
              paddingVertical: 2,
            }}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Zoom out"
              disabled={view.span >= (arena.unit === "pts" ? 100 : 40)}
              onPress={() =>
                zoomTo(
                  Math.min(arena.unit === "pts" ? 100 : 40, view.span * 1.5),
                )
              }
              style={{
                minWidth: 40,
                minHeight: 40,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ ...textStyle("heading"), color: "white" }}>−</Text>
            </Pressable>
            <CompetitionReplayButton
              state={state}
              selection={replaySelection}
              dimension={sceneDimension}
              label="Replay"
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Zoom in"
              disabled={view.span <= 0.5}
              onPress={() => zoomTo(Math.max(0.5, view.span / 1.5))}
              style={{
                minWidth: 40,
                minHeight: 40,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ ...textStyle("heading"), color: "white" }}>＋</Text>
            </Pressable>
          </FieldOverlayView>
        </View>
        {!expanded ? (
          <View style={{ marginTop: 8, borderRadius: 12, overflow: "hidden" }}>
            <FieldOverview
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
    <View style={{ gap: 14 }}>
      {expanded ? (
        <Modal
          visible
          animationType={reduceMotion ? "none" : "slide"}
          presentationStyle="fullScreen"
          onRequestClose={() => setExpanded(false)}
        >
          <View onTouchStartCapture={() => hold.current?.reset()} style={[f.safe, { backgroundColor: "#0b242c", position: "relative" }]}>
            {fieldContent}
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
              <View
                pointerEvents="none"
                style={{
                  backgroundColor: "rgba(20, 20, 19, 0.74)",
                  borderRadius: 999,
                  paddingHorizontal: 14,
                  paddingVertical: 7,
                  borderWidth: 1,
                  borderColor: "rgba(255, 255, 255, 0.14)",
                }}
              >
                <Text
                  accessibilityRole="header"
                  style={{ ...textStyle("label"), color: "#ffffff" }}
                >
                  {arena.sportName} · {place(total)} / {ranked.length}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  sceneDimension === "2d" ? "Switch to 3D field" : "Switch to 2D map"
                }
                onPress={toggleDimension}
                style={{
                  minHeight: 40,
                  paddingHorizontal: 14,
                  justifyContent: "center",
                  borderRadius: 999,
                  backgroundColor: "rgba(20, 20, 19, 0.78)",
                  borderWidth: 1,
                  borderColor: "rgba(200, 245, 59, 0.55)",
                }}
              >
                <Text style={{ ...textStyle("label"), color: c.tennis }}>
                  {sceneDimension === "2d" ? "2D" : "3D"}
                </Text>
              </Pressable>
            </FieldOverlayView>

            {/* Broadcast HUD: Left Interval Tower */}
            <SlidingFieldPanel
              label="live intervals"
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
                LIVE INTERVALS
              </Text>
              {ranked.slice(0, 4).map((peer, idx) => {
                const delta = peer.values[2] - leaderValue;
                const isSelected = (selectedId ?? me?.id) === peer.id;
                return (
                  <Pressable
                    key={peer.id}
                    accessibilityRole="button"
                    accessibilityLabel={`Jump to ${peer.name}`}
                    onPress={() => {
                      void playCue("selection");
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
                      {idx + 1}
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

            {/* Broadcast HUD: Right Quick-Jump Rail */}
            <FieldOverlayView
              hidden={overlaysHidden}
              pointerEvents="box-none"
              style={{
                position: "absolute",
                top: safeTop + 98,
                right: 12,
                gap: 8,
              }}
            >
              {aheadPeer ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Jump to rival ahead, ${aheadPeer.name}`}
                  onPress={() => {
                    void playCue("selection");
                    selectAthlete(aheadPeer.id);
                  }}
                  style={{
                    backgroundColor: "rgba(20, 20, 19, 0.75)",
                    borderRadius: 999,
                    paddingVertical: 8,
                    paddingHorizontal: 12,
                    borderWidth: 1,
                    borderColor: "rgba(255, 255, 255, 0.16)",
                    alignItems: "center",
                  }}
                >
                  <Text style={{ ...textStyle("caption"), color: "#ffffff" }}>
                    ↑ Ahead
                  </Text>
                </Pressable>
              ) : null}
              {me ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Recenter on your athlete"
                  onPress={() => {
                    void playCue("selection");
                    selectAthlete(me.id);
                  }}
                  style={{
                    backgroundColor: c.tennis,
                    borderRadius: 999,
                    paddingVertical: 8,
                    paddingHorizontal: 12,
                    alignItems: "center",
                  }}
                >
                  <Text style={{ ...textStyle("caption"), color: c.ink }}>
                    YOU
                  </Text>
                </Pressable>
              ) : null}
              {behindPeer ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Jump to rival behind, ${behindPeer.name}`}
                  onPress={() => {
                    void playCue("selection");
                    selectAthlete(behindPeer.id);
                  }}
                  style={{
                    backgroundColor: "rgba(20, 20, 19, 0.75)",
                    borderRadius: 999,
                    paddingVertical: 8,
                    paddingHorizontal: 12,
                    borderWidth: 1,
                    borderColor: "rgba(255, 255, 255, 0.16)",
                    alignItems: "center",
                  }}
                >
                  <Text style={{ ...textStyle("caption"), color: "#ffffff" }}>
                    ↓ Behind
                  </Text>
                </Pressable>
              ) : null}
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
                  {ranked.map((peer, idx) => {
                    const activeChip = focusedLane.id === peer.id;
                    return (
                      <Pressable
                        key={peer.id}
                        accessibilityRole="button"
                        accessibilityLabel={`Focus ${peer.name}, place ${idx + 1}`}
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
                          #{idx + 1}
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
              </SlidingFieldPanel>
            ) : null}
          </View>
        </Modal>
      ) : (
        fieldContent
      )}

      {/* Collapsed-by-default Standings Disclosure */}
      <View style={f.section}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: standingsOpen }}
          accessibilityLabel={standingsOpen ? "Hide standings" : "Show standings"}
          onPress={() => {
            void playCue("selection");
            setStandingsOpen((prev) => !prev);
          }}
          style={[
            f.row,
            {
              justifyContent: "space-between",
              minHeight: 40,
            },
          ]}
        >
          <View style={{ gap: 2 }}>
            <Text style={textStyle("label")}>
              {standingsOpen ? "Hide standings" : "Show standings"}
            </Text>
            <Text style={[textStyle("caption"), { color: c.muted }]}>
              {ordinalPlace(place(total))} of {ranked.length} · {total.toFixed(1)}{" "}
              {arena.unit}
              {leader
                ? ` · Leader ${leader.you ? "You" : leader.name.split(" ")[0]} (${leader.values[2].toFixed(1)} ${arena.unit})`
                : ""}
            </Text>
          </View>
          <Text style={[textStyle("label"), { color: c.ink }]}>
            {standingsOpen ? "▴" : "▾"}
          </Text>
        </Pressable>

        {standingsOpen ? (
          <View style={{ gap: 10, paddingTop: 6 }}>
            {/* 1st Place Leader Stage */}
            {leader ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Leader stage: ${leader.name}, 1st place, ${leader.values[2].toFixed(1)} ${arena.unit}`}
                onPress={() => selectAthlete(leader.id)}
                style={{
                  backgroundColor: c.ink,
                  borderRadius: 16,
                  padding: 14,
                  gap: 10,
                }}
              >
                <View style={[f.row, { justifyContent: "space-between" }]}>
                  <View
                    style={{
                      backgroundColor: c.tennis,
                      borderRadius: 999,
                      paddingHorizontal: 10,
                      paddingVertical: 3,
                    }}
                  >
                    <Text style={{ ...textStyle("caption"), color: c.ink }}>
                      1ST PLACE · FIELD LEADER
                    </Text>
                  </View>
                  <Text style={{ ...textStyle("caption"), color: "rgba(255,255,255,0.7)" }}>
                    {scores.find((row) => row.id === leader.id)?.elo ?? "—"} ELO
                  </Text>
                </View>
                <View style={f.row}>
                  <UserAvatar
                    src={leader.avatarUrl}
                    name={leader.name}
                    size={42}
                    fallback={
                      <Svg width={32} height={42} viewBox="-40 -50 80 100">
                        <PolishedRacer
                          x={0}
                          y={0}
                          you={leader.you}
                          gold
                        />
                      </Svg>
                    }
                  />
                  <View style={f.grow}>
                    <Text style={{ ...textStyle("heading"), color: "#ffffff" }}>
                      {leader.you ? selfLaneLabel(leader.name) : leader.name}
                    </Text>
                    <Text style={{ ...textStyle("caption"), color: "rgba(255,255,255,0.7)" }}>
                      {leader.you
                        ? "You hold the crown this week"
                        : `${(leader.values[2] - total).toFixed(1)} ${arena.unit} ahead of you`}
                    </Text>
                  </View>
                  <Text style={{ ...textStyle("heading"), color: c.tennis }}>
                    {leader.values[2].toFixed(1)} {arena.unit}
                  </Text>
                </View>
              </Pressable>
            ) : null}

            <Text style={textStyle("caption")}>Ranked by this week's effort</Text>
            {ranked.map((lane) => {
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
                  onPress={() => selectAthlete(lane.id)}
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
                    fallback={
                      <Svg width={26} height={36} viewBox="-40 -50 80 100">
                        <PolishedRacer
                          x={0}
                          y={0}
                          you={lane.you}
                          gold={rank === 1}
                        />
                      </Svg>
                    }
                  />
                  <View style={[f.grow, { gap: 6 }]}>
                    <View style={f.row}>
                      <View style={f.grow}>
                        <Text style={textStyle("label")}>
                          {lane.you ? selfLaneLabel(lane.name) : lane.name}
                        </Text>
                      </View>
                      <RankBadge score={elo} />
                      <View style={{ alignItems: "flex-end" }}>
                        <Text style={textStyle("label")}>
                          {lane.values[2].toFixed(1)} {arena.unit}
                        </Text>
                        <Text style={[textStyle("caption"), { color: c.ink }]}>
                          {elo ?? "—"} effort score
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
            {pastYou && (
              <View
                style={[
                  f.row,
                  { minHeight: 48, borderTopWidth: 1, borderTopColor: c.line },
                ]}
              >
                <Text style={textStyle("body")}>Past you · unranked</Text>
                <Text style={textStyle("label")}>
                  {pastYou.values[2].toFixed(1)} {arena.unit}
                </Text>
              </View>
            )}
          </View>
        ) : null}
      </View>
    </View>
  );
}
