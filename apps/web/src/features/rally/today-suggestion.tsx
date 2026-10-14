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
  const [distance, setDistance] = useState<GoalDistance>(
    state.trainingGoal?.distance ?? "10k",
  );
  const [deadline, setDeadline] = useState(
    state.trainingGoal?.deadline ?? defaultDeadline(now),
  );

  return (
    <section className="fb-card fb-lesson">
      <p className="fb-kicker">Today</p>
      {suggestion ? (
        <>
          <h2>
            {suggestion.title}
            {suggestion.minutes ? ` · ${suggestion.minutes} min` : ""}
          </h2>
          <p className="fb-copy">{suggestion.detail}</p>
          <p className="fb-note">{suggestion.reason}</p>
          <p className="fb-note">{suggestion.pattern}</p>
          <button
            type="button"
            className="fb-btn-ghost"
            onClick={() => dispatch({ type: "clear-training-goal" })}
          >
            Change goal
          </button>
        </>
      ) : (
        <>
          <h2>Set a race or a target day</h2>
          <p className="fb-copy">
            Today’s session uses your counted runs from the last four weeks and
            a standard recreational shape for the distance. It is one day, not
            a full plan.
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
            onClick={() =>
              dispatch({
                type: "set-training-goal",
                goalDistance: distance,
                deadline,
              })
            }
          >
            Save goal
          </button>
        </>
      )}
    </section>
  );
}

function defaultDeadline(now: Date): string {
  const next = new Date(now);
  next.setUTCDate(next.getUTCDate() + 12 * 7);
  return next.toISOString().slice(0, 10);
}
