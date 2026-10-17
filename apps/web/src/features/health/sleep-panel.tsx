"use client";

import {
  buildSleepView,
  formatClock,
  formatSleepDuration,
  healthMetricById,
  stageShares,
  type CompeteState,
  type SleepNight,
} from "@fitness-battle/shared";
import "./health.css";

function StageBar({ night }: { night: SleepNight }) {
  const shares = stageShares(night);
  const parts = [
    ["deep", "Deep", shares.deep],
    ["rem", "REM", shares.rem],
    ["light", "Light", shares.light],
    ["awake", "Awake", shares.awake],
  ] as const;
  return (
    <div className="sl-stages" aria-hidden>
      {parts.map(([id, label, share]) =>
        share > 0 ? (
          <i key={id} className={`sl-stage sl-stage-${id}`} style={{ flex: share }} title={label} />
        ) : null,
      )}
    </div>
  );
}

export function SleepPanel({
  state,
  now,
  onJoin,
  onSample,
  onLeave,
}: {
  state: CompeteState;
  now: Date;
  onJoin: () => void;
  onSample: () => void;
  onLeave: () => void;
}) {
  const metric = healthMetricById("sleep");
  const rating = state.healthRatings.find((item) => item.metric === "sleep");
  if (!rating) return null;
  const view = buildSleepView({
    name: state.name,
    nights: state.sleepNights,
    rating,
    results: state.healthResults,
    now,
  });
  const night = view.lastNight;
  const delta =
    night && view.previousMean != null ? night.score - view.previousMean : null;

  return (
    <section className="sl-panel" aria-label="Sleep">
      <p className="fb-kicker">
        Health · {metric.name} ·{" "}
        {formatClock({
          startsAt: view.periodStart,
          endsAt: view.periodEnd,
          kind: "weekly",
        })}
      </p>
      <h2 className="sl-heading">
        Last night
        <span>not a distance.</span>
      </h2>
      <p className="fb-copy">{metric.blurb}</p>

      {!view.optedIn ? (
        <div className="sp-empty">
          <h2>Sleep is its own board</h2>
          <p className="fb-copy">
            WHOOP, Oura, Garmin, Apple Health, and Health Connect can send a
            night. The week ranks the average of those scores.
          </p>
          <button type="button" className="fb-btn" onClick={onJoin}>
            Join sleep this week
          </button>
        </div>
      ) : night ? (
        <>
          <div className="sl-hero">
            <div>
              <p className="sl-score">
                <strong>{night.score}</strong>
                <span>sleep score</span>
              </p>
              <p className="fb-copy">
                {formatSleepDuration(night.durationMin)}
                {night.efficiency != null ? ` · ${night.efficiency}% efficient` : ""}
                {night.verified ? "" : " · entered on this device"}
              </p>
              {delta != null ? (
                <p className="fb-note">
                  {delta >= 0 ? "+" : ""}
                  {Math.round(delta)} vs your recent nightly average
                </p>
              ) : null}
            </div>
            <div className="sl-night">
              <StageBar night={night} />
              <ul className="sl-legend">
                <li>Deep {night.deepMin ?? 0}m</li>
                <li>REM {night.remMin ?? 0}m</li>
                <li>Light {night.lightMin ?? 0}m</li>
                <li>Awake {night.awakeMin ?? 0}m</li>
              </ul>
            </div>
          </div>

          <div
            className="sl-week"
            aria-label="Nights this week"
            style={{ gridTemplateColumns: `repeat(${Math.max(view.days.length, 1)}, 1fr)` }}
          >
            {view.days.map((cell) => (
              <div key={cell.day} className={cell.night ? "sl-day" : "sl-day is-empty"}>
                <i
                  style={{
                    height: cell.night ? `${Math.max(8, cell.night.score)}%` : undefined,
                  }}
                />
                <span>{cell.label}</span>
              </div>
            ))}
          </div>

          <div className="sl-stats">
            <div>
              <span>Contest score</span>
              <strong>{view.nightsLogged ? view.contestScore.toFixed(0) : "—"}</strong>
              {view.nightsLogged ? (
                <small style={{ display: "block", fontSize: "11px", color: "var(--fb-muted, #768375)" }}>
                  Avg: {view.mean.toFixed(0)}
                </small>
              ) : null}
            </div>
            <div>
              <span>Nights logged</span>
              <strong>
                {view.nightsLogged}
                <small> / 7</small>
              </strong>
            </div>
            <div>
              <span>Field</span>
              <strong>
                {view.place ?? "—"}
                <small> / {view.fieldSize || "—"}</small>
              </strong>
            </div>
          </div>

          {view.rows.length > 0 ? (
            <ol className="sl-board">
              {view.rows.map((row) => (
                <li key={row.id} className={row.you ? "is-you" : ""}>
                  <span>{row.place}</span>
                  <span>
                    {row.you ? "You" : row.name}
                    <small>
                      {row.lastNight == null ? "No night yet" : `Last night ${row.lastNight}`}
                    </small>
                  </span>
                  <b>{row.score.toFixed(0)}</b>
                </li>
              ))}
            </ol>
          ) : null}

          {view.latestResult ? (
            <p className="fb-note">
              Last closed week: place {view.latestResult.place} of {view.latestResult.fieldSize},
              score {view.latestResult.score.toFixed(0)}. Rating {view.latestResult.eloBefore} →{" "}
              {view.latestResult.eloAfter}.
            </p>
          ) : (
            <p className="fb-note">
              Missing nights count. A single great night does not cover a blank week.
            </p>
          )}

          <button type="button" className="fb-btn-ghost" onClick={onLeave}>
            Leave sleep
          </button>
        </>
      ) : (
        <div className="sp-empty">
          <h2>No night recorded yet</h2>
          <p className="fb-copy">
            Sync a sleep tracker from Athlete, or drop in a sample night to see the
            week.
          </p>
          <button type="button" className="fb-btn" onClick={onSample}>
            Use a sample night
          </button>
        </div>
      )}
    </section>
  );
}
