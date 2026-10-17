"use client";

import {
  formatEloDelta,
  formatEffort,
  formatPlace,
  primaryRevealResults,
  sportById,
  type CompeteState,
} from "@fitness-battle/shared";

function weekLabel(periodStart: string, periodEnd: string): string {
  const start = new Date(periodStart).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
  const end = new Date(new Date(periodEnd).getTime() - 1).toLocaleDateString(
    "en-US",
    {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    },
  );
  return `${start} – ${end}`;
}

export function WeekReveal({
  state,
  onDismiss,
}: {
  state: CompeteState;
  onDismiss: () => void;
}) {
  // Derive from acknowledgedAt; ignore any stale pendingRevealIds blob.
  const reveals = primaryRevealResults(
    state.periodResults,
    undefined,
    state.primary,
  );
  if (reveals.length === 0) return null;
  const result = reveals[0]!;
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
      <p className="sp-reveal-kicker">Week complete · UTC</p>
      <h2 id="week-reveal-title">{headline}</h2>
      <p className="sp-reveal-week">
        {sport.name} · {weekLabel(result.periodStart, result.periodEnd)}
        {result.track === "verified" ? " · verified" : " · all efforts"}
      </p>

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

      {result.frozen ? (
        <p className="fb-note">
          This week was frozen. Your effort score did not move.
        </p>
      ) : result.effort <= 0 ? (
        <p className="fb-note">
          No counted effort this week, so effort score decayed slightly.
        </p>
      ) : (
        <p className="fb-note">
          Final place in your matched group sets next week’s starting effort score.
          The new week is already open. A crew keeps the same invite code.
        </p>
      )}

      <button
        type="button"
        className="fb-btn-line"
        onClick={() => {
          const text = `${headline} ${sport.name} ${formatPlace(result.place, result.fieldSize)}, ${formatEffort(result.effort)} effort.`;
          void navigator.clipboard?.writeText(text);
        }}
      >
        Copy recap
      </button>
      <button type="button" className="sp-cta" onClick={onDismiss}>
        Play next week
      </button>
    </section>
  );
}
