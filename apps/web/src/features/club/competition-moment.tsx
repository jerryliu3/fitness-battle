"use client";

import { colors as appearanceColors } from "@/theme/app-colors";
import { typographyStyle } from "@/ui/section";
import { Sheet } from "@/ui/sheet";
import { RankAvatar } from "@/ui/rank-symbol";
import { SportActivityIcon } from "@/ui/sport-activity-icon";
import { useCompetitionCourse } from "@/features/course/use-competition-course";
import { GeographicCourse } from "@/features/course/geographic-course";
import { FieldViewSwitcher } from "@/features/field/components/field-view-switcher";
import { CompeteTimeSeriesChart } from "@/features/field/components/compete-time-series-chart";
import { StandingsList, type StandingsRowItem } from "@/features/field/components/standings-list";
import { CompeteSheet } from "@/features/arena/compete-sheet";
import { CompetitionPanel } from "@/features/arena/competition-panel";
import { RaceUpdates } from "@/features/arena/race-updates";
import { useCompete } from "@/components/compete-context";
import { useEffect, useMemo, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import {
  APP_ICON_PATHS,
  DEMO_RACE_COURSE,
  competitionMomentProgressSummary,
  competitionMomentScene,
  competitionTrack,
  competePeriodWindow,
  defaultCompetitionMomentView,
  isGeographicCompete,
  normalizeCompeteFieldView,
  arenaValueDecimals,
  type FieldViewDimension,
  nextCompetitionReplaySpeed,
  rankSymbolForScore,
  weeklyBoard,
  type RaceCourse,
  type CompetitionMoment as Moment,
} from "@fitness-battle/shared";
import { ArenaLanes } from "@/features/focus/arena-lanes";
import { useFieldAppearance } from "@/features/field/components/field-course";
import { useAuth } from "@/components/auth-context";
import { playCue } from "@/lib/haptics";

const ignore = () => {};

export function CompetitionMoment({
  moment,
  remaining,
  onConfirm,
  debug = false,
  embedded = false,
  dimension = defaultCompetitionMomentView(moment.sport),
  course = null,
  autoStart = true,
}: {
  moment: Moment;
  remaining: number;
  onConfirm: () => void;
  debug?: boolean;
  embedded?: boolean;
  dimension?: FieldViewDimension;
  course?: RaceCourse | null;
  autoStart?: boolean;
}) {
  const { user } = useAuth();
  const { state } = useCompete();
  const period = state ? competePeriodWindow(state, undefined, moment.sport) : null;
  const [appearance] = useFieldAppearance(user?.id ?? "guest", moment.sport);
  const reduced = useReducedMotion();
  const geographic = isGeographicCompete(moment.sport);
  const track = competitionTrack(moment.sport);
  const [viewDimension, setViewDimension] = useState<FieldViewDimension>(() =>
    normalizeCompeteFieldView(moment.sport, dimension),
  );
  useEffect(() => setViewDimension(normalizeCompeteFieldView(moment.sport, dimension)), [dimension, moment.sport]);
  const chooseView = (next: FieldViewDimension) => {
    setViewDimension(normalizeCompeteFieldView(moment.sport, next));
  };
  const assigned = useCompetitionCourse(
    moment.sport,
    moment.periodStart ?? period?.startsAt.toISOString() ?? "",
    moment.periodEnd ?? period?.endsAt.toISOString() ?? "",
    debug,
    !course && viewDimension === "4d",
  );
  const [sceneReady, setSceneReady] = useState(false);
  useEffect(() => setSceneReady(false), [viewDimension]);
  const [playing, setPlaying] = useState(autoStart);
  const [speed, setSpeed] = useState(1);
  const [replayGeneration, setReplayGeneration] = useState(0);
  const [progress, setProgress] = useState(reduced ? 1 : 0);
  const [profileAthlete, setProfileAthlete] = useState<{
    lane: StandingsRowItem;
    rank: number;
    elo?: number;
  } | null>(null);
  const previousCount = useRef(0);
  const confirmed = useRef(false);
  const progressRef = useRef(reduced ? 1 : 0);
  const lastReduced = useRef(reduced);
  progressRef.current = progress;

  const passedBy = !moment.plan.hasOvertake && Boolean(moment.plan.passedByIds?.length);
  const count = passedBy ? (moment.plan.passedByIds?.length ?? 0) : moment.plan.overtakenIds.length;

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
    let raf = 0;
    const from = progressRef.current;
    const start = performance.now();
    const duration = ((4200 + count * 1150) * (embedded ? 1.5 : 1) * (1 - from)) / speed;
    const tick = (now: number) => {
      const p = from + (1 - from) * Math.min(1, (now - start) / Math.max(duration, 1));
      setProgress(p);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [moment.id, reduced, count, playing, speed, embedded, viewDimension, sceneReady, replayGeneration]);

  const frame = competitionMomentScene(moment, progress);
  const summary = competitionMomentProgressSummary(moment, frame);

  const scoreMap = useMemo(
    () =>
      state
        ? Object.fromEntries(
            weeklyBoard(state, moment.sport, competitionTrack(moment.sport)).map((row) => [
              row.id,
              row.elo,
            ]),
          )
        : {},
    [state, moment.sport],
  );

  useEffect(() => {
    if (frame.count > previousCount.current && !passedBy && !reduced) void playCue("success");
    previousCount.current = frame.count;
  }, [frame.count, passedBy, reduced]);

  const confirm = () => {
    if (confirmed.current) return;
    confirmed.current = true;
    onConfirm();
  };

  const ended = progress >= 1;
  const playbackIcon = ended ? "replay" : playing ? "pause" : "play";
  const playbackLabel = ended ? "Replay" : playing ? "Pause replay" : "Play replay";
  const togglePlayback = () => {
    if (ended) {
      previousCount.current = 0;
      progressRef.current = 0;
      setProgress(0);
      setPlaying(true);
      setReplayGeneration((value) => value + 1);
      return;
    }
    setPlaying((value) => !value);
  };

  const continueLabel = remaining > 1 ? `Continue (${remaining - 1} more)` : "Continue";
  const overviewControls = (
    <div className="moment-replay-overview">
      <div className="moment-replay-overview-actions">
        <button
          type="button"
          className="fb-btn-line moment-replay-playback-btn"
          aria-label={playbackLabel}
          onClick={togglePlayback}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d={APP_ICON_PATHS[playbackIcon]} />
          </svg>
        </button>
        <button
          type="button"
          className="fb-btn-line moment-replay-speed-btn"
          aria-label={`Playback speed ${speed} times`}
          onClick={() => setSpeed(nextCompetitionReplaySpeed)}
        >
          {speed}×
        </button>
        <button type="button" className="fb-btn" onClick={confirm}>
          {continueLabel}
        </button>
      </div>
    </div>
  );

  return (
    <div
      style={
        embedded
          ? { position: "relative", height: 600, overflow: "hidden", borderRadius: 20 }
          : undefined
      }
      className="moment-replay"
      aria-label="Field movement replay"
    >
      <div className="moment-replay-field">
        {viewDimension === "graph" && state ? (
          <CompeteTimeSeriesChart
            state={state}
            sport={moment.sport}
            track={track}
            selectedId={moment.plan.youId}
            immersive
            timelineFraction={progress}
            active
          />
        ) : null}
        {viewDimension === "4d" ? (
          <GeographicCourse
            cardSessionKey={replayGeneration}
            course={course ?? assigned.course ?? (debug ? DEMO_RACE_COURSE : null)}
            error={assigned.error}
            onRetry={assigned.retry}
            onReady={() => setSceneReady(true)}
            replay={frame}
            lanes={frame.lanes}
            unit={moment.unit}
            selectedId={moment.plan.youId}
            focusRequest={0}
            onSelect={ignore}
          />
        ) : viewDimension === "2d" ? (
          <ArenaLanes
            playback
            replayFocusIds={frame.replayFocusIds}
            immersive
            focusOnMount
            followSelected
            lanes={frame.lanes}
            appearance={appearance}
            view={frame.view}
            unit={moment.unit}
            selected={moment.plan.youId}
            onSelect={ignore}
            onPan={ignore}
          />
        ) : null}
      </div>

      {!embedded ? (
        <div className="compete-field-options">
          <FieldViewSwitcher
            value={viewDimension}
            event={moment.sport}
            onChange={chooseView}
          />
        </div>
      ) : null}

      <header
        className="moment-replay-top"
        style={embedded ? { top: 12 } : undefined}
      >
        {!embedded ? (
          <div className="moment-replay-sport-pill">
            <SportActivityIcon sport={moment.sport} size={14} />
            <span style={typographyStyle("caption")}>{summary.sportLabel}</span>
          </div>
        ) : null}
        <div className="moment-replay-chip" data-tone={summary.tone}>
          <strong className="moment-replay-chip-headline" style={typographyStyle("label")}>
            {summary.headline}
          </strong>
          {summary.overtakeLabel ? (
            <span className="moment-replay-overtake-badge" style={typographyStyle("caption")}>
              {summary.overtakeLabel}
            </span>
          ) : null}
        </div>
      </header>

      {!reduced && frame.passEffects.length > 0 ? (
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            top: "45%",
            left: "50%",
            transform: "translateX(-50%)",
            ...typographyStyle("hero"),
            color: appearanceColors.actionPrimary,
            opacity: Math.max(...frame.passEffects.map((pass) => pass.strength)),
            pointerEvents: "none",
          }}
        >
          +1
        </div>
      ) : null}

      {embedded ? (
        <footer className="moment-replay-embedded-footer">{overviewControls}</footer>
      ) : (
        <CompeteSheet active overview={overviewControls}>
          <CompetitionPanel
            active
            standings={
              <StandingsList
                ranked={frame.ranked}
                unit={moment.unit}
                scores={scoreMap}
                onOpenProfile={(lane, rank) =>
                  setProfileAthlete({ lane, rank, elo: scoreMap[lane.id] })
                }
              />
            }
            activity={(visible) =>
              state ? <RaceUpdates state={state} sport={moment.sport} active={visible} moment={moment} revealCount={frame.done ? undefined : frame.count} /> : null
            }
          />
        </CompeteSheet>
      )}

      {!embedded ? (
        <Sheet
          open={Boolean(profileAthlete)}
          title={profileAthlete?.lane.name ?? "Athlete"}
          body=""
          onClose={() => setProfileAthlete(null)}
        >
          {profileAthlete ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 12,
                padding: "16px 0",
              }}
            >
              <RankAvatar
                rank={rankSymbolForScore(profileAthlete.elo)}
                src={profileAthlete.lane.avatarUrl}
                name={profileAthlete.lane.name}
                size={112}
              />
              <p>
                {profileAthlete.lane.value.toFixed(arenaValueDecimals(moment.unit))} {moment.unit}{" "}
                this round
              </p>
              <p>{profileAthlete.elo ?? "—"} effort score</p>
            </div>
          ) : null}
        </Sheet>
      ) : null}
    </div>
  );
}
