import { UserAvatar } from "../ui/user-avatar";
import { textStyle } from "../ui/section";
import { RankBadge } from "../ui/rank-badge";
import { PortraitField } from "../ui/portrait-field";
import {
  portraitField,
  portraitFieldGap,
  arenaFieldHigh,
  clampCourseCenter,
  fieldDefaultSpan,
  buildArenaModel,
  initialsFromName,
  selfLaneLabel,
  shellTabFromPath,
  weeklyBoard,
  type ArenaSceneLane,
  type ScoreTrack,
  type SportId,
} from "@fitness-battle/shared";
import { usePathname } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Modal, Pressable, Text, View, useWindowDimensions } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { IconButton } from "../ui/icon-button";
import Svg from "react-native-svg";
import { useCompeteStore } from "../lib/compete-store";
import { playCue } from "../lib/haptics";
import { SHELL_COLORS as c } from "../theme";
import { FocusSegments, f } from "../ui/focus";
import { LaneTrack, type LaneAnchor } from "../ui/lane-track";
import {
  FieldGroundPicker,
  FieldOverview,
  useFieldAppearance,
} from "../ui/field-course";
import { PolishedRacer } from "../ui/polished-racer";
import { useReducedMotion } from "../ui/use-reduced-motion";

export function CompetitionField({
  sport,
  track,
  arenaView = "lanes2d",
  chromeInHeader = false,
  onArenaViewChange,
}: {
  sport: SportId;
  track: ScoreTrack;
  arenaView?: "lanes2d" | "standings" | "3d";
  chromeInHeader?: boolean;
  onArenaViewChange?: (value: "lanes2d" | "standings" | "3d") => void;
}) {
  const { state, accountKey } =
    useCompeteStore();
  const pathname = usePathname();
  const [appearance, setAppearance] = useFieldAppearance(accountKey, sport);
  const isFocused = shellTabFromPath(pathname)?.id === "arena";
  const [dimension, setDimension] = useState<"2d" | "3d">("2d");
  const [mode, setMode] = useState<"lanes" | "standings">("lanes");
  const viewMode = chromeInHeader
    ? arenaView === "standings"
      ? "standings"
      : "lanes"
    : mode;
  const viewDimension = chromeInHeader
    ? arenaView === "3d"
      ? "3d"
      : "2d"
    : dimension;
  const [expanded, setExpanded] = useState(false);
  const sceneDimension = viewDimension;
  const dimensions = useWindowDimensions();
  const insets = useSafeAreaInsets();
  // Keep the inline preview useful within a phone screen; expansion owns the
  // full remaining height. Both still show the same distance window.
  const inlineHeight = sceneDimension === "2d"
    ? Math.max(300, Math.min(420, dimensions.height * .46))
    : Math.max(360, Math.min(480, dimensions.height * .56));
  const sceneHeight = Math.round(expanded
    ? Math.max(140, dimensions.height - insets.top - insets.bottom - 108 - (sceneDimension === "2d" ? 90 : 260))
    : inlineHeight);
  const laneAnchor = useRef<LaneAnchor | null>(null);
  const portraitAnchor = useRef(0);
  const expandField = () => { setExpanded(true); void playCue("light"); };
  const zoomFrame = useRef<number | null>(null);
  const spanRef = useRef(0);
  const [center, setCenter] = useState<number | null>(null);
  const [span, setSpan] = useState<number | null>(null);
  const ghost = true;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const reduceMotion = useReducedMotion();

  const arena = useMemo(
    () => (state ? buildArenaModel(state, undefined, track, sport) : null),
    [state, track, sport],
  );
  const defaultSpan = fieldDefaultSpan(arena?.unit ?? "km");
  const viewSpan = span ?? defaultSpan;
  spanRef.current = viewSpan;
  const stopZoom = () => {
    if (zoomFrame.current !== null) cancelAnimationFrame(zoomFrame.current);
    zoomFrame.current = null;
  };
  const directZoom = (value: number) => { stopZoom(); setSpan(value); };
  const zoomTo = (value: number) => {
    stopZoom();
    if (reduceMotion) { setSpan(value); return; }
    const from = spanRef.current, started = Date.now();
    const tick = () => {
      const progress = Math.min(1, (Date.now() - started) / 240);
      setSpan(from + (value - from) * (1 - Math.pow(1 - progress, 3)));
      zoomFrame.current = progress < 1 ? requestAnimationFrame(tick) : null;
    };
    zoomFrame.current = requestAnimationFrame(tick);
  };
  useEffect(() => () => { if (zoomFrame.current !== null) cancelAnimationFrame(zoomFrame.current); }, []);
  useEffect(() => { if (!isFocused || viewMode !== "lanes") setExpanded(false); }, [isFocused, viewMode]);
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

  if (!state || !arena) return null;

  const displayTotal = total;
  const view = {
    center: clampCourseCenter(
      center ?? total,
      viewSpan,
      arenaFieldHigh(fieldLanes),
      arena.unit,
      appearance.ground,
    ),
    span: viewSpan,
  };
  const selectAthlete = (id: string) => {
    const lane = arena.lanes.find((item) => item.id === id);
    if (!lane) return;
    setSelectedId(id);
    setCenter(lane.values[2]);
  };

  const ranked = arena.lanes
    .filter((lane) => !lane.ghost)
    .sort((a, b) => b.values[2] - a.values[2]);
  const place = (value: number) =>
    1 + ranked.filter((lane) => lane.values[2] > value).length;
  const scores = weeklyBoard(state, sport, track);
  const pastYou = arena.lanes.find(lane => lane.ghost);
  const fieldContent = <View>
      {sceneDimension === "3d" && viewMode === "lanes" && isFocused ? (
        <PortraitField
          lanes={arena.lanes.map((l) => ({
            ...l,
            initials: initialsFromName(l.name),
            value: l.values[2],
          }))}
          view={view}
          unit={arena.unit}
          onZoom={zoomTo}
          onPan={(value) => { stopZoom(); setCenter(value); }}
          height={sceneHeight}
          fullscreen={expanded}
          onExpand={expandField}
          laneAnchor={portraitAnchor}
          onSelect={selectAthlete}
        />
      ) : null}
      <View
        style={{
          display: viewMode === "lanes" && sceneDimension === "2d" ? "flex" : "none",
        }}
      >
        {!expanded && <FieldGroundPicker appearance={appearance} onChange={setAppearance} />}
        <View
            pointerEvents="none"
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              gap: 8,
              paddingVertical: 10,
              paddingHorizontal: expanded ? 16 : 0,
            }}
          >
            <Text style={[textStyle("caption"), { color: c.ink }]}>
              {place(total)} / {ranked.length}{" "}
              PLACE
            </Text>
            <Text
              style={[textStyle("caption"), { color: c.ink, flexShrink: 1 }]}
            >
              {portraitFieldGap(
                portraitField(fieldLanes, view).nextGap,
                arena.unit,
              )}
            </Text>
          </View>

        <View style={{ position: "relative" }}>
          <LaneTrack
            appearance={appearance}
            height={sceneHeight}
            fullscreen={expanded}
            onExpand={expandField}
            onZoom={directZoom}
            anchor={laneAnchor}
            active={isFocused && viewMode === "lanes" && sceneDimension === "2d"}
            selectedId={selectedId ?? me?.id}
            lanes={arena.lanes}
            unit={arena.unit}
            showGhost={ghost}
            index={2}
            onSelect={(lane) => selectAthlete(lane.id)}
            view={view}
            onPan={setCenter}
          />
          <View
            style={{
              position: "absolute",
              bottom: 18,
              alignSelf: "center",
              flexDirection: "row",
              alignItems: "center",
              gap: 20,
              borderRadius: 28,
              backgroundColor: "#102e38ed",
              paddingHorizontal: 8,
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
                minWidth: 44,
                minHeight: 44,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ ...textStyle("heading"), color: "white" }}>−</Text>
            </Pressable>
            <Text style={[textStyle("caption"), { color: "white" }]}>Zoom</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Zoom in"
              disabled={view.span <= 0.5}
              onPress={() => zoomTo(Math.max(0.5, view.span / 1.5))}
              style={{
                minWidth: 44,
                minHeight: 44,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ ...textStyle("heading"), color: "white" }}>＋</Text>
            </Pressable>
          </View>
        </View>
        {!expanded && <FieldOverview
          lanes={arena.lanes.map((l) => ({
            ...l,
            initials: initialsFromName(l.name),
            value: l.values[2],
          }))}
          view={view}
          unit={arena.unit}
          onNavigate={(value) => {
            setCenter(value);
            if (appearance.ground === "oval")
              setSpan(Math.min(view.span, fieldDefaultSpan(arena.unit) / 2));
          }}
        />}
      </View>
  </View>;
  return (
    <View style={{ gap: 14 }}>
      {!chromeInHeader ? (
        <>
          <View style={f.row}>
            <View style={f.grow}>
              <Text style={f.kicker}>Accumulated this week</Text>
              <Text
                style={f.massive}
              >
                {displayTotal.toFixed(1)} <Text style={textStyle("body")}>{arena.unit}</Text>
              </Text>
            </View>
            <View style={{ alignItems: "center", gap: 2 }}>
              <Text style={textStyle("heading")}>
                {place(total)} / {ranked.length}
              </Text>
              <Text style={textStyle("caption")}>your place</Text>
            </View>
          </View>
          <FocusSegments
            label={`${arena.sportName} field view`}
            value={mode === "lanes" && dimension === "3d" ? "3d" : mode}
            options={[
              { value: "lanes", label: "2D map" },
              { value: "standings", label: "Standings" },
              { value: "3d", label: "3D field" },
            ]}
            onChange={(next) => {
              void playCue("selection");
              setMode(next === "3d" ? "lanes" : next);
              setDimension(next === "3d" ? "3d" : "2d");
            }}
          />
        </>
      ) : null}

      {expanded ? <Modal visible animationType={reduceMotion ? "none" : "slide"} presentationStyle="fullScreen" onRequestClose={() => setExpanded(false)}>
        <SafeAreaView style={f.safe} edges={["top", "bottom"]}>
          <View style={[f.row, { minHeight: 56, paddingHorizontal: 12 }]}>
            <IconButton icon="back" label="Close full screen field" onPress={() => setExpanded(false)} />
            <Text accessibilityRole="header" style={textStyle("heading")}>{arena.sportName}</Text><View style={{ width: 44 }} />
          </View>
          <View style={{ paddingHorizontal: 16, paddingBottom: 4 }}><FocusSegments label="Full screen field dimension" value={viewDimension} options={[{ value: "2d", label: "2D map" }, { value: "3d", label: "3D field" }]} onChange={next => { setDimension(next); onArenaViewChange?.(next === "2d" ? "lanes2d" : "3d"); }} /></View>
          {fieldContent}
        </SafeAreaView>
      </Modal> : fieldContent}
      {viewMode === "standings" ? (
        <View style={f.section}>
          <Text style={textStyle("caption")}>Ranked by this week's effort</Text>
          {ranked.map((lane) => (
            <Pressable
              key={lane.id}
              accessibilityRole="button"
              accessibilityLabel={`${lane.name}, place ${place(lane.values[2])}, ${lane.values[2].toFixed(1)} ${arena.unit}`}
              onPress={() => selectAthlete(lane.id)}
              style={[f.row, { minHeight: 48, paddingVertical: 6 }]}
            >
              <Text style={textStyle("caption")}>{place(lane.values[2])}</Text>
              <UserAvatar src={lane.avatarUrl} name={lane.name} size={36} fallback={<Svg width={26} height={36} viewBox="-40 -50 80 100">
                <PolishedRacer
                  x={0}
                  y={0}
                  you={lane.you}
                  gold={place(lane.values[2]) === 1}
                  showWake={false}
                />
              </Svg>} />
              <Text style={[textStyle("label"), f.grow]}>
                {lane.you ? selfLaneLabel(lane.name) : lane.name}
              </Text>
              <RankBadge score={scores.find(row => row.id === lane.id)?.elo} />
              <View style={{ alignItems: "flex-end" }}>
                <Text style={textStyle("label")}>
                  {lane.values[2].toFixed(1)} {arena.unit}
                </Text>
                <Text style={[textStyle("caption"), { color: c.ink }]}>
                  {scores.find((row) => row.id === lane.id)?.elo ?? "—"} effort
                  score
                </Text>
              </View>
            </Pressable>
          ))}
          {pastYou && <View style={[f.row, { minHeight: 48, borderTopWidth: 1, borderTopColor: c.line }]}><Text style={textStyle("body")}>Past you · unranked</Text><Text style={textStyle("label")}>{pastYou.values[2].toFixed(1)} {arena.unit}</Text></View>}
        </View>
      ) : null}
      <Text style={textStyle("caption")}>
        Accumulated effort, not live GPS positions. Practice fields may contain
        synthetic athletes.
      </Text>
    </View>
  );
}
