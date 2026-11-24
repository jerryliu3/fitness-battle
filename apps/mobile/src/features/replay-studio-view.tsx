import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import Svg, { Line, Path, Text as SvgText } from "react-native-svg";
import {
  OBSERVATORY_SPORTS,
  RACE_DISTANCES,
  RACE_METERS,
  buildCompiledReplayField,
  buildReplayCourseIndex,
  evaluateFieldDistances,
  formatEditionDisplay,
  raceClock,
  raceEventGroups,
  replayDistance,
  replayFeatures,
  replayFrameInterval,
  selectFieldRankSlice,
  validateReplayCourse,
  type CompiledReplayRunner,
  type ObservatorySportId,
  type RaceCoverage,
  type ReplayData,
} from "@fitness-battle/shared";
import { useAppTheme } from "../appearance";
import { useAuth } from "../lib/auth";
import {
  getCachedReplayField,
  loadAndCompileReplayField,
  replayScopeCacheKey,
} from "../lib/observatory-replay-cache";
import { useRaceFavorites } from "../lib/race-favorites";
import { createThemedStyles, useThemeColors, useThemedStyles } from "../theme";
import { AppIcon } from "../ui/app-icon";
import { CompeteSheet } from "../ui/compete-sheet";
import { CompetitionSheetHeight, useCompetitionSheetHeight } from "../ui/competition-sheet-height";
import { FocusSegments, FocusSheet } from "../ui/focus";
import { IconButton } from "../ui/icon-button";
import { MapHudBackdrop, useMapHud } from "../ui/map-hud";
import { RaceRouteArtNative, SplitSparklineNative } from "../ui/observatory-race-card";
import { ObservatorySportBar } from "../ui/observatory-sport-bar";
import { ReplayMap } from "../ui/race-replay-map";
import { SearchField } from "../ui/search-field";
import { AppText, chartTextProps, textStyle } from "../ui/section";
import { useReducedMotion } from "../ui/use-reduced-motion";
import { useSceneActive } from "../ui/use-scene-active";

type RunnerWithDistance = {
  runner: CompiledReplayRunner;
  distM: number;
  finished: boolean;
  finishMs: number;
};

function DuelAthleteCardNative({
  roleLabel,
  roleColor,
  entry,
  runners,
  excludeId,
  onSelect,
  onClear,
}: {
  roleLabel: string;
  roleColor: string;
  entry: RunnerWithDistance | null;
  runners: CompiledReplayRunner[];
  excludeId: number | null;
  onSelect: (id: number) => void;
  onClear: () => void;
}) {
  const c = useThemeColors();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/^#/, "");
    return runners
      .filter(r => r.id !== excludeId)
      .filter(r => {
        if (!q) return true;
        if (r.name.toLowerCase().includes(q)) return true;
        if (r.bib && r.bib.toLowerCase().includes(q)) return true;
        if (raceClock(r.splits.finishMs).includes(q)) return true;
        return false;
      })
      .slice(0, 20);
  }, [runners, excludeId, query]);

  return (
    <View
      style={[
        duelStyles.card,
        {
          borderColor: c.line,
          borderStyle: entry ? "solid" : "dashed",
          backgroundColor: entry ? c.paper : c.card,
        },
      ]}
    >
      <View style={duelStyles.cardTop}>
        <AppText role="nav" style={{ color: roleColor }}>
          ● {roleLabel}
        </AppText>
        {entry ? (
          <Pressable
            onPress={() => {
              onClear();
              setQuery("");
            }}
            hitSlop={8}
            style={[duelStyles.clearBtn, { backgroundColor: c.soft }]}
            accessibilityLabel={`Clear ${roleLabel}`}
          >
            <AppText role="nav">×</AppText>
          </Pressable>
        ) : null}
      </View>

      {entry ? (
        <>
          <AppText role="row" numberOfLines={1}>
            {entry.runner.name}
            {entry.runner.bib ? ` · #${entry.runner.bib}` : ""}
          </AppText>
          <AppText role="caption" secondary>
            {(entry.distM / 1000).toFixed(2)} km (est.) · Finish {raceClock(entry.finishMs)}
          </AppText>
        </>
      ) : (
        <AppText role="label" secondary>
          No athlete selected
        </AppText>
      )}

      <TextInput
        value={query}
        onFocus={() => setOpen(true)}
        onChangeText={t => {
          setQuery(t);
          setOpen(true);
        }}
        placeholder={entry ? "Search name or bib to switch…" : `Search ${roleLabel.toLowerCase()} by name or bib…`}
        placeholderTextColor={c.muted}
        style={[duelStyles.input, { borderColor: c.line, color: c.ink, backgroundColor: c.card }]}
      />

      {open ? (
        <View style={[duelStyles.dropdown, { borderColor: c.line, backgroundColor: c.card }]}>
          {filtered.length === 0 ? (
            <AppText role="caption" secondary style={{ padding: 10, textAlign: "center" }}>
              No matching athletes
            </AppText>
          ) : (
            <ScrollView style={{ maxHeight: 165 }} nestedScrollEnabled keyboardShouldPersistTaps="handled">
              {filtered.map(r => (
                <Pressable
                  key={r.id}
                  onPress={() => {
                    onSelect(r.id);
                    setQuery("");
                    setOpen(false);
                  }}
                  style={[duelStyles.option, { borderColor: c.line }]}
                >
                  <AppText role="caption" style={{ flex: 1 }} numberOfLines={1}>
                    {r.name}
                    {r.bib ? ` (#${r.bib})` : ""}
                  </AppText>
                  <AppText role="caption" secondary style={{ fontVariant: ["tabular-nums"] }}>
                    {raceClock(r.splits.finishMs)}
                  </AppText>
                </Pressable>
              ))}
            </ScrollView>
          )}
        </View>
      ) : null}
    </View>
  );
}

const duelStyles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    gap: 5,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  clearBtn: {
    width: 22,
    height: 22,
    borderRadius: 999,
    backgroundColor: "#e9eff2",
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    ...textStyle("caption"),
    marginTop: 4,
    height: 36,
    borderRadius: 999,
    borderWidth: 1,
    backgroundColor: "#ffffff",
    paddingHorizontal: 14,
  },
  dropdown: {
    marginTop: 4,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: "#ffffff",
    overflow: "hidden",
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: "#eef2f1",
  },
});

function cameraIconFor(mode: "field" | "follow" | "chase3d") {
  if (mode === "follow") return "navigationArrowFill" as const;
  if (mode === "chase3d") return "cubeFocus" as const;
  return "layers" as const;
}

function cameraLabelFor(mode: "field" | "follow" | "chase3d") {
  if (mode === "follow") return "Follow";
  if (mode === "chase3d") return "3D";
  return "Field";
}

