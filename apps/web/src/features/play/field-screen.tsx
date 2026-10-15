"use client";

import { AuthPrompt } from "@/components/auth-gate";
import { useAuth } from "@/components/auth-context";
import { useCompete } from "@/components/compete-context";
import { SleepPanel } from "@/features/health/sleep-panel";
import { FieldCrewSwitch, FieldJoinActions } from "@/features/rally/field-join";
import { CrewPanel } from "@/features/rally/crew-panel";
import { buildSplitBoard } from "@/features/split/model";
import {
  HEALTH_METRICS,
  SPORTS,
  competeNow,
  formatEffort,
  sportById,
  type SportId,
} from "@fitness-battle/shared";
import { useState } from "react";

export function FieldScreen() {
  const { state, dispatch } = useCompete();
  const { user } = useAuth();
  const [username, setUsername] = useState("");
  const [authOpen, setAuthOpen] = useState(false);
  const [authReason, setAuthReason] = useState("Sign in to join the weekly field.");
  const [showSleep, setShowSleep] = useState(false);

  if (!state) return <p className="ps-note">Loading the field…</p>;

  const now = competeNow(state);
  const sport = sportById(state.primary);
  const board = buildSplitBoard(state, state.primary, "open", now);
  const sleepOn = showSleep || state.focus.family === "health";

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
    <section aria-label="Field">
      <p className="ps-kicker">Field</p>
      <h1>{sport.name}</h1>
      {SPORTS.map((item) => {
        const joined = state.ratings.find((row) => row.sport === item.id)?.optedIn;
        const current = !sleepOn && item.id === state.primary;
        return (
          <button
            key={item.id}
            type="button"
            className="ps-row"
            aria-pressed={current}
            onClick={() => {
              setShowSleep(false);
              requireParticipate(`Sign in to compete in ${item.name}.`, () => {
                dispatch(joined ? { type: "set-primary", sport: item.id as SportId } : { type: "opt-in", sport: item.id as SportId });
                if (joined) dispatch({ type: "set-focus", focus: { family: "sport", id: item.id } });
              });
            }}
          >
            <span>
              {item.name}
              <br />
              <small>{current ? "This week" : joined ? "Joined" : "Not joined"}</small>
            </span>
            <b>{current ? "Current" : joined ? "Switch" : "Join"}</b>
          </button>
        );
      })}
      {HEALTH_METRICS.map((item) => (
        <button
          key={item.id}
          type="button"
          className="ps-row"
          aria-pressed={sleepOn && item.id === "sleep"}
          onClick={() => {
            setShowSleep(true);
            requireParticipate(`Sign in to compete on ${item.name}.`, () => {
              const joined = state.healthRatings.find((row) => row.metric === item.id)?.optedIn;
              dispatch(
                joined
                  ? { type: "set-focus", focus: { family: "health", id: item.id } }
                  : { type: "opt-in-health", metric: item.id },
              );
            });
          }}
        >
          <span>{item.name}</span>
          <b>{sleepOn ? "Open" : "Join"}</b>
        </button>
      ))}
      {sleepOn ? (
        <SleepPanel
          state={state}
          now={now}
          onJoin={() => requireParticipate("Sign in to join the sleep board.", () => dispatch({ type: "opt-in-health", metric: "sleep" }))}
          onSample={() => requireParticipate("Sign in to record a sample night.", () => dispatch({ type: "log-sleep" }))}
          onLeave={() => {
            dispatch({ type: "opt-out-health", metric: "sleep" });
            setShowSleep(false);
          }}
        />
      ) : board.optedIn ? (
        <>
          <FieldCrewSwitch sport={state.primary} />
          <button type="button" className="ps-btn-quiet" onClick={() => dispatch({ type: "opt-out", sport: state.primary })}>
            Leave this field
          </button>
        </>
      ) : (
        <FieldJoinActions sport={state.primary} sportName={sport.name} requireParticipate={requireParticipate} />
      )}
      <CrewPanel />
      <h2>Practice 1v1</h2>
      {board.duels.length === 0 ? (
        <>
          <button
            type="button"
            className="ps-btn"
            onClick={() => requireParticipate("Sign in to start a 1v1.", () => dispatch({ type: "duel", sport: state.primary, mode: "auto" }))}
          >
            Auto match
          </button>
          <label className="fb-field">
            Username
            <input value={username} placeholder="Maya Chen" onChange={(event) => setUsername(event.target.value)} />
          </label>
          <button
            type="button"
            className="ps-btn-quiet"
            disabled={username.trim().length === 0}
            onClick={() =>
              requireParticipate("Sign in to send a 1v1 invite.", () =>
                dispatch({ type: "duel", sport: state.primary, mode: "invite", username: username.trim() }),
              )
            }
          >
            Practice that rival
          </button>
        </>
      ) : (
        board.duels.map((view) => (
          <p key={view.duel.id} className="ps-row">
            <span>
              {view.duel.rivalName}
              <br />
              <small>{formatEffort(view.rivalEffort)} effort</small>
            </span>
            <b>{view.leading === "you" ? "You lead" : view.leading === "rival" ? "They lead" : "Level"}</b>
          </p>
        ))
      )}
      <AuthPrompt open={authOpen} reason={authReason} onClose={() => setAuthOpen(false)} />
    </section>
  );
}
