"use client";

import { suggestionForState, type GoalDistance } from "@fitness-battle/shared";
import { useState } from "react";
import type { Action, CompeteState } from "@fitness-battle/shared";

const DISTANCES: { id: GoalDistance; label: string }[] = [
  { id: "5k", label: "5K" },
  { id: "10k", label: "10K" },
  { id: "half", label: "Half marathon" },
  { id: "marathon", label: "Marathon" },
];

export function TodaySuggestion({
  state,
  now,
  dispatch,
}: {
  state: CompeteState;
  now: Date;
  dispatch: (action: Action) => void;
}) {
  const suggestion = suggestionForState(state, now);
  const [editing, setEditing] = useState(false);
  const [distance, setDistance] = useState<GoalDistance>(
    state.trainingGoal?.distance ?? "10k",
  );
  const [deadline, setDeadline] = useState(
    state.trainingGoal?.deadline ?? defaultDeadline(now),
  );
  const [dateError, setDateError] = useState<string | null>(null);
  return (
    <section className="fb-card fb-lesson">
      <p className="fb-kicker">Today</p>
      <h2>
        {suggestion.title}
        {suggestion.minutes ? ` · ${suggestion.minutes} min` : ""}
      </h2>
      <p className="fb-copy">{suggestion.detail}</p>
      <p className="fb-note">{suggestion.reason}</p>
      <p className="fb-note">{suggestion.pattern}</p>
      {state.trainingGoal && !editing ? (
        <button type="button" className="fb-btn-ghost" onClick={() => setEditing(true)}>
          Change goal
        </button>
      ) : null}
      {!state.trainingGoal && !editing ? (
        <button type="button" className="fb-btn-ghost" onClick={() => setEditing(true)}>
          Add a race date
        </button>
      ) : null}
      {editing ? (
        <>
          <p className="fb-copy">
            Optional. A date switches today from a normal session to a standard
            recreational shape for that distance.
          </p>
          <div className="fb-chips">
            {DISTANCES.map((item) => (
              <button
                key={item.id}
                type="button"
                className={distance === item.id ? "fb-chip on" : "fb-chip"}
                onClick={() => setDistance(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
          <label className="fb-field">
            Target day
            <input
              type="date"
              value={deadline}
              onChange={(event) => setDeadline(event.target.value)}
            />
          </label>
          <button
            type="button"
            className="fb-btn"
            onClick={() => {
              if (!validDeadline(deadline)) {
                setDateError("Enter a real target day.");
                return;
              }
              setDateError(null);
              dispatch({
                type: "set-training-goal",
                goalDistance: distance,
                deadline,
              });
              setEditing(false);
            }}
          >
            Save goal
          </button>
          {dateError ? <p className="fb-note">{dateError}</p> : null}
          {state.trainingGoal ? (
            <button
              type="button"
              className="fb-btn-ghost"
              onClick={() => {
                dispatch({ type: "clear-training-goal" });
                setEditing(false);
              }}
            >
              Remove goal
            </button>
          ) : (
            <button type="button" className="fb-btn-ghost" onClick={() => setEditing(false)}>
              Keep it general
            </button>
          )}
        </>
      ) : null}
    </section>
  );
}

function defaultDeadline(now: Date): string {
  const next = new Date(now);
  next.setUTCDate(next.getUTCDate() + 12 * 7);
  return next.toISOString().slice(0, 10);
}

function validDeadline(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}