function FullScreenReplayStage({
  editionKey,
  data,
  features,
  pinnedIds,
  cameraTargetId,
  cameraTargetEntry,
  cameraMode,
  timelineOrigin,
  time,
  runnersCount,
  wall,
  timelineWallAvailable,
  onSelectRunner,
  onToggleWall,
  onCycleCamera,
  onClose,
  onError,
  pinnedStrip,
  scrubberBar,
  sheetBody,
}: {
  editionKey: string;
  data: ReplayData;
  features: ReturnType<typeof replayFeatures>;
  pinnedIds: number[];
  cameraTargetId: number | null;
  cameraTargetEntry: RunnerWithDistance | null;
  cameraMode: "field" | "follow" | "chase3d";
  timelineOrigin: number | null;
  time: number;
  runnersCount: number;
  wall: boolean;
  timelineWallAvailable: boolean;
  onSelectRunner: (id: number) => void;
  onToggleWall: (nextWall: boolean) => void;
  onCycleCamera: () => void;
  onClose: () => void;
  onError: () => void;
  pinnedStrip: React.ReactNode;
  scrubberBar: React.ReactNode;
  sheetBody: React.ReactNode;
}) {
  const c = useThemeColors();
  const hud = useMapHud();
  const s = useThemedStyles(sThemes);
  const insets = useSafeAreaInsets();
  const { minimum: sheetMin } = useCompetitionSheetHeight();
  const pinnedBottom = Math.max(insets.bottom + 18, sheetMin) + 10;

  return (
    <SafeAreaView pointerEvents="box-none" style={s.fullScreenRoot} edges={[]}>
      <ReplayMap
        key={`full-${editionKey}`}
        course={data.course}
        features={features}
        tracked={pinnedIds}
        focused={cameraTargetId}
        profileId={null}
        profile={null}
        followId={cameraMode !== "field" ? cameraTargetEntry?.runner.id ?? null : null}
        tilted={cameraMode === "chase3d"}
        overlayTop={insets.top + 112}
        overlayBottom={pinnedIds.length > 0 ? pinnedBottom + 66 : Math.max(insets.bottom + 24, sheetMin) + 12}
        onSelect={onSelectRunner}
        onError={onError}
      />

      {/* Top HUD: Back button top-left, Clock & controls right-aligned */}
      <View style={[s.fullTopBar, { top: insets.top + 8 }]} pointerEvents="box-none">
        <IconButton glass icon="back" label="Close full screen replay" onPress={onClose} />

        <View style={s.fullTopRight} pointerEvents="box-none">
          <View style={[s.mapBadgeBase, hud.chrome]} pointerEvents="none">
            <MapHudBackdrop radius={12} />
            <AppText role="nav" style={{ color: hud.muted }}>
              {timelineOrigin !== null ? "TIME OF DAY" : "CHIP TIME"}
            </AppText>
            <AppText role="heading" style={{ color: hud.ink, fontVariant: ["tabular-nums"] }}>
              {timelineOrigin !== null ? new Date(timelineOrigin + time).toLocaleTimeString() : raceClock(time)}
            </AppText>
            <AppText role="nav" style={{ color: hud.muted }} numberOfLines={1}>
              {cameraTargetEntry
                ? `${(cameraTargetEntry.distM / 1000).toFixed(2)} km · ${cameraTargetEntry.runner.name}`
                : `${runnersCount} athletes`}
            </AppText>
          </View>

          <View style={s.fullTopBtns}>
            <View style={[s.hudToggleWrap, hud.chrome]}>
              <MapHudBackdrop radius={999} />
              <Pressable
                onPress={() => onToggleWall(false)}
                style={[s.clockToggleBtn, !wall && s.clockToggleBtnOn]}
              >
                <AppText role="nav" style={{ color: !wall ? c.textOnAction : hud.ink }}>
                  Chip
                </AppText>
              </Pressable>
              <Pressable
                disabled={!timelineWallAvailable}
                onPress={() => onToggleWall(true)}
                style={[s.clockToggleBtn, wall && s.clockToggleBtnOn, !timelineWallAvailable && { opacity: 0.38 }]}
              >
                <AppText role="nav" style={{ color: wall ? c.textOnAction : hud.ink }}>
                  Clock
                </AppText>
              </Pressable>
            </View>

            <Pressable
              onPress={onCycleCamera}
              style={[s.mapActionBtn, hud.chrome, cameraMode !== "field" && s.mapActionBtnActive]}
              accessibilityLabel={`Camera mode ${cameraLabelFor(cameraMode)}`}
            >
              {cameraMode === "field" ? <MapHudBackdrop radius={999} /> : null}
              <View style={s.inlineIconRow}>
                <AppIcon
                  name={cameraIconFor(cameraMode)}
                  size={14}
                  color={cameraMode !== "field" ? c.textOnAction : hud.ink}
                />
                <AppText role="nav" style={{ color: cameraMode !== "field" ? c.textOnAction : hud.ink }}>
                  {cameraLabelFor(cameraMode)}
                </AppText>
              </View>
            </Pressable>
          </View>
        </View>
      </View>

      {/* Pinned Athlete Overlay Strip Anchored Above CompeteSheet */}
      {pinnedStrip ? (
        <View style={[s.fullPinnedAnchor, { bottom: pinnedBottom }]} pointerEvents="box-none">
          {pinnedStrip}
        </View>
      ) : null}

      <CompeteSheet scrollable active expandRequest={0} defaultIndex={0} overview={scrubberBar}>
        {sheetBody}
      </CompeteSheet>
    </SafeAreaView>
  );
}

