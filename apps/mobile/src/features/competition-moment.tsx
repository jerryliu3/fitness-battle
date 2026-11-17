import { createThemedStyles, useThemedStyles, useThemeColors } from "../theme";
import { startActivePlayback } from "../ui/active-playback";
import { useCompetitionCourse } from "./use-competition-course";
import { GeographicCourse } from "./geographic-course";
import { CompetitionPanel } from "./competition-panel";
import { RaceUpdates } from "./race-updates";
import { StandingsList } from "./standings-list";
import { AthleteProfileSheet, type AthleteProfileSelection } from "./athlete-profile-sheet";
import { CompeteSheet } from "../ui/compete-sheet";
import { IconButton } from "../ui/icon-button";
import { FieldViewSwitcher } from "../ui/field-view-switcher";
import { CompeteTimeSeriesChart } from "../ui/compete-time-series-chart";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  DEMO_RACE_COURSE,
  competitionMomentProgressSummary,
  competitionMomentScene,
  competitionTrack,
  competePeriodWindow,
  defaultCompeteFieldView,
  normalizeCompeteFieldView,
  formatArenaValue,
  type FieldViewDimension,
  nextCompetitionReplaySpeed,
  weeklyBoard,
  type ArenaLane,
  type RaceCourse,
  type CompetitionMoment as Moment,
} from "@fitness-battle/shared";
import { useAthleteBlocks } from "../lib/athlete-blocks";
import { useCompeteStore } from "../lib/compete-store";
import { useFieldAppearance } from "../ui/field-course";
import { LaneTrack } from "../ui/lane-track";
import { useReducedMotion } from "../ui/use-reduced-motion";
import { AppText, textStyle } from "../ui/section";
import { AppIcon } from "../ui/app-icon";
import { FocusButton, useFocusStyles } from "../ui/focus";
import { playCue, playPattern } from "../lib/haptics";

const ignore = () => {};

