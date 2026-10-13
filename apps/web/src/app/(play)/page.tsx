"use client";

import { AuthPrompt } from "@/components/auth-gate";
import { useAuth } from "@/components/auth-context";
import { useCompete } from "@/components/compete-context";
import { BrandArt } from "@/features/evolution-lab/brand-art";
import { Ace } from "@/features/rally/ace";
import { ActivityRing } from "@/features/rally/activity-ring";
import {
  ActivityReceipt,
  RallyDetailDialog,
} from "@/features/rally/detail-dialog";
import { Matchup } from "@/features/rally/matchup";
import { buildRallyBoard, type RallyMove } from "@/features/rally/model";
import { useRallyWeek } from "@/features/rally/use-rally-week";
import { useTheme } from "@/theme/theme-provider";
import { CheckpointControl } from "@/features/split/components/checkpoint-control";
import {
  ProductHeader,
  sourceFromLinks,
} from "@/features/split/components/product-header";
import { RaceTrack } from "@/features/split/components/race-track";
import { TrackVerdict } from "@/features/split/components/track-verdict";
import { FieldRoster } from "@/features/split/components/field-roster";
import { SleepPanel } from "@/features/health/sleep-panel";
import { WeekReveal } from "@/features/split/components/week-reveal";
import {
  buildSplitBoard,
  formatPts,
  laneAtCheckpoint,
  type ComparisonMode,
} from "@/features/split/model";
import {
  activityEffort,
  competeNow,
  formatVolume,
  daysLeft,
  lessonFor,
  sportById,
  SPORTS,
  HEALTH_METRICS,
  type CheckpointIndex,
  type ScoreTrack,
  type SportId,
} from "@fitness-battle/shared";
import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";