export function ReplayStudioView({
  initialEdition = "6",
  initialDistance = "marathon",
  initialSex = "all",
  initialIds = "",
  coverage,
  coursePreviews,
  active = true,
  onRequireAuth,
}: {
  initialEdition?: string;
  initialDistance?: string;
  initialSex?: string;
  initialIds?: string;
  coverage: RaceCoverage[] | null;
  coursePreviews: Record<string, [number, number][]>;
  active?: boolean;
  onRequireAuth: (action: "save" | "pin", target?: string) => void;
}) {
  const c = useThemeColors();
  const { mode: themeMode } = useAppTheme();
  const hud = useMapHud();
  const s = useThemedStyles(sThemes);
  const { user } = useAuth();
  const saved = useRaceFavorites();
  const sceneActive = useSceneActive();
  const reduced = useReducedMotion();

  const [sport, setSport] = useState<ObservatorySportId>("running");
  const [sportFormat, setSportFormat] = useState<string>(initialDistance || "marathon");
  const [editionId, setEditionId] = useState<number>(Number(initialEdition) || 6);
  const [distanceSlug, setDistanceSlug] = useState<string>(initialDistance || "marathon");
  const [category, setCategory] = useState<string>(initialSex || "all");
  const [ids, setIds] = useState<string | null>(initialIds ? initialIds : null);
  const [attempt, setAttempt] = useState(0);
  const [hideIneligible, setHideIneligible] = useState(false);

  // Sync incoming scope props (e.g., tapping ▶ on a race card in Observatory)
  useEffect(() => {
    const nextEd = Number(initialEdition) || 6;
    if (nextEd !== editionId) setEditionId(nextEd);
    if (initialDistance && initialDistance !== distanceSlug) {
      setDistanceSlug(initialDistance);
      setSportFormat(initialDistance);
    }
    if (initialIds) setIds(initialIds);
  }, [initialEdition, initialDistance, initialIds]);

  const activeSportObj = OBSERVATORY_SPORTS.find(sp => sp.id === sport) ?? OBSERVATORY_SPORTS[0];
  const isRunningSport = sport === "running";
  const distanceObj = useMemo(
    () => RACE_DISTANCES.find(d => d.slug === distanceSlug) ?? RACE_DISTANCES[3],
    [distanceSlug],
  );
  const storedDistance = distanceObj.stored;

  const allRaceEditions = useMemo(() => raceEventGroups(coverage ?? [], "all"), [coverage]);
  const visibleRaceEditions = useMemo(
    () => (isRunningSport ? allRaceEditions.filter(ed => ed.distance_slug === storedDistance) : []),
    [isRunningSport, allRaceEditions, storedDistance],
  );
  const activeRaceMeta = useMemo(
    () =>
      allRaceEditions.find(g => g.edition_id === editionId && g.distance_slug === storedDistance) ??
      allRaceEditions.find(g => g.edition_id === editionId) ??
      null,
    [allRaceEditions, editionId, storedDistance],
  );

  const [data, setData] = useState<ReplayData | null>(null);
  const [runners, setRunners] = useState<CompiledReplayRunner[]>([]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const abort = useRef<AbortController | null>(null);

  const [time, setTime] = useState(0);
  const [rankTime, setRankTime] = useState(0);
  const timeRef = useRef(0);
  const lastRankSyncRef = useRef(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(64);
  const [wall, setWall] = useState(false);
  const [includeWheelchair, setIncludeWheelchair] = useState(false);
  const [mapExpanded, setMapExpanded] = useState(false);
  const [seekWidth, setSeekWidth] = useState(200);
  const [expandedRunnerId, setExpandedRunnerId] = useState<number | null>(null);

  // Multi-athlete pinning + camera focus among pinned athletes
  const [cameraMode, setCameraMode] = useState<"field" | "follow" | "chase3d">("field");
  const [pinnedIds, setPinnedIds] = useState<number[]>([]);
  const [cameraTargetId, setCameraTargetId] = useState<number | null>(null);

  // Leaderboard & Duel
  const [replayMode, setReplayMode] = useState<"field" | "finish" | "duel">("field");
  const [duelPrimaryId, setDuelPrimaryId] = useState<number | null>(null);
  const [peerId, setPeerId] = useState<number | null>(null);
  const [runnerSearch, setRunnerSearch] = useState("");
  const [page, setPage] = useState(0);
  const [jumpText, setJumpText] = useState("1");
  const pageSize = 10;

  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerSearch, setPickerSearch] = useState("");

  useEffect(() => {
    if ((!active || !sceneActive || reduced) && playing) {
      setPlaying(false);
    }
  }, [active, sceneActive, reduced, playing]);

  // Fetch & precompile replay field with shared cache
  useEffect(() => {
    if (!isRunningSport) return;
    const cacheKey = replayScopeCacheKey(editionId, distanceSlug, category, ids, includeWheelchair);
    const cached = getCachedReplayField(cacheKey);
    if (cached && validateReplayCourse(cached.data.course, storedDistance)) {
      setData(cached.data);
      setRunners(cached.compiled);
      setBusy(false);
      setError("");
      return;
    }

    const controller = new AbortController();
    abort.current = controller;
    setBusy(true);
    setData(null);
    setRunners([]);
    setError("");
    setProgress(0);
    timeRef.current = 0;
    lastRankSyncRef.current = 0;
    setTime(0);
    setRankTime(0);
    setPlaying(false);
    setWall(false);

    void loadAndCompileReplayField({
      editionId,
      distanceSlug,
      sex: category,
      ids,
      includeWheelchair,
      signal: controller.signal,
      onProgress: setProgress,
    })
      .then(value => {
        if (!controller.signal.aborted) {
          if (!validateReplayCourse(value.data.course, storedDistance)) {
            throw new Error("Course alignment needs review.");
          }
          setData(value.data);
          setRunners(value.compiled);
        }
      })
      .catch(e => {
        if (!controller.signal.aborted) {
          setError(e instanceof Error ? e.message : "Replay unavailable.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setBusy(false);
      });

    return () => controller.abort();
  }, [isRunningSport, editionId, distanceSlug, category, ids, includeWheelchair, attempt, storedDistance]);

  useEffect(() => {
    if (!runners.length) {
      setPinnedIds([]);
      setCameraTargetId(null);
      setDuelPrimaryId(null);
      setPeerId(null);
      return;
    }
    const idSet = new Set(runners.map(r => r.id));
    setPinnedIds(prev => prev.filter(id => idSet.has(id)));
    setCameraTargetId(prev => (prev !== null && idSet.has(prev) ? prev : null));
    setDuelPrimaryId(prev => (prev !== null && idSet.has(prev) ? prev : null));
    setPeerId(prev => (prev !== null && idSet.has(prev) ? prev : null));
  }, [runners]);

  const courseIndex = useMemo(() => (data ? buildReplayCourseIndex(data.course) : null), [data]);
  const field = useMemo(() => buildCompiledReplayField(runners, wall), [runners, wall]);
  const timeline = useMemo(
    () => ({ wallAvailable: field.wallAvailable, origin: field.wallOrigin, duration: field.duration }),
    [field],
  );
  const features = useMemo(
    () =>
      data
        ? replayFeatures(data.course, runners, time, timeline.origin, courseIndex ?? undefined)
        : { type: "FeatureCollection" as const, features: [] },
    [data, runners, time, timeline.origin, courseIndex],
  );

  // Decoupled playback loop: throttled map updates + 4Hz leaderboard sorting
  useEffect(() => {
    if (!playing || !active || !sceneActive || reduced || timeline.duration <= 0) return;
    let rafId = 0;
    let previous = performance.now();
    let lastMapEmit = previous;
    const minMapFrameMs = replayFrameInterval(runners.length);

    const tick = (now: number) => {
      const dt = Math.min(now - previous, 100);
      previous = now;
      const nextTime = Math.min(timeline.duration, timeRef.current + dt * speed);
      timeRef.current = nextTime;
      const finished = nextTime >= timeline.duration;
      if (finished || now - lastMapEmit >= minMapFrameMs) {
        lastMapEmit = now;
        setTime(nextTime);
      }
      if (finished || now - lastRankSyncRef.current >= 250) {
        lastRankSyncRef.current = now;
        setRankTime(nextTime);
      }
      if (finished) {
        setPlaying(false);
        return;
      }
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [playing, active, sceneActive, reduced, speed, timeline.duration, runners.length]);

  const { rankDistances, leaderDistM } = useMemo(() => {
    const out = new Float32Array(field.count);
    const maxDist = evaluateFieldDistances(field, rankTime, out);
    return { rankDistances: out, leaderDistM: maxDist };
  }, [field, rankTime]);

  const entryForId = (id: number | null): RunnerWithDistance | null => {
    if (id === null) return null;
    const idx = field.idToIndex.get(id);
    if (idx === undefined) return null;
    const r = runners[idx];
    if (!r) return null;
    const raw = rankDistances[idx];
    const distM = raw >= 0 ? raw : 0;
    const effective = rankTime - field.startOffsetMs[idx];
    return { runner: r, distM, finished: effective >= field.finishMs[idx], finishMs: field.finishMs[idx] };
  };

  const pinnedEntries = useMemo(
    () => pinnedIds.map(id => entryForId(id)).filter((e): e is RunnerWithDistance => Boolean(e)),
    [pinnedIds, field, runners, rankDistances, rankTime],
  );

  const cameraTargetEntry = useMemo(
    () => entryForId(cameraTargetId),
    [cameraTargetId, field, runners, rankDistances, rankTime],
  );

  const duelPrimaryEntry = useMemo(
    () => entryForId(duelPrimaryId),
    [duelPrimaryId, field, runners, rankDistances, rankTime],
  );

  const peerEntry = useMemo(
    () => entryForId(peerId),
    [peerId, field, runners, rankDistances, rankTime],
  );

  const rankSliceResult = useMemo(() => {
    if (replayMode === "duel") return { total: field.count, indices: [] as number[] };
    return selectFieldRankSlice(field, rankDistances, replayMode, page * pageSize, pageSize, runnerSearch);
  }, [replayMode, field, rankDistances, page, pageSize, runnerSearch]);

  const totalPages = Math.max(1, Math.ceil(rankSliceResult.total / pageSize));
  const safePage = Math.max(0, Math.min(page, totalPages - 1));
  const pageSlice = useMemo<RunnerWithDistance[]>(() => {
    const slice =
      safePage === page
        ? rankSliceResult.indices
        : selectFieldRankSlice(
            field,
            rankDistances,
            replayMode === "finish" ? "finish" : "field",
            safePage * pageSize,
            pageSize,
            runnerSearch,
          ).indices;
    return slice.map(idx => {
      const raw = rankDistances[idx];
      const distM = raw >= 0 ? raw : 0;
      const effective = rankTime - field.startOffsetMs[idx];
      return {
        runner: runners[idx],
        distM,
        finished: effective >= field.finishMs[idx],
        finishMs: field.finishMs[idx],
      };
    });
  }, [safePage, page, rankSliceResult.indices, field, rankDistances, replayMode, pageSize, runnerSearch, runners, rankTime]);

  const fastestFinishMs = field.fastestFinishMs;

  const savedInFieldIds = useMemo(() => {
    const idSet = new Set(runners.map(r => r.id));
    return saved.ids.filter(id => idSet.has(id));
  }, [runners, saved.ids]);

  const allSavedPinned = useMemo(
    () => savedInFieldIds.length > 0 && savedInFieldIds.every(id => pinnedIds.includes(id)),
    [savedInFieldIds, pinnedIds],
  );

  function selectRaceEdition(nextEditionId: number, nextDistanceStored?: string) {
    const distObj = nextDistanceStored
      ? (RACE_DISTANCES.find(d => d.stored === nextDistanceStored) ?? distanceObj)
      : distanceObj;
    setEditionId(nextEditionId);
    setDistanceSlug(distObj.slug);
    setSportFormat(distObj.slug);
    setIds(null);
    setPage(0);
    setPickerOpen(false);
  }

  function togglePinRunner(id: number) {
    setPinnedIds(prev => {
      if (prev.includes(id)) {
        const next = prev.filter(x => x !== id);
        setCameraTargetId(curr => (curr === id ? (next[0] ?? null) : curr));
        if (next.length === 0) setCameraMode("field");
        return next;
      }
      setCameraTargetId(curr => curr ?? id);
      return [...prev, id];
    });
  }

  function toggleSavedResultsPinned() {
    if (user?.mode !== "supabase") {
      onRequireAuth("save", "your saved results");
      return;
    }
    if (!savedInFieldIds.length) return;
    setPinnedIds(prev => {
      if (allSavedPinned) {
        const removeSet = new Set(savedInFieldIds);
        const next = prev.filter(id => !removeSet.has(id));
        setCameraTargetId(curr => (curr !== null && removeSet.has(curr) ? (next[0] ?? null) : curr));
        if (next.length === 0) setCameraMode("field");
        return next;
      }
      setCameraTargetId(curr => curr ?? savedInFieldIds[0] ?? null);
      return Array.from(new Set([...prev, ...savedInFieldIds]));
    });
  }

  function cycleCameraMode() {
    if (cameraMode === "field") {
      if (cameraTargetId === null) {
        const topSlice = selectFieldRankSlice(field, rankDistances, "field", 0, 1);
        const topId = topSlice.indices.length > 0 ? field.ids[topSlice.indices[0]] : null;
        const firstTarget = pinnedIds[0] ?? topId;
        if (firstTarget !== null) {
          setCameraTargetId(firstTarget);
          if (!pinnedIds.includes(firstTarget)) setPinnedIds(prev => [...prev, firstTarget]);
        }
      }
      setCameraMode("follow");
    } else if (cameraMode === "follow") {
      setCameraMode("chase3d");
    } else {
      setCameraMode("field");
    }
  }

  const duelSeries = useMemo(() => {
    if (!duelPrimaryEntry || !peerEntry || timeline.duration <= 0) return null;
    const N = 64;
    const gapsM = Array.from({ length: N }, (_, idx) => {
      const t = (timeline.duration * idx) / (N - 1);
      return (replayDistance(duelPrimaryEntry.runner, t) ?? 0) - (replayDistance(peerEntry.runner, t) ?? 0);
    });
    const peak = Math.max(50, ...gapsM.map(Math.abs)) * 1.12;
    return { N, gapsM, peak };
  }, [duelPrimaryEntry?.runner, peerEntry?.runner, timeline.duration]);

  const seekToFraction = useCallback((locX: number) => {
    const frac = Math.max(0, Math.min(1, locX / Math.max(1, seekWidth)));
    const next = frac * timeline.duration;
    setPlaying(false);
    timeRef.current = next;
    lastRankSyncRef.current = performance.now();
    setTime(next);
    setRankTime(next);
  }, [seekWidth, timeline.duration]);

  const handleToggleWall = (nextWall: boolean) => {
    if (nextWall && !timeline.wallAvailable) return;
    if (nextWall === wall) return;
    setWall(nextWall);
    timeRef.current = 0;
    lastRankSyncRef.current = 0;
    setTime(0);
    setRankTime(0);
    setPlaying(false);
  };

  const pinnedStripEl =
    pinnedEntries.length > 0 ? (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8, paddingRight: 16 }}
      >
        {pinnedEntries.map(entry => {
          const isCamTarget = entry.runner.id === cameraTargetId;
          return (
            <Pressable
              key={entry.runner.id}
              onPress={() => {
                setCameraTargetId(entry.runner.id);
                if (cameraMode === "field") setCameraMode("follow");
              }}
              style={[s.pinnedCard, hud.chrome, isCamTarget && s.pinnedCardFocused]}
            >
              <MapHudBackdrop radius={12} />
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
                <AppText role="nav" numberOfLines={1} style={{ color: hud.ink, flex: 1 }}>
                  {entry.runner.name}
                </AppText>
                <Pressable
                  onPress={ev => {
                    ev.stopPropagation();
                    togglePinRunner(entry.runner.id);
                  }}
                  hitSlop={6}
                  style={s.pinnedClose}
                >
                  <AppText role="nav" style={{ color: hud.muted }}>×</AppText>
                </Pressable>
              </View>
              <AppText role="nav" style={{ color: hud.muted, fontVariant: ["tabular-nums"] }}>
                {entry.finished ? `Finished · ${raceClock(entry.finishMs)}` : `${(entry.distM / 1000).toFixed(2)} km`}
                {isCamTarget && cameraMode !== "field" ? " · Camera" : ""}
              </AppText>
            </Pressable>
          );
        })}
      </ScrollView>
    ) : null;

  const renderScrubberBar = (roundedLight = false) => (
    <View style={[s.scrubberBar, roundedLight && s.scrubberBarSheet]}>
      <IconButton
        icon={playing ? "pause" : "play"}
        label={playing ? "Pause replay" : "Play replay"}
        disabled={reduced || !runners.length}
        primary
        haptic={false}
        onPress={() => {
          if (timeRef.current >= timeline.duration) {
            timeRef.current = 0;
            lastRankSyncRef.current = 0;
            setTime(0);
            setRankTime(0);
          }
          setPlaying(v => !v);
        }}
      />

      <AppText role="caption" style={s.scrubTime}>{raceClock(time)}</AppText>

      <View
        onLayout={ev => setSeekWidth(Math.max(1, ev.nativeEvent.layout.width))}
        onStartShouldSetResponder={() => runners.length > 0}
        onResponderGrant={ev => seekToFraction(ev.nativeEvent.locationX)}
        onResponderMove={ev => seekToFraction(ev.nativeEvent.locationX)}
        style={s.scrubTouch}
      >
        <View pointerEvents="none" style={s.scrubTrack}>
          <View
            style={[
              s.scrubFill,
              { width: `${timeline.duration > 0 ? (time / timeline.duration) * 100 : 0}%` },
            ]}
          />
        </View>
      </View>

      <AppText role="caption" style={s.scrubTime}>{raceClock(timeline.duration)}</AppText>

      <Pressable
        onPress={() => setSpeed(sp => (sp === 64 ? 128 : sp === 128 ? 256 : sp === 256 ? 512 : 64))}
        style={s.speedBtn}
      >
        <AppText role="nav" style={{ color: c.ink, fontVariant: ["tabular-nums"] }}>
          {speed}×
        </AppText>
      </Pressable>
    </View>
  );

  const leaderboardBodyEl =
    data && runners.length > 0 ? (
      <View style={!mapExpanded ? s.panelCard : undefined}>
        <View style={[s.panelTop, mapExpanded && s.panelTopSheet]}>
          <FocusSegments
            compact
            label="Replay leaderboard mode"
            value={replayMode}
            options={[
              { value: "field", label: "Live order" },
              { value: "finish", label: "Finish order" },
              { value: "duel", label: "Head-to-head" },
            ]}
            onChange={nextMode => {
              if (nextMode === "duel") {
                if (duelPrimaryId === null && pinnedIds.length >= 1) setDuelPrimaryId(pinnedIds[0]);
                if (peerId === null && pinnedIds.length >= 2) setPeerId(pinnedIds[1]);
              } else {
                setPage(0);
              }
              setReplayMode(nextMode);
            }}
          />

          {replayMode !== "duel" ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <View style={{ flex: 1 }}>
                <SearchField
                  accessibilityLabel="Find runner or bib in replay"
                  placeholder="Find runner or bib…"
                  value={runnerSearch}
                  onChangeText={t => {
                    setRunnerSearch(t);
                    setPage(0);
                  }}
                />
              </View>
              <Pressable
                onPress={toggleSavedResultsPinned}
                style={[s.subtleChip, allSavedPinned && s.subtleChipActive]}
              >
                <View style={s.inlineIconRow}>
                  <AppIcon name="special" size={13} color={allSavedPinned ? c.card : c.muted} />
                  <AppText role="nav" style={{ color: allSavedPinned ? c.card : c.muted }}>
                    {allSavedPinned ? "Saved pinned" : "Saved results"}
                  </AppText>
                </View>
              </Pressable>
            </View>
          ) : null}
        </View>

        {replayMode !== "duel" ? (
          <View>
            {pageSlice.map((entry, idx) => {
              const rank = safePage * pageSize + idx + 1;
              const isPinned = pinnedIds.includes(entry.runner.id);
              const isExpanded = expandedRunnerId === entry.runner.id;
              const gapM = Math.max(0, leaderDistM - entry.distM);
              const gapLabel =
                rankTime > 0
                  ? entry.finished
                    ? entry.finishMs === fastestFinishMs
                      ? "Leader"
                      : `+${raceClock(entry.finishMs - fastestFinishMs)}`
                    : gapM < 5
                      ? "Leader"
                      : `−${Math.round(gapM).toLocaleString()} m`
                  : "";
              return (
                <View
                  key={entry.runner.id}
                  style={[
                    s.boardRow,
                    idx < pageSlice.length - 1 && !isExpanded && s.rowDivider,
                    isPinned && s.rowGoldAccent,
                  ]}
                >
                  <Pressable
                    onPress={() => setExpandedRunnerId(curr => (curr === entry.runner.id ? null : entry.runner.id))}
                    style={s.rowMain}
                  >
                    <AppText role="caption" secondary style={[s.placeCol, s.tabular]}>
                      {replayMode === "field" && rankTime === 0 ? "—" : `#${rank}`}
                    </AppText>
                    <AppText role="label" numberOfLines={1} style={{ flex: 1, minWidth: 0 }}>
                      {entry.runner.name}
                    </AppText>
                    <AppText role="caption" secondary style={s.tabular}>
                      {entry.finished ? raceClock(entry.finishMs) : `${(entry.distM / 1000).toFixed(1)}k`}
                    </AppText>
                    <Pressable
                      onPress={ev => {
                        ev.stopPropagation();
                        togglePinRunner(entry.runner.id);
                      }}
                      style={[s.miniBtn, isPinned && s.miniBtnActive]}
                    >
                      <AppText role="nav" style={{ color: isPinned ? c.textOnAction : c.ink }}>
                        {isPinned ? "Pinned" : "Pin"}
                      </AppText>
                    </Pressable>
                    <Pressable
                      onPress={ev => {
                        ev.stopPropagation();
                        if (duelPrimaryId === null) {
                          setDuelPrimaryId(entry.runner.id);
                        } else if (duelPrimaryId !== entry.runner.id) {
                          setPeerId(entry.runner.id);
                        }
                        setReplayMode("duel");
                      }}
                      style={s.miniBtn}
                    >
                      <AppText role="nav" style={{ color: c.ink }}>
                        Duel
                      </AppText>
                    </Pressable>
                  </Pressable>

                  {isExpanded ? (
                    <View style={s.runnerDrawer}>
                      <AppText role="caption" secondary style={s.tabular}>
                        {entry.finished ? `Finished · ${raceClock(entry.finishMs)}` : `${(entry.distM / 1000).toFixed(2)} km`}
                        {gapLabel ? ` · ${gapLabel}` : ""}
                        {entry.runner.bib ? ` · Bib #${entry.runner.bib}` : ""}
                      </AppText>
                      <SplitSparklineNative splits={entry.runner.splits} distanceSlug={storedDistance} />
                    </View>
                  ) : null}
                </View>
              );
            })}

            <View style={s.paginationRow}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Pressable
                  disabled={safePage === 0}
                  onPress={() => setPage(p => Math.max(0, p - 1))}
                  style={[s.pageBtn, safePage === 0 && { opacity: 0.4 }]}
                >
                  <AppText role="nav">‹</AppText>
                </Pressable>
                <AppText role="caption" secondary style={s.tabular}>
                  {safePage + 1} / {totalPages}
                </AppText>
                <Pressable
                  disabled={safePage >= totalPages - 1}
                  onPress={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                  style={[s.pageBtn, safePage >= totalPages - 1 && { opacity: 0.4 }]}
                >
                  <AppText role="nav">›</AppText>
                </Pressable>
              </View>

              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <TextInput
                  value={jumpText}
                  onChangeText={setJumpText}
                  keyboardType="number-pad"
                  style={s.jumpInput}
                  accessibilityLabel="Jump to replay page"
                />
                <Pressable
                  onPress={() => {
                    const raw = Number(jumpText);
                    if (Number.isFinite(raw)) {
                      const nextP = Math.max(0, Math.min(totalPages - 1, Math.floor(raw) - 1));
                      setPage(nextP);
                      setJumpText(String(nextP + 1));
                    }
                  }}
                  style={s.pageBtn}
                >
                  <AppText role="nav">Go</AppText>
                </Pressable>
              </View>
            </View>
          </View>
        ) : (
          <View style={s.duelBody}>
            <DuelAthleteCardNative
              roleLabel="Focus"
              roleColor="#C88A00"
              entry={duelPrimaryEntry}
              runners={runners}
              excludeId={peerId}
              onSelect={id => setDuelPrimaryId(id)}
              onClear={() => setDuelPrimaryId(null)}
            />

            <DuelAthleteCardNative
              roleLabel="Challenger"
              roleColor="#637482"
              entry={peerEntry}
              runners={runners}
              excludeId={duelPrimaryId}
              onSelect={id => setPeerId(id)}
              onClear={() => setPeerId(null)}
            />

            {duelPrimaryEntry && peerEntry && duelSeries ? (
              <>
                <View style={s.duelChartBox}>
                  {(() => {
                    const Lx = 18;
                    const Rx = 322;
                    const Ty = 22;
                    const By = 128;
                    const midY = 75;
                    const xAt = (i: number) => Lx + ((Rx - Lx) * i) / (duelSeries.N - 1);
                    const yAt = (v: number) => midY - (v / duelSeries.peak) * (By - Ty) * 0.45;
                    const pathD = duelSeries.gapsM
                      .map((v, i) => `${i === 0 ? "M" : "L"}${xAt(i).toFixed(1)} ${yAt(v).toFixed(1)}`)
                      .join(" ");
                    const cursorX =
                      Lx + ((Rx - Lx) * Math.max(0, Math.min(timeline.duration, time))) / Math.max(1, timeline.duration);
                    return (
                      <Svg width="100%" height={154} viewBox="0 0 340 154">
                        <Path d={`M${Lx} ${midY}H${Rx}`} stroke="#d0dad7" strokeWidth={1.3} strokeDasharray="4 4" />
                        <Path d={pathD} fill="none" stroke="#FFB800" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
                        <Line x1={cursorX} x2={cursorX} y1={18} y2={132} stroke="#142b3b" strokeDasharray="3 3" strokeWidth={1.6} />
                        <SvgText x={Lx} y={14} fill="#637482" {...chartTextProps("nav")}>
                          Estimated advantage · {duelPrimaryEntry.runner.name} vs {peerEntry.runner.name}
                        </SvgText>
                        <SvgText x={Lx} y={146} fill="#637482" {...chartTextProps("nav")}>Start</SvgText>
                        <SvgText x={Rx} y={146} fill="#637482" {...chartTextProps("nav")} textAnchor="end">Finish</SvgText>
                      </Svg>
                    );
                  })()}
                </View>

                {(() => {
                  const gapM = duelPrimaryEntry.distM - peerEntry.distM;
                  const aheadRunner = gapM >= 0 ? duelPrimaryEntry.runner : peerEntry.runner;
                  return (
                    <View style={s.duelMomentRow}>
                      <View style={{ flex: 1 }}>
                        <AppText role="label" style={s.tabular}>
                          {Math.abs(Math.round(gapM)).toLocaleString()} m
                        </AppText>
                        <AppText role="caption" secondary>
                          {Math.abs(gapM) < 2 ? "Estimated even right now" : `${aheadRunner.name} ahead (est.)`}
                        </AppText>
                      </View>
                      <Pressable
                        onPress={() => {
                          const f = duelPrimaryEntry.runner.id;
                          setDuelPrimaryId(peerEntry.runner.id);
                          setPeerId(f);
                        }}
                        style={s.miniBtn}
                      >
                        <AppText role="nav">⇄ Swap</AppText>
                      </Pressable>
                    </View>
                  );
                })()}
              </>
            ) : null}
          </View>
        )}
      </View>
    ) : null;

  return (
    <ScrollView contentContainerStyle={s.scrollContent} keyboardShouldPersistTaps="handled">
      {/* Shared Top Sport / Distance / Category Filter Bar */}
      <View style={s.filterCard}>
        <ObservatorySportBar
          sport={sport}
          onSportChange={nextSport => {
            if (nextSport === sport) return;
            const targetObj = OBSERVATORY_SPORTS.find(sp => sp.id === nextSport) ?? OBSERVATORY_SPORTS[0];
            setSport(nextSport);
            setSportFormat(nextSport === "running" ? distanceSlug : targetObj.formats[0].value);
          }}
          format={isRunningSport ? distanceSlug : sportFormat}
          onFormatChange={nextVal => {
            if (isRunningSport) {
              if (nextVal === distanceSlug) return;
              setDistanceSlug(nextVal);
              setSportFormat(nextVal);
              const nextStored = RACE_DISTANCES.find(d => d.slug === nextVal)?.stored;
              const match = allRaceEditions.find(ed => ed.distance_slug === nextStored);
              if (match) setEditionId(match.edition_id);
              setIds(null);
              setPage(0);
            } else {
              setSportFormat(nextVal);
            }
          }}
          sex={category}
          onSexChange={nextSex => {
            setCategory(nextSex);
            setPage(0);
          }}
        />
        {isRunningSport ? (
          <View style={{ marginTop: 10, flexDirection: "row", alignItems: "center" }}>
            <Pressable
              accessibilityRole="checkbox"
              accessibilityLabel="Include wheelchair division"
              accessibilityState={{ checked: includeWheelchair }}
              onPress={() => {
                setIncludeWheelchair(v => !v);
                setPage(0);
              }}
              style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
            >
              <View style={[s.checkbox, includeWheelchair && s.checkboxChecked]}>
                {includeWheelchair ? <AppText role="nav" style={{ color: "#ffffff" }}>✓</AppText> : null}
              </View>
              <AppText role="caption" secondary>Include wheelchair</AppText>
            </Pressable>
          </View>
        ) : null}
      </View>

      {!isRunningSport ? (
        <View style={s.emptyCard}>
          <AppText role="heading">No published {activeSportObj.label} replays yet</AppText>
          <AppText role="caption" secondary>
            Select Running to watch published marathon, half marathon, 10K, and 5K course replays.
          </AppText>
        </View>
      ) : (
        <>
          {/* Choose a Race Carousel with GPS Course Outlines + Hide Ineligible Toggle */}
          <View style={{ gap: 10 }}>
            <View style={s.sectionHead}>
              <AppText role="heading">Choose a race</AppText>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: hideIneligible }}
                  onPress={() => setHideIneligible(v => !v)}
                  style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
                >
                  <View style={[s.checkbox, hideIneligible && s.checkboxChecked]}>
                    {hideIneligible ? <AppText role="nav" style={{ color: "#ffffff" }}>✓</AppText> : null}
                  </View>
                  <AppText role="caption" secondary>Hide ineligible</AppText>
                </Pressable>
                <Pressable
                  onPress={() => {
                    setPickerSearch("");
                    setPickerOpen(true);
                  }}
                >
                  <AppText role="field" style={{ color: c.muted }}>
                    View all ↗
                  </AppText>
                </Pressable>
              </View>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.carousel}>
              {(visibleRaceEditions.length > 0 ? visibleRaceEditions : allRaceEditions)
                .filter(ed => {
                  if (!hideIneligible) return true;
                  const pts = coursePreviews[`${ed.edition_id}:${ed.distance_slug}`];
                  return Boolean(pts && pts.length >= 2);
                })
                .map(ed => {
                  const isActive = ed.edition_id === editionId && ed.distance_slug === storedDistance;
                  const distLabel = RACE_DISTANCES.find(d => d.stored === ed.distance_slug)?.label ?? ed.distance_slug;
                  const coursePts = coursePreviews[`${ed.edition_id}:${ed.distance_slug}`] ?? null;
                  const hasGps = Boolean(coursePts && coursePts.length >= 2);
                  return (
                    <Pressable
                      key={`${ed.edition_id}:${ed.distance_slug}`}
                      disabled={!hasGps}
                      onPress={() => hasGps && selectRaceEdition(ed.edition_id, ed.distance_slug)}
                      style={[
                        s.raceCard,
                        isActive && s.raceCardActive,
                        !hasGps && { opacity: 0.6 },
                      ]}
                    >
                      <RaceRouteArtNative eventName={ed.event_name} year={ed.edition_year} coursePoints={coursePts} compact />
                      <View style={s.raceCardFoot}>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <AppText role="field" numberOfLines={1}>
                            {formatEditionDisplay(ed.event_name, ed.edition_year)}
                          </AppText>
                          <AppText role="caption" secondary>{distLabel}</AppText>
                        </View>
                        <View style={[s.watchPill, isActive && s.watchPillActive]}>
                          <View style={s.inlineIconRow}>
                            {hasGps ? (
                              <AppIcon name="play" size={11} color={isActive ? c.textOnAction : c.ink} />
                            ) : null}
                            <AppText role="nav" style={{ color: isActive ? c.textOnAction : c.ink }}>
                              {!hasGps ? "No GPS map" : isActive ? "Watching" : "Watch"}
                            </AppText>
                          </View>
                        </View>
                      </View>
                    </Pressable>
                  );
                })}
            </ScrollView>
          </View>

          {/* Theme-matched Replay Map Shell */}
          <View style={s.replayShell}>
            <View style={s.replayHead}>
              <AppText role="label" numberOfLines={1} style={s.replayTitle}>
                {activeRaceMeta ? formatEditionDisplay(activeRaceMeta.event_name, activeRaceMeta.edition_year) : `Edition #${editionId}`} · {distanceObj.label}
              </AppText>
              <View style={s.clockToggle}>
                <Pressable
                  onPress={() => handleToggleWall(false)}
                  style={[s.clockToggleBtn, !wall && s.clockToggleBtnOn]}
                >
                  <AppText role="caption" style={[s.clockToggleText, !wall && s.clockToggleTextOn]}>
                    Chip time
                  </AppText>
                </Pressable>
                <Pressable
                  disabled={!timeline.wallAvailable}
                  onPress={() => handleToggleWall(true)}
                  style={[s.clockToggleBtn, wall && s.clockToggleBtnOn, !timeline.wallAvailable && { opacity: 0.38 }]}
                >
                  <AppText role="caption" style={[s.clockToggleText, wall && s.clockToggleTextOn]}>
                    Time of day
                  </AppText>
                </Pressable>
              </View>
            </View>

            {/* Map Stage (rendered in modal when expanded so only 1 Mapbox view stays active) */}
            <View style={[s.mapStage, { height: 370 }]}>
              {data && !mapExpanded ? (
                <ReplayMap
                  key={`inline-${editionId}-${storedDistance}`}
                  course={data.course}
                  features={features}
                  tracked={pinnedIds}
                  focused={cameraTargetId}
                  profileId={null}
                  profile={null}
                  followId={cameraMode !== "field" ? cameraTargetEntry?.runner.id ?? null : null}
                  tilted={cameraMode === "chase3d"}
                  overlayTop={74}
                  overlayBottom={pinnedEntries.length > 0 ? 78 : 18}
                  onSelect={togglePinRunner}
                  onError={() => setPlaying(false)}
                />
              ) : !data ? (
                <View style={s.mapStatus}>
                  {busy ? (
                    <>
                      <ActivityIndicator color={c.tennis} />
                      <AppText role="caption" secondary>
                        Loading {progress.toLocaleString()} timing profiles…
                      </AppText>
                    </>
                  ) : (
                    <>
                      <AppText role="body" style={{ textAlign: "center" }}>
                        {error || "Course unavailable"}
                      </AppText>
                      <Pressable onPress={() => setAttempt(n => n + 1)} style={s.watchPillActive}>
                        <AppText role="nav" style={{ color: c.textOnAction }}>Retry</AppText>
                      </Pressable>
                    </>
                  )}
                </View>
              ) : null}

              {/* Floating Top-Left Clock + Athlete Readout */}
              {data ? (
                <View style={[s.inlineMapBadge, hud.chrome]} pointerEvents="none">
                  <MapHudBackdrop radius={10} />
                  <AppText role="nav" style={{ color: hud.muted }}>
                    {timeline.origin !== null ? "TIME OF DAY" : "CHIP TIME"}
                  </AppText>
                  <AppText role="heading" style={{ color: hud.ink, fontVariant: ["tabular-nums"] }}>
                    {timeline.origin !== null ? new Date(timeline.origin + time).toLocaleTimeString() : raceClock(time)}
                  </AppText>
                  <AppText role="nav" style={{ color: hud.muted }} numberOfLines={1}>
                    {cameraTargetEntry
                      ? `${(cameraTargetEntry.distM / 1000).toFixed(2)} km · ${cameraTargetEntry.runner.name}`
                      : `${runners.length} athletes`}
                  </AppText>
                </View>
              ) : null}

              {/* Floating Top-Right Camera & Full-Screen Expand Controls */}
              {data ? (
                <View style={s.mapActions}>
                  <Pressable
                    onPress={cycleCameraMode}
                    style={[s.mapActionBtn, hud.chrome, cameraMode !== "field" && s.mapActionBtnActive]}
                    accessibilityLabel={`Camera mode ${cameraLabelFor(cameraMode)}`}
                  >
                    {cameraMode === "field" ? <MapHudBackdrop radius={999} /> : null}
                    <View style={s.inlineIconRow}>
                      <AppIcon
                        name={cameraIconFor(cameraMode)}
                        size={14}
                        color={cameraMode !== "field" ? c.textOnAction : hud.ink}
                      />
                      <AppText role="nav" style={{ color: cameraMode !== "field" ? c.textOnAction : hud.ink }}>
                        {cameraLabelFor(cameraMode)}
                      </AppText>
                    </View>
                  </Pressable>
                  <IconButton
                    glass
                    icon="expand"
                    label="Expand map to full screen"
                    onPress={() => setMapExpanded(true)}
                  />
                </View>
              ) : null}

              {/* Horizontal Pinned Athlete Overlay Cards */}
              {pinnedStripEl ? <View style={s.pinnedStrip}>{pinnedStripEl}</View> : null}
            </View>

            {renderScrubberBar(false)}
          </View>

          {!mapExpanded ? leaderboardBodyEl : null}

          {/* Full-Screen Modal reusing CompeteSheet + Floating Overlays */}
          <Modal
            visible={mapExpanded && data !== null}
            animationType={reduced ? "none" : "fade"}
            presentationStyle="fullScreen"
            onRequestClose={() => setMapExpanded(false)}
          >
            <CompetitionSheetHeight>
              <SafeAreaProvider>
                <StatusBar style={themeMode === "dark" ? "light" : "dark"} />
                {data ? (
                  <FullScreenReplayStage
                    editionKey={`${editionId}-${storedDistance}`}
                    data={data}
                    features={features}
                    pinnedIds={pinnedIds}
                    cameraTargetId={cameraTargetId}
                    cameraTargetEntry={cameraTargetEntry}
                    cameraMode={cameraMode}
                    timelineOrigin={timeline.origin}
                    time={time}
                    runnersCount={runners.length}
                    wall={wall}
                    timelineWallAvailable={timeline.wallAvailable}
                    onSelectRunner={togglePinRunner}
                    onToggleWall={handleToggleWall}
                    onCycleCamera={cycleCameraMode}
                    onClose={() => setMapExpanded(false)}
                    onError={() => setPlaying(false)}
                    pinnedStrip={pinnedStripEl}
                    scrubberBar={renderScrubberBar(true)}
                    sheetBody={leaderboardBodyEl}
                  />
                ) : null}
              </SafeAreaProvider>
            </CompetitionSheetHeight>
          </Modal>
        </>
      )}

      {/* View All Races Modal Sheet */}
      <FocusSheet open={pickerOpen} title="Choose a race to replay" onClose={() => setPickerOpen(false)}>
        <View style={{ gap: 10 }}>
          <SearchField
            accessibilityLabel="Search race editions"
            placeholder="Search race or year…"
            value={pickerSearch}
            onChangeText={setPickerSearch}
          />
          {allRaceEditions
            .filter(ed => `${ed.event_name} ${ed.edition_year}`.toLowerCase().includes(pickerSearch.trim().toLowerCase()))
            .filter(ed => {
              if (!hideIneligible) return true;
              const pts = coursePreviews[`${ed.edition_id}:${ed.distance_slug}`];
              return Boolean(pts && pts.length >= 2);
            })
            .map(ed => {
              const isActive = ed.edition_id === editionId && ed.distance_slug === storedDistance;
              const distLabel = RACE_DISTANCES.find(d => d.stored === ed.distance_slug)?.label ?? ed.distance_slug;
              const pts = coursePreviews[`${ed.edition_id}:${ed.distance_slug}`];
              const hasGps = Boolean(pts && pts.length >= 2);
              return (
                <View key={`${ed.edition_id}:${ed.distance_slug}`} style={[s.modalRow, isActive && s.modalRowActive]}>
                  <View style={{ flex: 1 }}>
                    <AppText role="label">{formatEditionDisplay(ed.event_name, ed.edition_year)}</AppText>
                    <AppText role="caption" secondary>
                      {distLabel} · {ed.published_count.toLocaleString()} finishes
                    </AppText>
                  </View>
                  <Pressable
                    disabled={!hasGps}
                    onPress={() => selectRaceEdition(ed.edition_id, ed.distance_slug)}
                    style={[s.watchPill, isActive && s.watchPillActive, !hasGps && { opacity: 0.45 }]}
                  >
                    <View style={s.inlineIconRow}>
                      {hasGps ? (
                        <AppIcon name="play" size={11} color={isActive ? c.textOnAction : c.ink} />
                      ) : null}
                      <AppText role="nav" style={{ color: isActive ? c.textOnAction : c.ink }}>
                        {!hasGps ? "No GPS map" : isActive ? "Watching" : "Replay"}
                      </AppText>
                    </View>
                  </Pressable>
                </View>
              );
            })}
        </View>
      </FocusSheet>
    </ScrollView>
  );
}

