"use client";
import { AppParagraph, AppText, typographyStyle, SectionHeader } from "@/ui/section";

import {
  buildSleepView,
  formatClock,
  formatSleepDuration,
  healthMetricById,
  selfLaneLabel,
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
  onLeave,
  leaveLabel = "Stop after this week",
}: {
  state: CompeteState;
  now: Date;
  onJoin: () => void;
  onLeave: () => void;
  leaveLabel?: string;
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
      <AppParagraph typographyRole="label" className="fb-kicker">
        Health · {metric.name} ·{" "}
        {formatClock({
          startsAt: view.periodStart,
          endsAt: view.periodEnd,
          kind: "weekly",
        })}
      </AppParagraph>
      <SectionHeader title="Last night"/>

      {!view.optedIn ? (
        <div className="sp-empty">
          <SectionHeader title="Sleep is its own board"/>
          <AppParagraph typographyRole="body" className="fb-copy">
            WHOOP, Oura, Garmin, Apple Health, and Health Connect can send a
            night. The week ranks the average of those scores.
          </AppParagraph>
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
              <AppParagraph typographyRole="body" className="fb-copy">
                {formatSleepDuration(night.durationMin)}
                {night.efficiency != null ? ` · ${night.efficiency}% efficient` : ""}
                {night.verified ? "" : " · entered on this device"}
              </AppParagraph>
              {delta != null ? (
                <AppParagraph typographyRole="caption" className="fb-note">
                  {delta >= 0 ? "+" : ""}
                  {Math.round(delta)} vs your recent nightly average
                </AppParagraph>
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
                <AppText as="small" role="caption" secondary style={{ ...typographyStyle("caption"), display: "block", color: "var(--fb-muted, #768375)" }}>
                  Avg: {view.mean.toFixed(0)} · nights you miss count against this
                  week&apos;s contest score
                </AppText>
              ) : null}
            </div>
            <div>
              <span>Nights so far</span>
              <strong>
                {view.elapsedNights > 0 ? (
                  <>
                    {view.nightsLogged}
                    <AppText as="small" role="caption" secondary> / {view.elapsedNights}</AppText>
                  </>
                ) : (
                  "—"
                )}
              </strong>
            </div>
            <div>
              <span>Field</span>
              <strong>
                {view.place ?? "—"}
                <AppText as="small" role="caption" secondary> / {view.fieldSize || "—"}</AppText>
              </strong>
            </div>
          </div>

          {view.rows.length > 0 ? (
            <ol className="sl-board">
              {view.rows.map((row) => (
                <li key={row.id} className={row.you ? "is-you" : ""}>
                  <span>{row.place}</span>
                  <span>
                    {row.you ? selfLaneLabel(row.name) : row.name}
                    <AppText as="small" role="caption" secondary>
                      {row.lastNight == null ? "No night yet" : `Last night ${row.lastNight}`}
                    </AppText>
                  </span>
                  <b>{row.score.toFixed(0)}</b>
                </li>
              ))}
            </ol>
          ) : null}
        </>
      ) : (
        <div className="sp-empty">
          <SectionHeader title="No night recorded yet"/>
          <AppParagraph typographyRole="body" className="fb-copy">
            Connect a supported sleep tracker in Athlete → Data Sync.
          </AppParagraph>

        </div>
      )}
    </section>
  );
}
