import { PortraitField } from "../ui/portrait-field";
import {
  portraitField,
  portraitFieldGap,
  arenaBaselineStorageKey,
  arenaFieldHigh,
  clampCourseCenter,
  fieldDefaultSpan,
  buildArenaModel,
  competePeriodWindow,
  formatArenaOvertakeStatus,
  initialsFromName,
  readArenaBaseline,
  reconcileArenaOvertake,
  selfLaneLabel,
  serializeArenaBaseline,
  shellTabFromPath,
  stepArenaOvertake,
  weeklyBoard,
  type ArenaOvertakePlan,
  type ArenaSceneLane,
  type ScoreTrack,
  type SportId,
} from "@fitness-battle/shared";
import { usePathname } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import Svg from "react-native-svg";
import { useCompeteStore } from "../lib/compete-store";
import { playCue } from "../lib/haptics";
import { SHELL_COLORS as c } from "../theme";
import { FocusSegments, f } from "../ui/focus";
import { LaneTrack } from "../ui/lane-track";
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
}: {
  sport: SportId;
  track: ScoreTrack;
}) {
  const { state, accountKey, readBaselineItem, writeBaselineItem } =
    useCompeteStore();
  const pathname = usePathname();
  const [appearance, setAppearance] = useFieldAppearance(accountKey, sport);
  const isFocused = shellTabFromPath(pathname)?.id === "arena";
  const [dimension, setDimension] = useState<"2d" | "3d">("2d");
  const [mode, setMode] = useState<"lanes" | "standings">("lanes");
  const [center, setCenter] = useState<number | null>(null);
  const [span, setSpan] = useState<number | null>(null);
  const ghost = true;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [overtakePlan, setOvertakePlan] = useState<ArenaOvertakePlan | null>(
    null,
  );
  const [overtakeProgress, setOvertakeProgress] = useState(1);
  const [replayEpoch, setReplayEpoch] = useState(0);
  const lastSignatureRef = useRef<string | null>(null);
  const pendingBaselineRef = useRef<{ key: string; snapshot: string } | null>(
    null,
  );
  const reduceMotion = useReducedMotion();

  const arena = useMemo(
    () => (state ? buildArenaModel(state, undefined, track, sport) : null),
    [state, track, sport],
  );
  const defaultSpan = fieldDefaultSpan(arena?.unit ?? "km");
  const viewSpan = span ?? defaultSpan;
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

  useEffect(() => {
    if (!isFocused) {
      setMode("lanes");
      return;
    }
    if (!state || !arena?.optedIn || fieldLanes.length === 0) {
      setOvertakePlan(null);
      setOvertakeProgress(1);
      return;
    }
    const periodStart = competePeriodWindow(
      state,
      undefined,
      arena.sportId,
    ).startsAt.toISOString();
    const key = arenaBaselineStorageKey(accountKey, arena.sportId, track);
    const scopeKey = `${key}:${periodStart}:${arena.unit}`;
    const signature = `${scopeKey}|${fieldLanes
      .map((lane) => `${lane.id}:${lane.value.toFixed(3)}`)
      .join(",")}`;
    if (lastSignatureRef.current === signature) return;
    lastSignatureRef.current = signature;

    const previous = readArenaBaseline(
      readBaselineItem(key),
      periodStart,
      arena.unit,
    );
    const snapshot = serializeArenaBaseline(
      periodStart,
      fieldLanes,
      arena.unit,
    );
    const plan = reconcileArenaOvertake(fieldLanes, previous);
    if (pendingBaselineRef.current) {
      writeBaselineItem(
        pendingBaselineRef.current.key,
        pendingBaselineRef.current.snapshot,
      );
      pendingBaselineRef.current = null;
    }
    if (!plan) {
      writeBaselineItem(key, snapshot);
      setOvertakePlan(null);
      setOvertakeProgress(1);
      return;
    }
    setCenter(null);
    setMode("lanes");
    setOvertakePlan(plan);
    if (reduceMotion) {
      writeBaselineItem(key, snapshot);
      setOvertakeProgress(1);
      setReplayEpoch(0);
      return;
    }
    pendingBaselineRef.current = { key, snapshot };
    setOvertakeProgress(0);
    setReplayEpoch((n) => n + 1);
  }, [
    accountKey,
    arena?.optedIn,
    arena?.sportId,
    arena?.unit,
    fieldLanes,
    isFocused,
    readBaselineItem,
    state,
    track,
    writeBaselineItem,
    reduceMotion,
  ]);

  useEffect(() => {
    if (!overtakePlan || replayEpoch === 0) return;
    if (reduceMotion || !isFocused || mode !== "lanes") {
      if (pendingBaselineRef.current) {
        writeBaselineItem(
          pendingBaselineRef.current.key,
          pendingBaselineRef.current.snapshot,
        );
        pendingBaselineRef.current = null;
      }
      setOvertakeProgress(1);
      return;
    }
    let raf = 0;
    const start = Date.now();
    const duration = overtakePlan.durationMs;
    const tick = () => {
      const next = Math.min(1, (Date.now() - start) / duration);
      setOvertakeProgress(next);
      if (next >= 1 && pendingBaselineRef.current) {
        writeBaselineItem(
          pendingBaselineRef.current.key,
          pendingBaselineRef.current.snapshot,
        );
        pendingBaselineRef.current = null;
      }
      if (next < 1) {
        raf = requestAnimationFrame(tick);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [
    overtakePlan,
    replayEpoch,
    reduceMotion,
    writeBaselineItem,
    isFocused,
    mode,
  ]);

  const overtakeFrame = useMemo(
    () =>
      overtakePlan && overtakeProgress < 1
        ? stepArenaOvertake(overtakePlan, overtakeProgress, viewSpan)
        : null,
    [overtakePlan, overtakeProgress, viewSpan],
  );

  const overtakeStatus = useMemo(
    () =>
      overtakePlan && arena
        ? formatArenaOvertakeStatus(overtakePlan, overtakeFrame, arena.unit)
        : null,
    [arena, overtakeFrame, overtakePlan],
  );

  if (!state || !arena) return null;

  const displayTotal = overtakeFrame ? overtakeFrame.youValue : total;
  const view = {
    center: clampCourseCenter(
      center ?? (overtakeFrame ? overtakeFrame.viewCenter : total),
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
  const pastYou = arena.lanes.find((lane) => lane.ghost);
  const selected = arena.lanes.find((lane) => lane.id === selectedId);
  return (
    <View style={{ gap: 14 }}>
      <View style={f.row}>
        <View style={f.grow}>
          <Text style={f.kicker}>Accumulated this week</Text>
          <Text
            style={[f.massive, { fontSize: 34, fontFamily: "DMSans_700Bold" }]}
          >
            {displayTotal.toFixed(1)} <Text style={f.copy}>{arena.unit}</Text>
          </Text>
        </View>
        <View style={{ alignItems: "center", gap: 2 }}>
          <Text style={f.h2}>
            {overtakeFrame?.currentRank ?? place(total)} / {ranked.length}
          </Text>
          <Text style={f.small}>your place</Text>
        </View>
      </View>
      {overtakePlan && overtakeStatus ? (
        <Text style={f.rowTitle} accessibilityLiveRegion="polite">
          {overtakeStatus.headline}
          {overtakeStatus.detail ? ` · ${overtakeStatus.detail}` : ""}
        </Text>
      ) : null}
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

      {dimension === "3d" && mode === "lanes" && isFocused ? (
        <PortraitField
          lanes={arena.lanes.map((l) => ({
            ...l,
            initials: initialsFromName(l.name),
            value: overtakeFrame?.laneValues[l.id] ?? l.values[2],
          }))}
          view={view}
          unit={arena.unit}
          onZoom={setSpan}
          onSelect={selectAthlete}
        />
      ) : null}
      <View
        style={{
          display: mode === "lanes" && dimension === "2d" ? "flex" : "none",
        }}
      >
        <FieldGroundPicker appearance={appearance} onChange={setAppearance} />
        <View style={{ position: "relative" }}>
          <LaneTrack
            topInset={44}
            appearance={appearance}
            active={isFocused && mode === "lanes" && dimension === "2d"}
            selectedId={selectedId ?? me?.id}
            lanes={arena.lanes}
            unit={arena.unit}
            showGhost={ghost}
            index={2}
            onSelect={(lane) => selectAthlete(lane.id)}
            view={view}
            onPan={setCenter}
            overtakeFrame={overtakeFrame}
            overtakePlan={overtakePlan}
          />
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              top: 54,
              left: 12,
              right: 12,
              flexDirection: "row",
              justifyContent: "space-between",
              gap: 8,
              padding: 10,
              borderRadius: 12,
              backgroundColor: "#102e38ed",
            }}
          >
            <Text style={[f.small, { color: "white" }]}>
              {overtakeFrame?.currentRank ?? place(total)} / {ranked.length}{" "}
              PLACE
            </Text>
            <Text
              style={[f.small, { color: "white", fontSize: 10, flexShrink: 1 }]}
            >
              {portraitFieldGap(
                portraitField(fieldLanes, view).nextGap,
                arena.unit,
              )}
            </Text>
          </View>
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
                setSpan(
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
              <Text style={{ color: "white", fontSize: 24 }}>−</Text>
            </Pressable>
            <Text style={[f.small, { color: "white" }]}>Zoom</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Zoom in"
              disabled={view.span <= 0.5}
              onPress={() => setSpan(Math.max(0.5, view.span / 1.5))}
              style={{
                minWidth: 44,
                minHeight: 44,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ color: "white", fontSize: 24 }}>＋</Text>
            </Pressable>
          </View>
        </View>
        <FieldOverview
          lanes={arena.lanes.map((l) => ({
            ...l,
            initials: initialsFromName(l.name),
            value: overtakeFrame?.laneValues[l.id] ?? l.values[2],
          }))}
          view={view}
          unit={arena.unit}
          onNavigate={(value) => {
            setCenter(value);
            if (appearance.ground === "oval")
              setSpan(Math.min(view.span, fieldDefaultSpan(arena.unit) / 2));
          }}
        />
      </View>
      {mode === "standings" ? (
        <View style={f.card}>
          <Text style={f.small}>Ranked by this week's effort</Text>
          {ranked.map((lane) => (
            <Pressable
              key={lane.id}
              accessibilityRole="button"
              accessibilityLabel={`${lane.name}, place ${place(lane.values[2])}, ${lane.values[2].toFixed(1)} ${arena.unit}`}
              onPress={() => selectAthlete(lane.id)}
              style={[f.row, { minHeight: 48, paddingVertical: 6 }]}
            >
              <Text style={f.small}>{place(lane.values[2])}</Text>
              <Svg width={26} height={36} viewBox="-40 -50 80 100">
                <PolishedRacer
                  x={0}
                  y={0}
                  you={lane.you}
                  gold={place(lane.values[2]) === 1}
                  showWake={false}
                />
              </Svg>
              <Text style={[f.rowTitle, f.grow]}>
                {lane.you ? selfLaneLabel(lane.name) : lane.name}
              </Text>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={f.rowTitle}>
                  {lane.values[2].toFixed(1)} {arena.unit}
                </Text>
                <Text style={[f.small, { color: c.ink }]}>
                  {scores.find((row) => row.id === lane.id)?.elo ?? "—"} effort
                  score
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
      ) : null}
      <Text style={f.small}>
        Accumulated effort, not live GPS positions. Practice fields may contain
        synthetic athletes.
      </Text>
    </View>
  );
}
