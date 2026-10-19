"use client";

import {
  APP_TIMEZONE,
  formatEloDelta,
  formatEffort,
  formatPlace,
  primaryRevealResults,
  sportById,
  sportRenewal,
  type CompeteState,
  type SportId,
} from "@fitness-battle/shared";

function weekLabel(periodStart: string, periodEnd: string): string {
  const start = new Date(periodStart).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: APP_TIMEZONE,
  });
  const end = new Date(new Date(periodEnd).getTime() - 1).toLocaleDateString(
    "en-US",
    {
      month: "short",
      day: "numeric",
      timeZone: APP_TIMEZONE,
    },
  );
  return `${start} – ${end}`;
}

export function WeekReveal({
  state,
  onDismiss,
  onStop,
  onKeep,
  onJoin,
}: {
  state: CompeteState;
  onDismiss: (revealId: string) => void;
  onStop: (sport: SportId) => void;
  onKeep: (sport: SportId) => void;
  onJoin: (sport: SportId) => void;
}) {
  const reveals = primaryRevealResults(
    state.periodResults,
    undefined,
    state.primary,
  );
  if (reveals.length === 0) return null;
  const result = reveals[0]!;
  const renewal = sportRenewal(state, result.sport);
  const delta = result.eloAfter - result.eloBefore;
  const sport = sportById(result.sport);
  const headline =
    result.frozen
      ? "Week held."
      : result.place === 1
        ? "You took the field."
        : delta > 0
          ? "Week closed up."
          : delta < 0
            ? "Week closed."
            : "Week settled even.";

  return (
    <section
      className="sp-reveal"
      role="dialog"
      aria-labelledby="week-reveal-title"
      aria-modal="false"
    >
      <h2 id="week-reveal-title" className="sp-reveal-week">
        {sport.name} · {weekLabel(result.periodStart, result.periodEnd)} ·{" "}
        {headline}
      </h2>

      <div className="sp-reveal-grid">
        <div>
          <span>Place</span>
          <strong>{formatPlace(result.place, result.fieldSize)}</strong>
        </div>
        <div>
          <span>Effort</span>
          <strong>{formatEffort(result.effort)}</strong>
        </div>
        <div>
          <span>Effort Score</span>
          <strong>
            {result.eloBefore}
            <small> → {result.eloAfter}</small>
          </strong>
        </div>
        <div>
          <span>Change</span>
          <strong
            data-delta={delta > 0 ? "up" : delta < 0 ? "down" : "flat"}
          >
            {formatEloDelta(result.eloBefore, result.eloAfter)}
          </strong>
        </div>
      </div>

      {renewal.enrolled && renewal.renews ? (
        <button type="button" className="fb-btn-line" onClick={() => onStop(result.sport)}>
          Stop after this week
        </button>
      ) : null}
      {renewal.enrolled && !renewal.renews ? (
        <button type="button" className="fb-btn-line" onClick={() => onKeep(result.sport)}>
          Keep playing next week
        </button>
      ) : null}
      <button
        type="button"
        className="sp-cta"
        onClick={() => {
          if (!renewal.enrolled) onJoin(result.sport);
          onDismiss(result.id);
        }}
      >
        {renewal.enrolled ? "Continue" : "Play this week"}
      </button>
    </section>
  );
}
