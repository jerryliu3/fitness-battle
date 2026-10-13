"use client";

import { AuthPrompt } from "@/components/auth-gate";
import { useAuth } from "@/components/auth-context";
import { useCompete } from "@/components/compete-context";
import { SleepPanel } from "@/features/health/sleep-panel";
import { DistanceField } from "@/features/rally/distance-field";
import { RallyHero } from "@/features/rally/hero";
import { Matchup } from "@/features/rally/matchup";
import { buildRallyBoard } from "@/features/rally/model";
import { useRallyWeek } from "@/features/rally/use-rally-week";
import {
  ProductHeader,
  sourceFromLinks,
} from "@/features/split/components/product-header";
import {
  competeNow,
  formatClock,
  formatEffort,
  projectedElo,
  sportById,
  SPORTS,
  HEALTH_METRICS,
  type ScoreTrack,
  type SportId,
} from "@fitness-battle/shared";
import { useMemo, useState } from "react";

export default function MatchupsPage() {
  const { state, dispatch } = useCompete();
  const { user } = useAuth();
  const [sport, setSport] = useState<SportId | null>(null);
  const [showSleep, setShowSleep] = useState(false);
  const [track, setTrack] = useState<ScoreTrack>("open");
  const [username, setUsername] = useState("");
  const [authOpen, setAuthOpen] = useState(false);
  const [authReason, setAuthReason] = useState(
    "Sign in to join the weekly field or start a 1v1.",
  );

  const sleepSelected =
    showSleep || (state != null && sport == null && state.focus.family === "health");
  const active = sport ?? state?.primary ?? "running";
  const spec = sportById(active);
  const shownTrack: ScoreTrack = spec.gps ? track : "open";

  const rally = useMemo(() => {
    if (!state) return null;
    return buildRallyBoard(state, active, shownTrack, competeNow(state));
  }, [state, active, shownTrack]);
  const weekState = useRallyWeek(rally);
  const now = state ? competeNow(state) : new Date();

  if (!state || !rally || !weekState) {
    return <p className="fb-copy">Loading matchups…</p>;
  }

  const source = sourceFromLinks(state.links);
  const board = rally.board;
  const rating = state.ratings.find((item) => item.sport === active);
  const nextElo = rating?.optedIn
    ? projectedElo(state, active, shownTrack, now)
    : null;
  const currentElo =
    shownTrack === "verified" ? rating?.verifiedElo : rating?.openElo;
  const frozen = state.frozenPeriods.includes(board.periodStart.toISOString());

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

  return (
    <main>
      <ProductHeader sourceStatus={source.status} sourceLabel={source.label} />
      <div className="rf-demo-line">
        <span>
          {spec.name} ·{" "}
          {formatClock({
            startsAt: board.periodStart,
            endsAt: board.periodEnd,
            kind: state.clock.kind,
          })}
        </span>
        <span>{source.label}</span>
      </div>

      <RallyHero
        kicker="YOUR KIND OF COMPETITION"
        line1="FIND YOUR"
        line2="NEXT MATCHUP."
        copy={
          sleepSelected
            ? "Sleep ranks last night and the week’s average."
            : "Start with past you. Add a little company when you want it."
        }
      />

      <div className="fb-chips">
        {SPORTS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={!sleepSelected && item.id === active ? "fb-chip on" : "fb-chip"}
            onClick={() => {
              setShowSleep(false);
              setSport(item.id);
            }}
          >
            {item.name}
          </button>
        ))}
      </div>

      <div className="fb-chips" aria-label="Health metrics">
        {HEALTH_METRICS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={sleepSelected ? "fb-chip on" : "fb-chip"}
            onClick={() => {
              setShowSleep(true);
              dispatch({ type: "set-focus", focus: { family: "health", id: item.id } });
            }}
          >
            {item.name}
          </button>
        ))}
      </div>

      {sleepSelected ? (
        <SleepPanel
          state={state}
          now={now}
          onJoin={() =>
            requireParticipate("Sign in to join the sleep board.", () =>
              dispatch({ type: "opt-in-health", metric: "sleep" }),
            )
          }
          onSample={() =>
            requireParticipate("Sign in to record a sample night.", () =>
              dispatch({ type: "log-sleep" }),
            )
          }
          onLeave={() => {
            dispatch({ type: "opt-out-health", metric: "sleep" });
            setShowSleep(false);
          }}
        />
      ) : spec.gps ? (
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
      ) : (
        <p className="fb-note">
          Strength uses open effort as the field axis. Indoor work is not treated
          as GPS distance.
        </p>
      )}

      {sleepSelected ? null : !board.optedIn ? (
        <section className="sp-empty">
          <h2>You are not on this field</h2>
          <p className="fb-copy">{spec.blurb}</p>
          <button
            type="button"
            className="fb-btn"
            onClick={() =>
              requireParticipate(`Sign in to join ${spec.name} this week.`, () =>
                dispatch({ type: "opt-in", sport: active }),
              )
            }
          >
            Join {spec.name} this week
          </button>
        </section>
      ) : (
        <>
          <section className="rf-matchup-choice">
            <p className="rf-kicker">CHOOSE YOUR MATCHUP</p>
            <div>
              {rally.references.map((ref) => (
                <button
                  key={ref.id}
                  type="button"
                  onClick={() => weekState.setReference(ref.id)}
                  aria-pressed={weekState.reference.id === ref.id}
                >
                  {ref.ghost
                    ? "Me vs. past me"
                    : `Me vs. ${ref.name.split(" ")[0]}`}
                </button>
              ))}
              <label>
                More runners
                <select
                  aria-label="Choose comparison runner"
                  value={weekState.reference.id}
                  onChange={(event) => weekState.setReference(event.target.value)}
                >
                  <option value="ghost">Your previous week</option>
                  {rally.lanes
                    .filter((lane) => !lane.you)
                    .map((lane) => (
                      <option key={lane.id} value={lane.id}>
                        {lane.name}
                      </option>
                    ))}
                </select>
              </label>
            </div>
          </section>

          <div className="rf-matchups-layout">
            <Matchup
              week={weekState.week}
              reference={weekState.reference}
              playing={weekState.playing}
              unit={rally.unit}
              checkpointLabels={board.checkpointLabels}
              onCutoff={weekState.setCutoff}
              onReplay={weekState.onReplay}
            />
            <DistanceField
              rally={rally}
              weekCutoff={weekState.cutoff}
              weekTotal={weekState.week.total}
              reference={weekState.reference}
              onReference={weekState.setReference}
            />
          </div>

          <p className="fb-note">
            {frozen
              ? "This week is frozen. Rating will not move when it closes."
              : board.you && nextElo != null && currentElo != null
                ? `If the week ended now, ${shownTrack} rating would be ${nextElo} (${nextElo - currentElo >= 0 ? "+" : ""}${nextElo - currentElo}).`
                : "Rating updates when the week closes."}
          </p>
          <button
            type="button"
            className="fb-btn-ghost"
            onClick={() => dispatch({ type: "opt-out", sport: active })}
          >
            Leave this field
          </button>
        </>
      )}

      <section className="fb-card" id="duel">
        <h2>1v1 this week</h2>
        <p className="fb-copy">
          One opponent, same weekly window. Auto match picks the closest rating.
        </p>
        {board.duels.map((view) => {
          const total = view.youEffort + view.rivalEffort || 1;
          return (
            <div key={view.duel.id}>
              <div className="fb-row">
                <span className="fb-grow">
                  You
                  <small>{formatEffort(view.youEffort)} effort</small>
                </span>
                <span className="fb-grow" style={{ textAlign: "right" }}>
                  {view.duel.rivalName}
                  <small>{formatEffort(view.rivalEffort)} effort</small>
                </span>
              </div>
              <div className="fb-bar">
                <span style={{ width: `${(view.youEffort / total) * 100}%` }} />
              </div>
              <p className="fb-note">
                {view.leading === "tie"
                  ? "Level right now."
                  : view.leading === "you"
                    ? "You are ahead."
                    : `${view.duel.rivalName} is ahead.`}
                {view.duel.source === "invite" ? " Invited." : " Auto matched."}
              </p>
            </div>
          );
        })}
        {board.duels.length === 0 ? (
          <div className="fb-stack">
            <button
              type="button"
              className="fb-btn"
              onClick={() =>
                requireParticipate("Sign in to start a 1v1.", () =>
                  dispatch({ type: "duel", sport: active, mode: "auto" }),
                )
              }
            >
              Auto match
            </button>
            <label className="fb-field">
              Username
              <input
                value={username}
                placeholder="Maya Chen"
                onChange={(event) => setUsername(event.target.value)}
              />
            </label>
            <button
              type="button"
              className="fb-btn-line"
              onClick={() =>
                requireParticipate("Sign in to send a 1v1 invite.", () =>
                  dispatch({
                    type: "duel",
                    sport: active,
                    mode: "invite",
                    username,
                  }),
                )
              }
            >
              Send invite
            </button>
          </div>
        ) : null}
      </section>

      <AuthPrompt
        open={authOpen}
        reason={authReason}
        onClose={() => setAuthOpen(false)}
      />
    </main>
  );
}