export function CompetitionMoment({
  moment,
  remaining,
  onConfirm,
  debug = false,
  embedded = false,
  practice = false,
  onOvertakeCountChange,
  onBack,
  dimension = defaultCompeteFieldView(moment.sport),
  course = null,
  autoStart = true,
}: {
  moment: Moment;
  remaining: number;
  onConfirm: () => void;
  debug?: boolean;
  embedded?: boolean;
  practice?: boolean;
  onOvertakeCountChange?: (count: number) => void;
  onBack?: () => void;
  dimension?: FieldViewDimension;
  course?: RaceCourse | null;
  autoStart?: boolean;
}) {
  const c = useThemeColors();
  const f = useFocusStyles();
  const styles = useThemedStyles(stylesThemes);
  const { accountKey, state } = useCompeteStore();
  const period = state ? competePeriodWindow(state, undefined, moment.sport) : null;
  const { blocks } = useAthleteBlocks();
  const hiddenIds = useMemo(() => blocks.map((block) => block.id), [blocks]);
  const [appearance] = useFieldAppearance(accountKey, moment.sport);
  const insets = useSafeAreaInsets();
  const [height, setHeight] = useState(0);
  const reduced = useReducedMotion();
  const [viewDimension, setViewDimension] = useState<FieldViewDimension>(() =>
    normalizeCompeteFieldView(moment.sport, dimension),
  );
  useEffect(() => setViewDimension(normalizeCompeteFieldView(moment.sport, dimension)), [dimension, moment.sport]);
  const chooseView = (next: FieldViewDimension) => {
    setViewDimension(normalizeCompeteFieldView(moment.sport, next));
  };
  const [courseOptions, setCourseOptions] = useState<ReactNode>(null);
  const [profileAthlete, setProfileAthlete] = useState<AthleteProfileSelection | null>(null);
  const assigned = useCompetitionCourse(
    moment.sport,
    moment.periodStart ?? period?.startsAt.toISOString() ?? "",
    moment.periodEnd ?? period?.endsAt.toISOString() ?? "",
    debug,
    !course && viewDimension === "4d",
  );
  const [sceneReady, setSceneReady] = useState(false);
  useEffect(() => setSceneReady(false), [viewDimension]);

  const [progress, setProgress] = useState(reduced ? 1 : 0);
  const [playing, setPlaying] = useState(autoStart);
  const [speed, setSpeed] = useState(1);
  const [replayGeneration, setReplayGeneration] = useState(0);
  const previousCount = useRef(0);
  const confirmed = useRef(false);
  const progressRef = useRef(reduced ? 1 : 0);
  const lastReduced = useRef(reduced);
  progressRef.current = progress;
  const passedBy = !moment.plan.hasOvertake && Boolean(moment.plan.passedByIds?.length);
  const count = passedBy ? moment.plan.passedByIds?.length ?? 0 : moment.plan.overtakenIds.length;
  useEffect(() => {
    if (lastReduced.current !== reduced) {
      lastReduced.current = reduced;
      progressRef.current = 0;
      setProgress(0);
    }
    if (reduced) {
      setProgress(1);
      return;
    }
    if (!playing || progressRef.current >= 1 || (viewDimension === "4d" && !sceneReady)) return;
    const from = progressRef.current;
    const duration = ((6500 + count * 2200) * (embedded ? 1.5 : 1)) / speed;
    return startActivePlayback(duration * (1 - from), (next) => setProgress(from + (1 - from) * next));
  }, [moment.id, reduced, count, playing, speed, embedded, viewDimension, sceneReady, replayGeneration]);

  const stopHaptics = useRef<() => void>(() => {});
  useEffect(() => () => stopHaptics.current(), [moment.id]);
  const frame = competitionMomentScene(moment, progress);
  const summary = competitionMomentProgressSummary(moment, frame);
  useEffect(() => { onOvertakeCountChange?.(frame.count); }, [frame.count, onOvertakeCountChange]);
  useEffect(() => {
    if (frame.count > previousCount.current && !passedBy) {
      const soleLead = frame.rank === 1 && frame.lanes.every((lane) => lane.you || lane.value < frame.youValue);
      if (reduced) stopHaptics.current = playPattern("confirm");
      else if (soleLead) stopHaptics.current = playPattern("lead");
      else if (count > 1 && frame.count === count) stopHaptics.current = playPattern("combo");
      else void playCue("light");
    }
    previousCount.current = frame.count;
  }, [frame.count, frame.rank, count, passedBy, reduced]);

  const lanes: ArenaLane[] = frame.lanes.map((lane) => ({
    ...lane,
    you: Boolean(lane.you),
    ghost: false,
    values: [lane.value, lane.value, lane.value],
  }));
  const scores = useMemo(
    () => (state ? weeklyBoard(state, moment.sport, competitionTrack(moment.sport)) : []),
    [state, moment.sport],
  );
  const continueLabel = remaining > 1 ? `Continue (${remaining - 1} more)` : "Continue";
  const confirm = () => {
    if (!confirmed.current) {
      confirmed.current = true;
      onConfirm();
    }
  };
  const ended = progress >= 1;
  const playbackIcon = ended ? "replay" : playing ? "pause" : "play";
  const playbackLabel = ended ? "Replay" : playing ? "Pause replay" : "Play replay";
  const togglePlayback = () => {
    if (ended) {
      previousCount.current = 0;
      progressRef.current = 0;
      stopHaptics.current();
      setProgress(0);
      setPlaying(true);
      setReplayGeneration((value) => value + 1);
      return;
    }
    if (playing) stopHaptics.current();
    setPlaying((value) => !value);
  };

  const progressChip = practice && frame.count === 0 ? null : (
    <View
      pointerEvents="none"
      style={[
        styles.progressChip,
        summary.tone === "gain" && { borderColor: c.actionPrimary },
      ]}
    >
      <Text numberOfLines={1} style={{ ...textStyle("label"), color: c.ink, flexShrink: 1 }}>
        {practice ? "You passed Alex!" : summary.headline}
      </Text>
      {!practice && summary.overtakeLabel ? (
        <View style={[styles.overtakeBadge, { backgroundColor: c.actionSoft }]}>
          <Text style={{ ...textStyle("caption"), color: c.ink }}>{summary.overtakeLabel}</Text>
        </View>
      ) : null}
    </View>
  );

  const actionRow = (
    <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
      {onBack && <IconButton icon="back" label="Back" onPress={onBack} />}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={playbackLabel}
        onPress={togglePlayback}
        style={({ pressed }) => [
          f.button,
          f.secondary,
          styles.playbackButton,
          pressed && { opacity: 0.78 },
        ]}
      >
        <AppIcon name={playbackIcon} size={20} color={c.ink} />
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Playback speed ${speed} times`}
        onPress={() => setSpeed(nextCompetitionReplaySpeed)}
        style={({ pressed }) => [
          f.button,
          f.secondary,
          styles.speedButton,
          pressed && { opacity: 0.78 },
        ]}
      >
        <Text style={{ ...textStyle("label"), color: c.ink, fontVariant: ["tabular-nums"] }}>
          {speed}×
        </Text>
      </Pressable>
      <View style={{ flex: 1 }}>
        <FocusButton label={practice ? "Continue" : continueLabel} onPress={confirm} />
      </View>
    </View>
  );

  const overlayControls =
    courseOptions ?? (
      <FieldViewSwitcher
        value={viewDimension}
        event={moment.sport}
        onChange={chooseView}
      />
    );

  return (
    <View style={{ flex: 1 }}>
      <View
        onLayout={(e) => setHeight(e.nativeEvent.layout.height)}
        style={StyleSheet.absoluteFill}
        pointerEvents="box-none"
      >
        {viewDimension === "graph" && state ? (
          <CompeteTimeSeriesChart
            state={state}
            sport={moment.sport}
            track={competitionTrack(moment.sport)}
            selectedId={moment.plan.youId}
            momentReplay={{ moment, progress }}
            hiddenIds={hiddenIds}
            immersive
            hideHeader={practice}
            topInset={practice ? 150 : embedded ? 56 : insets.top}
            bottomInset={embedded ? 0 : insets.bottom}
            viewportHeight={height || undefined}
            active
          />
        ) : null}
        {viewDimension === "4d" ? (
          <GeographicCourse
            cardSessionKey={replayGeneration}
            course={course ?? assigned.course ?? (debug ? DEMO_RACE_COURSE : null)}
            error={assigned.error}
            onRetry={assigned.retry}
            hiddenIds={hiddenIds}
            onReady={() => setSceneReady(true)}
            replay={frame}
            optionsTop={null}
            onOptionsChange={embedded ? undefined : setCourseOptions}
            onChoose2D={embedded ? undefined : () => chooseView("2d")}
            overlaysHidden={!practice}
            lanes={frame.lanes}
            unit={moment.unit}
            selectedId={moment.plan.youId}
            focusRequest={0}
            onSelect={ignore}
          />
        ) : viewDimension === "2d" ? (
          height > 0 && (
            <LaneTrack
              replayFocusIds={frame.replayFocusIds}
              hiddenIds={hiddenIds}
              fullscreen
              focusOnMount
              followSelected
              animateSelection={false}
              appearance={appearance}
              height={height}
              lanes={lanes}
              unit={moment.unit}
              showGhost={false}
              selectedId={moment.plan.youId}
              index={2}
              onSelect={ignore}
              view={frame.view}
            />
          )
        ) : null}
      </View>

      {overlayControls ? (
        <View style={{ position: "absolute", top: practice ? 140 : embedded ? 12 : insets.top + 54, right: 16, zIndex: 20 }}>
          {overlayControls}
        </View>
      ) : null}

      <View
        pointerEvents="box-none"
        style={{
          position: "absolute",
          top: practice ? 150 : embedded ? 12 : insets.top + 8,
          left: 16,
          right: 16,
          alignItems: "center",
          gap: 6,
          zIndex: 10,
        }}
      >
        {!embedded && (
          <View style={styles.topLabelWrap}>
            <View style={styles.sportPill}>
              <AppIcon name={moment.sport} size={14} color={c.ink} />
              <AppText role="caption">{summary.sportLabel}</AppText>
            </View>
          </View>
        )}
        {progressChip}
      </View>

      {!reduced && frame.passEffects.length > 0 && (
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: "45%",
            alignSelf: "center",
            opacity: Math.max(...frame.passEffects.map((pass) => pass.strength)),
          }}
        >
          <Text style={{ ...textStyle("hero"), color: c.tennis }}>+1</Text>
        </View>
      )}

      {embedded ? (
        <View
          pointerEvents="box-none"
          style={{ position: "absolute", bottom: 16 + insets.bottom, left: 16, right: 16, alignItems: "center" }}
        >
          <View style={{ width: "100%", maxWidth: 420 }}>
            {actionRow}
          </View>
        </View>
      ) : (
        <CompeteSheet
          active
          expandRequest={0}
          defaultIndex={0}
          overview={actionRow}
        >
          <CompetitionPanel
            active
            standings={
              <StandingsList
                ranked={frame.ranked}
                hiddenIds={hiddenIds}
                unit={moment.unit}
                scores={scores}
                onOpenProfile={(lane, rank) =>
                  setProfileAthlete({
                    id: lane.id,
                    name: lane.name,
                    avatarUrl: lane.avatarUrl,
                    you: lane.you,
                    score: scores.find((row) => row.id === lane.id)?.elo,
                    contextLabel: "This round",
                    contextValue: formatArenaValue(lane.value, moment.unit),
                    contextDetail: `Place ${rank} · ${moment.sport}`,
                  })
                }
              />
            }
            activity={(visible) =>
              state ? <RaceUpdates state={state} sport={moment.sport} active={visible} moment={moment} revealCount={frame.done ? undefined : frame.count} /> : null
            }
          />
        </CompeteSheet>
      )}
      {!embedded && (
        <AthleteProfileSheet athlete={profileAthlete} onClose={() => setProfileAthlete(null)} />
      )}
    </View>
  );
}

const stylesThemes = createThemedStyles((themeColors) => {
  const c = themeColors;
  return {
    topLabelWrap: {
      minHeight: 34,
      paddingHorizontal: 56,
      justifyContent: "center",
      alignItems: "center",
    },
    sportPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderRadius: 999,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.line,
    },
    progressChip: {
      alignSelf: "center",
      marginHorizontal: 56,
      maxWidth: 236,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: c.card,
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderWidth: 1,
      borderColor: c.line,
    },
    overtakeBadge: {
      flexShrink: 0,
      borderRadius: 999,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    playbackButton: {
      width: 52,
      paddingHorizontal: 0,
    },
    speedButton: {
      width: 56,
      paddingHorizontal: 0,
    },
  };
});