export default function MyTrackPage() {
  const { state, dispatch } = useCompete();
  const { user } = useAuth();
  const { theme } = useTheme();
  const [authOpen, setAuthOpen] = useState(false);
  const [authReason, setAuthReason] = useState(
    "Create an account to join a board and keep your rating.",
  );
  const [comparison, setComparison] = useState<ComparisonMode>("self");
  const [checkpoint, setCheckpoint] = useState<CheckpointIndex>(2);
  const [showField, setShowField] = useState(false);
  const [track, setTrack] = useState<ScoreTrack>("open");
  const [detail, setDetail] = useState<{
    title: string;
    body: ReactNode;
    kind: "activity" | "info";
  } | null>(null);

  const sport = state?.primary ?? "running";
  const spec = sportById(sport);
  const shownTrack: ScoreTrack = spec.gps ? track : "open";
  const rally = useMemo(() => {
    if (!state || theme.id !== "rally") return null;
    return buildRallyBoard(state, sport, shownTrack, competeNow(state));
  }, [state, sport, shownTrack, theme.id]);
  const weekState = useRallyWeek(rally);

  if (!state) return <p className="fb-copy">Loading your week…</p>;

  const now = competeNow(state);
  const showingSleep = state.focus.family === "health" && state.focus.id === "sleep";
  const board = buildSplitBoard(state, sport, shownTrack, now);
  const source = sourceFromLinks(state.links);
  const youLane = board.fieldLanes.find((lane) => lane.you) ?? null;
  const ghostEffort = board.ghostEffortAt(checkpoint);
  const youEffort = youLane ? laneAtCheckpoint(youLane, checkpoint) : 0;
  const lesson = lessonFor(sport, now);
  const done = state.lessonDoneOn === now.toISOString().slice(0, 10);
  const periodDaysLeft = daysLeft(
    {
      kind: state.clock.kind,
      startsAt: board.periodStart,
      endsAt: board.periodEnd,
    },
    now,
  );

  function requireParticipate(reason: string, action: () => void) {
    if (!user) {
      setAuthReason(reason);
      setAuthOpen(true);
      return;
    }
    if (!state!.onboardingCompleted) {
      window.location.href = "/onboarding";
      return;
    }
    action();
  }

  function openMove(move: RallyMove) {
    if (!weekState || !rally) return;
    const at = weekState.receiptFor(move);
    setDetail({
      title: move.title,
      kind: "activity",
      body: (
        <ActivityReceipt
          move={move}
          at={at}
          reference={weekState.reference}
          unit={rally.unit}
        />
      ),
    });
  }

  return (
    <>
      <ProductHeader sourceStatus={source.status} sourceLabel={source.label} />

      {state.pendingRevealIds.length > 0 ? (
        <WeekReveal
          state={state}
          onDismiss={() => dispatch({ type: "acknowledge-reveal" })}
        />
      ) : null}

      {theme.id === "form" && !showingSleep ? (
        <section className="fm-hero">
          <div>
            <p className="fb-kicker">Personal record / {board.periodLabel}</p>
            <h1>
              Built by
              <br />
              what you do.
            </h1>
            <div className="fm-score">
              <strong>{formatPts(youEffort)}</strong>
              <span>
                effort
                <br />
                points
              </span>
            </div>
            <p className="fb-copy">
              {ghostEffort > 0 ? (
                <>
                  <b>
                    {youEffort - ghostEffort >= 0 ? "+" : ""}
                    {formatPts(youEffort - ghostEffort)}
                  </b>{" "}
                  vs your previous week · same cutoff
                </>
              ) : (
                "No counted work in the previous week at this cutoff."
              )}
            </p>
            <Link href="/board" className="fb-btn">
              Inspect your field ↗
            </Link>
          </div>
          <div className="fm-art">
            <BrandArt brand="form" />
            <p>EFFORT / RECORDED</p>
          </div>
        </section>
      ) : theme.id === "rally" && !showingSleep ? (
        <div className="sp-title-block">
          <p className="fb-kicker">
            YOUR WEEK / {board.periodLabel}
          </p>
          <h1>
            SMALL MOVES.
            <br />
            <span>GOOD GAME.</span>
          </h1>
          <p className="fb-copy">
            {`${periodDaysLeft} days left. Your personal matchup lives here; the 2D/3D field stays on Matchups.`}
          </p>
        </div>
      ) : showingSleep ? null : (
        <div className="sp-title-block">
          <p className="fb-kicker">
            {board.periodLabel} / Weekly {spec.name.toLowerCase()}
          </p>
          <h1>
            {comparison === "self" ? (
              <>
                CHASE YOUR
                <br />
                <span>OWN LINE.</span>
              </>
            ) : (
              <>
                FIND YOUR
                <br />
                <span>CLOSE CONTEST.</span>
              </>
            )}
          </h1>
          <p className="fb-copy">
            {`${periodDaysLeft} days left. Effort points accumulate through the week — not a live race or pace board.`}
          </p>
        </div>
      )}

      <div className="fb-chips">
        {SPORTS.map((item) => {
          const joined = state.ratings.find((row) => row.sport === item.id)
            ?.optedIn;
          return (
            <button
              key={item.id}
              type="button"
              className={!showingSleep && item.id === sport ? "fb-chip on" : "fb-chip"}
              onClick={() =>
                requireParticipate(
                  `Sign in to compete in ${item.name} this week.`,
                  () =>
                    dispatch({
                      type: joined ? "set-primary" : "opt-in",
                      sport: item.id as SportId,
                    }),
                )
              }
            >
            {item.name}
            {joined ? "" : " · join"}
          </button>
        );
      })}
      </div>

      <div className="fb-chips" aria-label="Health metrics">
        {HEALTH_METRICS.map((item) => {
          const joined = state.healthRatings.find((row) => row.metric === item.id)?.optedIn;
          const on = showingSleep && item.id === "sleep";
          return (
            <button
              key={item.id}
              type="button"
              className={on ? "fb-chip on" : "fb-chip"}
              onClick={() =>
                requireParticipate(`Sign in to compete on ${item.name} this week.`, () =>
                  dispatch(
                    joined
                      ? { type: "set-focus", focus: { family: "health", id: item.id } }
                      : { type: "opt-in-health", metric: item.id },
                  ),
                )
              }
            >
              {item.name}
              {joined ? "" : " · join"}
            </button>
          );
        })}
      </div>

      {showingSleep ? (
        <SleepPanel
          state={state}
          now={now}
          onJoin={() =>
            requireParticipate("Sign in to compete on sleep this week.", () =>
              dispatch({ type: "opt-in-health", metric: "sleep" }),
            )
          }
          onSample={() =>
            requireParticipate("Sign in to record a sample night.", () =>
              dispatch({ type: "log-sleep" }),
            )
          }
          onLeave={() => dispatch({ type: "opt-out-health", metric: "sleep" })}
        />
      ) : null}

      {!showingSleep && spec.gps ? (
        <div className="fb-chips">
          {(
            [
              ["open", "All efforts"],
              ["verified", "Verified only"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={shownTrack === id ? "fb-chip on" : "fb-chip"}
              onClick={() => setTrack(id)}
            >
              {label}
            </button>
          ))}
        </div>
      ) : null}

      {theme.id === "form" && board.optedIn && !showingSleep ? (
        <>
          <div className="fm-stats">
            <div>
              <span>{spec.gps ? "Your distance" : "Your time"}</span>
              <strong>
                {board.you
                  ? formatVolume(sport, board.you.distanceM, board.you.movingSec)
                  : "—"}
              </strong>
            </div>
            <div>
              <span>In your field</span>
              <strong>
                {youLane?.place ?? "—"}
                <small> / {board.rows.length}</small>
              </strong>
            </div>
            <div>
              <span>Counted imports</span>
              <strong>
                {board.weekActivities.length}
                <small> sessions</small>
              </strong>
            </div>
          </div>
          <section className="fm-lines" aria-label="Your week against the previous week">
            {[
              { label: "YOUR WEEK", value: youEffort, mine: true },
              { label: "PAST YOU", value: ghostEffort, mine: false },
            ].map((row) => (
              <div key={row.label} className={row.mine ? "fm-line is-you" : "fm-line"}>
                <span>{row.label}</span>
                <i>
                  <b
                    style={{
                      left: `${Math.min(100, (row.value / Math.max(board.trackMax, 1)) * 100)}%`,
                    }}
                  >
                    {Math.round(row.value)}
                  </b>
                </i>
                <strong>{Math.round(row.value)}</strong>
              </div>
            ))}
          </section>
          <CheckpointControl
            checkpoint={checkpoint}
            labels={board.checkpointLabels}
            onChange={setCheckpoint}
          />
          {board.weekActivities.length > 0 ? (
            <Link href="/splits" className="fb-card">
              <p className="fb-kicker">Latest counted import</p>
              <h2>{board.weekActivities.at(-1)?.sport}</h2>
              <p className="fb-copy">
                {new Date(board.weekActivities.at(-1)!.startedAt).toLocaleDateString(
                  "en-US",
                  { weekday: "long", timeZone: "UTC" },
                )}{" "}
                · +{formatPts(activityEffort(board.weekActivities.at(-1)!))} pts
              </p>
            </Link>
          ) : null}
        </>
      ) : null}

      {theme.id === "rally" && board.optedIn && !showingSleep && weekState && rally ? (
        <div className="rf-addon">
          <Matchup
            week={weekState.week}
            reference={weekState.reference}
            playing={weekState.playing}
            unit={rally.unit}
            checkpointLabels={board.checkpointLabels}
            onCutoff={weekState.setCutoff}
            onReplay={weekState.onReplay}
          />
          <section className="rf-small-moves">
            <header>
              <div>
                <p className="rf-kicker">YOUR SMALL MOVES</p>
                <h2>They all add up.</h2>
              </div>
              <Link href="/splits">All moves ↗</Link>
            </header>
            {rally.moves.length === 0 ? (
              <p className="fb-copy">
                Sync a tracker to see counted outings as rings. Splits stay on
                Moves.
              </p>
            ) : (
              <div className="rf-small-ring-list">
                {rally.moves.map((move, index) => (
                  <ActivityRing
                    key={move.id}
                    move={move}
                    unit={rally.unit}
                    counted={weekState.week.cutoff >= index + 1}
                    onOpen={() => openMove(move)}
                  />
                ))}
              </div>
            )}
          </section>
          <div className="rf-ace-strip">
            <Ace />
            <div>
              <span className="rf-kicker">THE FIELD</span>
              <strong>2D lanes and 3D Pursuit stay put.</strong>
              <p className="fb-copy">
                Open Matchups for the live field, roster, and 1v1s.
              </p>
              <Link href="/board" className="fb-btn">
                Open the field ↗
              </Link>
            </div>
          </div>
          <div className="sp-bottom">
            <span>
              Your field{" "}
              <strong>
                {youLane?.place ?? "—"} / {board.rows.length}
              </strong>
            </span>
            <span>
              Your week <strong>{formatPts(youLane?.effort ?? 0)} pts</strong>
            </span>
            <Link href="/you#connections" className="fb-btn-ghost">
              {source.label} ↗
            </Link>
          </div>
        </div>
      ) : null}

      {!showingSleep && !board.optedIn ? (
        <section className="sp-empty">
          <h2>You are not on a track yet</h2>
          <p className="fb-copy">{spec.blurb}</p>
          <p className="fb-note">
            Joining opens today’s wave. Your board counts effort from now until
            the Sunday UTC reset — rivals only contribute distance inside your
            window.
          </p>
          <button
            type="button"
            className="fb-btn"
            onClick={() =>
              requireParticipate(`Sign in to join ${spec.name} this week.`, () =>
                dispatch({ type: "opt-in", sport }),
              )
            }
          >
            Join {spec.name} this week
          </button>
        </section>
      ) : !showingSleep && theme.id === "ink" ? (
        <div className="sp-layout">
          <section className="sp-board">
            <div className="sp-mode-switch" aria-label="Comparison mode">
              <button
                type="button"
                aria-pressed={comparison === "self"}
                onClick={() => {
                  setComparison("self");
                  setShowField(false);
                }}
              >
                Your previous week
              </button>
              <button
                type="button"
                aria-pressed={comparison === "field"}
                onClick={() => setComparison("field")}
              >
                Nearby rivals
              </button>
            </div>
            <RaceTrack
              comparison={comparison}
              checkpoint={checkpoint}
              trackMax={board.trackMax}
              youLane={youLane}
              ghostEffort={ghostEffort}
              nearby={board.nearby}
            />
            <CheckpointControl
              checkpoint={checkpoint}
              labels={board.checkpointLabels}
              onChange={setCheckpoint}
            />
          </section>
          <TrackVerdict
            comparison={comparison}
            youLane={youLane}
            ghostEffort={ghostEffort}
            checkpointEffort={youEffort}
            onOpenField={() => setShowField(true)}
          />
        </div>
      ) : null}

      {board.optedIn && theme.id === "ink" && !showingSleep ? (
        <div className="sp-bottom">
          <span>
            Your field <strong>{youLane?.place ?? "—"} / {board.rows.length}</strong>
          </span>
          <span>
            Your week <strong>{formatPts(youLane?.effort ?? 0)} pts</strong>
          </span>
          <Link href="/you#connections" className="fb-btn-ghost">
            {source.label} ↗
          </Link>
        </div>
      ) : null}

      {showField && board.optedIn && theme.id === "ink" && !showingSleep ? (
        <section>
          <div className="fd-roster-head">
            <h3>Full field</h3>
            <button
              type="button"
              className="fb-btn-ghost"
              onClick={() => setShowField(false)}
            >
              Hide
            </button>
          </div>
          <FieldRoster rows={board.rows} />
        </section>
      ) : null}

      <section className="fb-card fb-lesson">
        <p className="fb-kicker">Today’s lesson</p>
        <h2>
          {lesson.title} · {lesson.minutes} min
        </h2>
        <p className="fb-copy">{lesson.detail}</p>
        <button
          type="button"
          className="fb-btn"
          disabled={done}
          onClick={() => dispatch({ type: "complete-lesson" })}
        >
          {done ? "Done for today" : "Mark done"}
        </button>
      </section>

      <RallyDetailDialog detail={detail} onClose={() => setDetail(null)} />
      <AuthPrompt
        open={authOpen}
        reason={authReason}
        onClose={() => setAuthOpen(false)}
      />
    </>
  );
}
