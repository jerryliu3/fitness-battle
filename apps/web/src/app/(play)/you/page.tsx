"use client";

import { useCompete } from "@/components/compete-context";
import {
  currentPeriodBounds,
  PROVIDERS,
  RANK_BANDS,
  rankForElo,
  SPORTS,
  STARTING_FREEZES,
} from "@fitness-battle/shared";
import { useState } from "react";

export default function YouPage() {
  const { state, dispatch } = useCompete();
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  if (!state) return <p className="fb-copy">Loading…</p>;

  const period = currentPeriodBounds(state.clock.kind, new Date());
  const frozen = state.frozenPeriods.includes(period.startsAt.toISOString());

  return (
    <>
      <header>
        <p className="fb-kicker">You</p>
        <h1 className="fb-title">{state.name}</h1>
        <p className="fb-copy">
          {state.city}. Push the people near you, then stay with it next week.
        </p>
      </header>

      <section className="fb-card">
        <label className="fb-field">
          Name
          <input
            defaultValue={state.name}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <label className="fb-field">
          City
          <input
            defaultValue={state.city}
            onChange={(event) => setCity(event.target.value)}
          />
        </label>
        <button
          type="button"
          className="fb-btn"
          onClick={() => {
            if (name.trim()) dispatch({ type: "rename", name });
            if (city.trim()) dispatch({ type: "set-city", city });
          }}
        >
          Save
        </button>
      </section>

      <section className="fb-card">
        <h2>Sports</h2>
        {SPORTS.map((sport) => {
          const rating = state.ratings.find((item) => item.sport === sport.id);
          const primary = state.primary === sport.id;
          return (
            <div key={sport.id} className="fb-row">
              <span className="fb-grow">
                {sport.name}
                {primary ? " · primary" : ""}
                <small>
                  Verified {rating?.verifiedElo} · Open {rating?.openElo} ·{" "}
                  {rankForElo(rating?.openElo ?? 1000).name}
                </small>
              </span>
              <button
                type="button"
                className="fb-btn-ghost"
                onClick={() =>
                  dispatch({ type: "set-primary", sport: sport.id })
                }
              >
                {primary ? "Primary" : "Make primary"}
              </button>
            </div>
          );
        })}
      </section>

      <section className="fb-card">
        <h2>Week freezes</h2>
        <p className="fb-copy">
          {state.freezesLeft} of {STARTING_FREEZES} left. A freeze holds Elo
          for a taper or a vacation. It does not pause the lesson.
        </p>
        <button
          type="button"
          className="fb-btn"
          disabled={frozen || state.freezesLeft <= 0}
          onClick={() => dispatch({ type: "freeze" })}
        >
          {frozen ? "This week is frozen" : "Freeze this week"}
        </button>
      </section>

      <section className="fb-card">
        <h2>90-day calibration</h2>
        <p className="fb-copy">
          {state.calibrated
            ? "History is already in. Importing again replaces that sample and resets Elo from it."
            : "Import a sample of the last 90 days to leave the 1000 baseline. Live files replace this once a provider syncs."}
        </p>
        <div className="fb-stack">
          {(["light", "steady", "heavy"] as const).map((level) => (
            <button
              key={level}
              type="button"
              className="fb-btn-line"
              onClick={() => dispatch({ type: "import-history", level })}
            >
              Import {level} history
            </button>
          ))}
        </div>
      </section>

      <section className="fb-card">
        <h2>Connections</h2>
        <p className="fb-note">
          Link a source, then sync. Activity apps add a workout. WHOOP and Oura
          add a verified recovery mark. OAuth keys turn the stub into a live
          pull later.
        </p>
        {PROVIDERS.map((provider) => {
          const link = state.links.find((item) => item.provider === provider.id);
          return (
            <div key={provider.id} className="fb-row">
              <span className="fb-grow">
                {provider.name}
                <small>
                  {provider.blurb}
                  {link?.linked ? " · linked" : ""}
                </small>
              </span>
              {link?.linked ? (
                <button
                  type="button"
                  className="fb-btn-ghost"
                  onClick={() =>
                    dispatch({ type: "sync", provider: provider.id })
                  }
                >
                  Sync
                </button>
              ) : (
                <button
                  type="button"
                  className="fb-btn-ghost"
                  onClick={() =>
                    dispatch({ type: "link", provider: provider.id })
                  }
                >
                  Link
                </button>
              )}
            </div>
          );
        })}
      </section>

      <section className="fb-card">
        <h2>Ranks</h2>
        {RANK_BANDS.map((band) => (
          <div key={band.name} className="fb-row">
            <span className="fb-grow">
              {band.name}
              <small>
                {band.min}+ · {band.blurb}
              </small>
            </span>
          </div>
        ))}
        <p className="fb-note">
          Score is mostly distance, or time when there is no GPS. Heart rate
          can add a little. Pace adds less. An empty week decays Elo slightly,
          and it never falls below 500.
        </p>
      </section>
    </>
  );
}
