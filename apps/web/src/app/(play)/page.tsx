"use client";

import { AuthPrompt } from "@/components/auth-gate";
import { useAuth } from "@/components/auth-context";
import { useCompete } from "@/components/compete-context";
import { SleepPanel } from "@/features/health/sleep-panel";
import { Ace } from "@/features/rally/ace";
import { ActivityRing } from "@/features/rally/activity-ring";
import {
  ActivityReceipt,
  RallyDetailDialog,
} from "@/features/rally/detail-dialog";
import { RallyHero } from "@/features/rally/hero";
import { Matchup } from "@/features/rally/matchup";
import { buildRallyBoard, type RallyMove } from "@/features/rally/model";
import { useRallyWeek } from "@/features/rally/use-rally-week";
import {
  ProductHeader,
  sourceFromLinks,
} from "@/features/split/components/product-header";
import { WeekReveal } from "@/features/split/components/week-reveal";
import {
  competeNow,
  daysLeft,
  lessonFor,
  sportById,
  SPORTS,
  HEALTH_METRICS,
  type ScoreTrack,
  type SportId,
} from "@fitness-battle/shared";
import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";

export default function MyWeekPage() {
  const { state, dispatch } = useCompete();
  const { user } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const [authReason, setAuthReason] = useState(
    "Create an account to join a board and keep your rating.",
  );
  const [track, setTrack] = useState<ScoreTrack>("open");
  const [detail, setDetail] = useState<{
    title: string;
    body: ReactNode;
    kind: "activity" | "info";
  } | null>(null);

  const showingSleep =
    Boolean(state) &&
    state!.focus.family === "health" &&
    state!.focus.id === "sleep";
  const sport = state?.primary ?? "running";
  const spec = sportById(sport);
  const shownTrack: ScoreTrack = spec.gps ? track : "open";

  const rally = useMemo(() => {
    if (!state) return null;
    return buildRallyBoard(state, sport, shownTrack, competeNow(state));
  }, [state, sport, shownTrack]);
  const weekState = useRallyWeek(rally);
  const now = state ? competeNow(state) : new Date();

  if (!state || !rally || !weekState) {
    return <p className="fb-copy">Loading your week…</p>;
  }

  const source = sourceFromLinks(state.links);
  const lesson = lessonFor(sport, now);
  const done = state.lessonDoneOn === now.toISOString().slice(0, 10);
  const periodDaysLeft = daysLeft(
    {
      kind: state.clock.kind,
      startsAt: rally.board.periodStart,
      endsAt: rally.board.periodEnd,
    },
    now,
  );
  const selected =
    weekState.week.cutoff === 0
      ? null
      : (rally.moves[
          Math.min(rally.moves.length - 1, Math.max(0, weekState.week.count - 1))
        ] ??
        rally.moves.at(-1) ??
        null);

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
    const at = weekState!.receiptFor(move);
    setDetail({
      title: move.title,
      kind: "activity",
      body: (
        <ActivityReceipt
          move={move}
          at={at}
          reference={weekState!.reference}
          unit={rally!.unit}
        />
      ),
    });
  }

  return (
    <main>
      <ProductHeader sourceStatus={source.status} sourceLabel={source.label} />
      <div className="rf-demo-line">
        <span>
          {spec.name} · {rally.periodLabel} UTC
        </span>
        <span>
          {source.label} · {weekState.week.label} snapshot
        </span>
      </div>

      {state.pendingRevealIds.length > 0 ? (
        <WeekReveal
          state={state}
          onDismiss={() => dispatch({ type: "acknowledge-reveal" })}
        />
      ) : null}

      <RallyHero
        kicker={`YOUR WEEK / ${rally.periodLabel}`}
        line1="SMALL MOVES."
        line2="GOOD GAME."
        copy={
          showingSleep
            ? "Sleep is scored from last night and the nights logged this week."
            : `${periodDaysLeft} days left. A little movement. All your own work.`
        }
      />

      <div className="rf-sport-chips fb-chips">
        {SPORTS.map((item) => {
          const joined = state.ratings.find((row) => row.sport === item.id)
            ?.optedIn;
          return (
            <button
              key={item.id}
              type="button"
              className={
                !showingSleep && item.id === sport ? "fb-chip on" : "fb-chip"
              }
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
          const joined = state.healthRatings.find(
            (row) => row.metric === item.id,
          )?.optedIn;
          const on = showingSleep && item.id === "sleep";
          return (
            <button
              key={item.id}
              type="button"
              className={on ? "fb-chip on" : "fb-chip"}
              onClick={() =>
                requireParticipate(
                  `Sign in to compete on ${item.name} this week.`,
                  () =>
                    dispatch(
                      joined
                        ? {
                            type: "set-focus",
                            focus: { family: "health", id: item.id },
                          }
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

      {!showingSleep && !rally.board.optedIn ? (
        <section className="sp-empty">
          <h2>You are not on a track yet</h2>
          <p className="fb-copy">{spec.blurb}</p>
          <p className="fb-note">
            Joining opens today’s wave. Your board counts effort from now until
            the Sunday UTC reset.
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
      ) : null}

      {!showingSleep && rally.board.optedIn ? (
        <>
          <div className="rf-week-layout">
            <div>
              <Matchup
                week={weekState.week}
                reference={weekState.reference}
                playing={weekState.playing}
                unit={rally.unit}
                checkpointLabels={rally.board.checkpointLabels}
                onCutoff={weekState.setCutoff}
                onReplay={weekState.onReplay}
              />
              <Link className="rf-matchup-link" href="/board">
                Choose a different matchup <span>↗</span>
              </Link>
            </div>
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
                  Sync a tracker to see counted outings as rings.
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
              <p className="rf-ring-caption">
                Each ring uses the same 10 km distance scale.
              </p>
            </section>
          </div>

          <section className="rf-highlight">
            <div className="rf-highlight-art">
              <span className="rf-sticker">
                {weekState.week.cutoff === 0 ? "READY!" : "GOOD MOVE!"}
              </span>
              <Ace />
            </div>
            <div className="rf-highlight-copy">
              <p className="rf-kicker">A MOMENT FROM YOUR WEEK</p>
              <h2>
                {weekState.week.cutoff === 0 || !selected
                  ? "A fresh page."
                  : selected.title}
              </h2>
              <p>
                {weekState.week.cutoff === 0 || !selected
                  ? "The start of your week. Zero on the board; room for what comes next."
                  : selected.note}
              </p>
            </div>
            <button
              type="button"
              disabled={weekState.week.cutoff === 0 || !selected}
              onClick={() => selected && openMove(selected)}
            >
              {weekState.week.cutoff === 0 || !selected
                ? "The story is ready"
                : `+${rally.unit === "km" ? `${selected.km} km` : `${selected.minutes} min`} / Read the moment`}{" "}
              ↗
            </button>
          </section>
        </>
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

      <footer className="rf-product-footer">
        <span>GOOD COMPANY. GOOD GAME.</span>
        <p>
          Move at your own pace.
          <br />
          Ace is in your corner.
        </p>
      </footer>

      <RallyDetailDialog detail={detail} onClose={() => setDetail(null)} />
      <AuthPrompt
        open={authOpen}
        reason={authReason}
        onClose={() => setAuthOpen(false)}
      />
    </main>
  );
}
