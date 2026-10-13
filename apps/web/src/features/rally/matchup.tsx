import { Ace } from "./ace";
import {
  comparisonScale,
  formatRallyValue,
  gapText,
  type RallyCutoff,
  type RallyReference,
  type RallySnapshot,
  type RallyUnit,
} from "./model";

const DEFAULT_CHECKPOINTS = ["Start", "Early", "Mid", "Now"] as const;

export function Matchup({
  week,
  reference,
  playing,
  unit,
  checkpointLabels,
  onCutoff,
  onReplay,
}: {
  week: RallySnapshot;
  reference: RallyReference;
  playing: boolean;
  unit: RallyUnit;
  checkpointLabels: readonly string[];
  onCutoff: (n: RallyCutoff) => void;
  onReplay: () => void;
}) {
  const scale = comparisonScale(week.total, week.against);
  const name = reference.ghost
    ? "PAST YOU"
    : reference.name.split(" ")[0]!.toUpperCase();
  const labels =
    checkpointLabels.length === 3
      ? (["Start", ...checkpointLabels] as string[])
      : [...DEFAULT_CHECKPOINTS];
  const unitLabel = unit;

  return (
    <section className="rf-matchup" aria-label="Your personal matchup">
      <header>
        <span>
          {reference.ghost
            ? "YOUR PERSONAL MATCHUP"
            : "A LITTLE FRIENDLY COMPETITION"}
        </span>
        <b>{week.label} cutoff</b>
      </header>
      <div className="rf-scoreboard">
        <div>
          <span>YOU / THIS WEEK</span>
          <strong>
            {formatRallyValue(week.total, unit)}
            <small>{unitLabel}</small>
          </strong>
        </div>
        <b className="rf-vs">VS</b>
        <div>
          <span>{name} / SAME CUTOFF</span>
          <strong>
            {formatRallyValue(week.against, unit)}
            <small>{unitLabel}</small>
          </strong>
        </div>
      </div>
      <div
        className="rf-court"
        role="img"
        aria-label={`You ${formatRallyValue(week.total, unit)} ${unitLabel}, ${reference.name} ${formatRallyValue(week.against, unit)} ${unitLabel}, on the same ${scale} ${unitLabel} scale`}
      >
        <div className="rf-court-lines" aria-hidden="true" />
        {[
          { id: "you", name: "YOU", initials: "YOU", value: week.total },
          {
            id: "reference",
            name,
            initials: reference.initials,
            value: week.against,
          },
        ].map((row) => (
          <div className={`rf-court-lane rf-court-${row.id}`} key={row.id}>
            <span>{row.name}</span>
            <div className="rf-court-track">
              <div
                className="rf-court-travel"
                style={{ width: `${(row.value / scale) * 100}%` }}
              />
              <b
                className="rf-court-dot"
                style={{ left: `${(row.value / scale) * 100}%` }}
              >
                {row.initials}
              </b>
            </div>
          </div>
        ))}
        <div className="rf-court-axis">
          <span>0 {unitLabel} / start</span>
          <span>
            {scale} {unitLabel} scale
          </span>
        </div>
      </div>
      <div className="rf-ace-call" aria-live="polite">
        <Ace />
        <div>
          <span>ACE’S CALL</span>
          <strong>
            {week.cutoff === 0
              ? "A fresh starting line."
              : gapText(week.gap, unit)}
          </strong>
          <p>
            {week.cutoff === 0
              ? "Your week has room to be your own."
              : reference.ghost
                ? "Compared with your own week. Same point in time."
                : `Compared with ${reference.name.split(" ")[0]}. Same point in time.`}
          </p>
        </div>
      </div>
      <div className="rf-replay">
        <button type="button" className="rf-replay-button" onClick={onReplay}>
          {playing ? "Ⅱ Pause replay" : "▶ Replay my week"}
        </button>
        <div aria-label="Week checkpoints">
          {labels.map((label, index) => (
            <button
              key={label}
              type="button"
              onClick={() => onCutoff(index as RallyCutoff)}
              aria-pressed={week.cutoff === index}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