const sThemes = createThemedStyles(c => ({
  scrollContent: {
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 34,
    gap: 14,
  },
  filterCard: {
    borderRadius: 18,
    backgroundColor: c.card,
    borderWidth: 1,
    borderColor: c.line,
    paddingBottom: 6,
  },
  emptyCard: {
    padding: 24,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: c.line,
    backgroundColor: c.card,
    gap: 6,
  },
  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 2,
  },
  inlineIconRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  checkbox: {
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: c.muted,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: c.card,
  },
  checkboxChecked: {
    backgroundColor: c.ink,
    borderColor: c.ink,
  },
  carousel: {
    gap: 12,
    paddingRight: 4,
  },
  raceCard: {
    width: 246,
    borderRadius: 18,
    backgroundColor: c.card,
    borderWidth: 1.5,
    borderColor: c.line,
    overflow: "hidden",
  },
  raceCardActive: {
    borderColor: c.tennis,
    shadowColor: c.tennis,
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  raceCardFoot: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    padding: 11,
  },
  watchPill: {
    height: 30,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: c.line,
    backgroundColor: c.card,
    alignItems: "center",
    justifyContent: "center",
  },
  watchPillActive: {
    height: 30,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: c.tennis,
    borderWidth: 1,
    borderColor: c.tennis,
    alignItems: "center",
    justifyContent: "center",
  },
  replayShell: {
    backgroundColor: c.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: c.line,
    overflow: "hidden",
  },
  replayHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderColor: c.line,
    backgroundColor: c.card,
  },
  replayTitle: {
    ...textStyle("label"),
    color: c.ink,
    flex: 1,
  },
  clockToggle: {
    flexDirection: "row",
    backgroundColor: c.soft,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: c.line,
    padding: 2,
    gap: 2,
  },
  hudToggleWrap: {
    flexDirection: "row",
    borderRadius: 999,
    backgroundColor: "rgba(20, 20, 19, 0.72)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.16)",
    padding: 3,
    gap: 2,
    overflow: "hidden",
  },
  clockToggleBtn: {
    height: 28,
    paddingHorizontal: 10,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  clockToggleBtnOn: {
    backgroundColor: c.tennis,
  },
  clockToggleText: {
    ...textStyle("nav"),
    color: c.muted,
  },
  clockToggleTextOn: {
    color: c.textOnAction,
  },
  mapStage: {
    width: "100%",
    backgroundColor: c.paper,
    position: "relative",
    overflow: "hidden",
  },
  mapStatus: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: 20,
  },
  mapBadgeBase: {
    borderRadius: 12,
    backgroundColor: "rgba(20, 20, 19, 0.72)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.16)",
    paddingHorizontal: 11,
    paddingVertical: 7,
    maxWidth: 210,
    alignItems: "flex-end",
    overflow: "hidden",
  },
  inlineMapBadge: {
    position: "absolute",
    top: 10,
    left: 10,
    borderRadius: 10,
    backgroundColor: "rgba(20, 20, 19, 0.72)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.16)",
    paddingHorizontal: 10,
    paddingVertical: 7,
    maxWidth: 185,
    overflow: "hidden",
  },
  mapActions: {
    position: "absolute",
    top: 10,
    right: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  mapActionBtn: {
    height: 36,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: "rgba(20, 20, 19, 0.72)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.16)",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  mapActionBtnActive: {
    backgroundColor: c.tennis,
    borderColor: c.tennis,
  },
  pinnedStrip: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 12,
    maxHeight: 54,
  },
  pinnedCard: {
    width: 156,
    borderRadius: 12,
    backgroundColor: "rgba(20, 20, 19, 0.76)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.18)",
    paddingHorizontal: 10,
    paddingVertical: 7,
    gap: 2,
    overflow: "hidden",
  },
  pinnedCardFocused: {
    borderColor: c.tennis,
  },
  pinnedClose: {
    width: 18,
    height: 18,
    borderRadius: 999,
    backgroundColor: c.soft,
    alignItems: "center",
    justifyContent: "center",
  },
  scrubberBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: c.card,
    borderTopWidth: 1,
    borderColor: c.line,
  },
  scrubTime: {
    ...textStyle("nav"),
    color: c.muted,
    fontVariant: ["tabular-nums"],
  },
  scrubTouch: {
    flex: 1,
    height: 32,
    justifyContent: "center",
  },
  scrubTrack: {
    height: 5,
    borderRadius: 999,
    backgroundColor: c.line,
    overflow: "hidden",
  },
  scrubFill: {
    height: 5,
    borderRadius: 999,
    backgroundColor: c.tennis,
  },
  speedBtn: {
    height: 30,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: c.line,
    backgroundColor: c.soft,
    alignItems: "center",
    justifyContent: "center",
  },
  panelCard: {
    borderRadius: 18,
    backgroundColor: c.card,
    borderWidth: 1,
    borderColor: c.line,
    overflow: "hidden",
  },
  panelTop: {
    padding: 12,
    gap: 10,
    backgroundColor: c.paper,
    borderBottomWidth: 1,
    borderColor: c.line,
  },
  subtleChip: {
    height: 34,
    paddingHorizontal: 11,
    borderRadius: 999,
    backgroundColor: c.card,
    borderWidth: 1,
    borderColor: c.line,
    alignItems: "center",
    justifyContent: "center",
  },
  subtleChipActive: {
    backgroundColor: c.ink,
    borderColor: c.ink,
  },
  boardRow: {
    backgroundColor: c.card,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 6,
  },
  rowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: c.line,
  },
  rowGoldAccent: {
    borderLeftWidth: 3,
    borderLeftColor: c.tennis,
  },
  rowMain: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  placeCol: {
    ...textStyle("nav"),
    width: 34,
  },
  miniBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: c.line,
    backgroundColor: c.card,
  },
  miniBtnActive: {
    backgroundColor: c.tennis,
    borderColor: c.tennis,
  },
  paginationRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderTopWidth: 1,
    borderColor: c.line,
  },
  pageBtn: {
    height: 30,
    paddingHorizontal: 11,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: c.line,
    backgroundColor: c.card,
    alignItems: "center",
    justifyContent: "center",
  },
  jumpInput: {
    ...textStyle("caption"),
    width: 48,
    height: 30,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: c.line,
    backgroundColor: c.card,
    textAlign: "center",
    color: c.ink,
  },
  duelBody: {
    padding: 14,
    gap: 12,
  },
  duelChartBox: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: c.line,
    backgroundColor: c.soft,
    overflow: "hidden",
    paddingVertical: 4,
  },
  duelMomentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  modalRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: c.line,
    backgroundColor: c.card,
  },
  modalRowActive: {
    backgroundColor: c.soft,
    borderColor: c.tennis,
  },
  fullScreenRoot: {
    flex: 1,
    backgroundColor: c.paper,
  },
  fullTopBar: {
    position: "absolute",
    left: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
    zIndex: 20,
  },
  fullTopRight: {
    flex: 1,
    alignItems: "flex-end",
    gap: 6,
  },
  fullTopBtns: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  fullPinnedAnchor: {
    position: "absolute",
    left: 12,
    right: 12,
    zIndex: 20,
  },
  scrubberBarSheet: {
    borderRadius: 16,
    borderWidth: 1,
  },
  panelTopSheet: {
    backgroundColor: "transparent",
    paddingHorizontal: 0,
    paddingTop: 0,
  },
  runnerDrawer: {
    marginTop: 6,
    paddingTop: 8,
    paddingLeft: 42,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: c.line,
    gap: 6,
  },
  tabular: {
    fontVariant: ["tabular-nums"],
  },
}));
