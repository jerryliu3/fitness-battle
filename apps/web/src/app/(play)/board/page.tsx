"use client";

import { CrewPanel } from "@/features/rally/crew-panel";
import { AuthPrompt } from "@/components/auth-gate";
import { useAuth } from "@/components/auth-context";
import { useCompete } from "@/components/compete-context";
import { SleepPanel } from "@/features/health/sleep-panel";
import { FieldStage } from "@/features/field/components/field-stage";
import { buildFieldModel } from "@/features/field/model";
import { FieldCrewSwitch, FieldJoinActions } from "@/features/rally/field-join";
import { Matchup } from "@/features/rally/matchup";
import { useRallyPresentation } from "@/features/rally/use-rally-week";
import {
  ProductHeader,
  sourceFromLinks,
} from "@/features/split/components/product-header";
import { buildSplitBoard } from "@/features/split/model";
import { useTheme } from "@/theme/theme-provider";
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
import { useState } from "react";

export default function FieldPage() {
  const { state, dispatch } = useCompete();
  const { user } = useAuth();
  const { theme } = useTheme();
  const [sport, setSport] = useState<SportId | null>(null);
  const [showSleep, setShowSleep] = useState(false);
  const [track, setTrack] = useState<ScoreTrack>("open");
  const [username, setUsername] = useState("");
  const [authOpen, setAuthOpen] = useState(false);
  const [authReason, setAuthReason] = useState(
    "Sign in to join the weekly field or start a 1v1.",
  );

  const sleepSelected =
    showSleep ||
    (state != null && sport == null && state.focus.family === "health");
  const active = sport ?? state?.primary ?? "running";
  const spec = sportById(active);
  const shownTrack: ScoreTrack = spec.gps ? track : "open";
  const rallyWeek = useRallyPresentation(
    state,
    active,
    shownTrack,
    theme.id === "rally",
  );

  if (!state) return <p className="fb-copy">Loading the field…</p>;

  const now = competeNow(state);
  const board = buildSplitBoard(state, active, shownTrack, now);
  const field = buildFieldModel(state, active, shownTrack, now);
  const source = sourceFromLinks(state.links);
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
    <>
      <ProductHeader sourceStatus={source.status} sourceLabel={source.label} />

      <div className="sp-title-block">
        <p className="fb-kicker">
          The field ·{" "}
          {formatClock({
            startsAt: board.periodStart,
            endsAt: board.periodEnd,
            kind: state.clock.kind,
          })}
        </p>
        <h1>
          {theme.id === "rally" ? (
            <>
              FIND YOUR
              <br />
              <span>MATCHUP.</span>
            </>
          ) : (
            <>
              THE
              <br />
              <span>FIELD.</span>
            </>
          )}
        </h1>
        <p className="fb-copy">
          {sleepSelected
            ? "Sleep ranks last night and the week’s average. It does not use the track."
            : `2D lanes and 3D Pursuit stay the heart of the field. Positions use weekly ${spec.gps ? "distance" : "effort"} — lane number is not rank.`}
        </p>
      </div>

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
          <FieldJoinActions
            sport={active}
            sportName={spec.name}
            requireParticipate={requireParticipate}
          />
        </section>
      ) : (
        <>
          {theme.id === "rally" && rallyWeek ? (
            <div className="rf-addon">
              <section className="rf-matchup-choice">
                <p className="rf-kicker">PERSONAL MATCHUP</p>
                <div>
                  {rallyWeek.rally.references.map((ref) => (
                    <button
                      key={ref.id}
                      type="button"
                      onClick={() => rallyWeek.setReference(ref.id)}
                      aria-pressed={rallyWeek.reference.id === ref.id}
                    >
                      {ref.ghost
                        ? "Me vs. past me"
                        : `Me vs. ${ref.name.split(" ")[0]}`}
                    </button>
                  ))}
                </div>
              </section>
              <Matchup
                week={rallyWeek.week}
                reference={rallyWeek.reference}
                playing={rallyWeek.playing}
                unit={rallyWeek.rally.unit}
                checkpointLabels={board.checkpointLabels}
                onCutoff={rallyWeek.setCutoff}
                onReplay={rallyWeek.onReplay}
              />
              <p className="rf-field-note">
                The 2D lanes and 3D Pursuit below remain the live field. The
                matchup above is an optional personal comparison.
              </p>
            </div>
          ) : null}
          <FieldStage model={field} checkpoint={2} boardRows={board.rows} />
          <p className="fb-note">
            {frozen
              ? "This week is frozen. Rating will not move when it closes."
              : board.you && nextElo != null && currentElo != null
                ? `If the week ended now, ${shownTrack} rating would be ${nextElo} (${nextElo - currentElo >= 0 ? "+" : ""}${nextElo - currentElo}).`
                : "Rating updates when the week closes."}
          </p>
          <FieldCrewSwitch sport={active} />
          <button
            type="button"
            className="fb-btn-ghost"
            onClick={() => dispatch({ type: "opt-out", sport: active })}
          >
            Leave this field
          </button>
        </>
      )}

      <CrewPanel />

      <section className="fb-card" id="duel">
        <h2>Practice 1v1</h2>
        <p className="fb-copy">
          One opponent, same weekly window. Auto match and a typed name stay on
          this device. For friends on the same board, create a crew and choose
          Join with crew when you register for the week.
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
              Practice rival
            </button>
          </div>
        ) : null}
      </section>

      <AuthPrompt
        open={authOpen}
        reason={authReason}
        onClose={() => setAuthOpen(false)}
      />
    </>
  );
}
