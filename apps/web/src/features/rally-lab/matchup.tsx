import { comparisonScale, gapText, checkpoints } from "../worlds-lab/model";
import { Mascot } from "../worlds-lab/mascot";
import type { WorldProps } from "../worlds-lab/types";

export function Matchup({
  week,
  reference,
  playing,
  onCutoff,
  onReplay,
}: WorldProps) {
  const scale = comparisonScale(reference),
    name = reference.ghost
      ? "PAST YOU"
      : reference.name.split(" ")[0]!.toUpperCase();
  return (
    <section className="rf-matchup" aria-label="Your personal distance matchup">
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
            {week.total.toFixed(1)}
            <small>km</small>
          </strong>
        </div>
        <b className="rf-vs">VS</b>
        <div>
          <span>{name} / SAME CUTOFF</span>
          <strong>
            {week.against.toFixed(1)}
            <small>km</small>
          </strong>
        </div>
      </div>
      <div
        className="rf-court"
        role="img"
        aria-label={`You ${week.total.toFixed(1)} kilometers, ${reference.name} ${week.against.toFixed(1)} kilometers, on the same ${scale} kilometer scale`}
      >
        <div className="rf-court-lines" aria-hidden="true" />
        {[
          { id: "you", name: "YOU", initials: "YOU", km: week.total },
          {
            id: "reference",
            name,
            initials: reference.initials,
            km: week.against,
          },
        ].map((r) => (
          <div className={`rf-court-lane rf-court-${r.id}`} key={r.id}>
            <span>{r.name}</span>
            <div className="rf-court-track">
              <div
                className="rf-court-travel"
                style={{ width: `${(r.km / scale) * 100}%` }}
              />
              <b
                className="rf-court-dot"
                style={{ left: `${(r.km / scale) * 100}%` }}
              >
                {r.initials}
              </b>
            </div>
          </div>
        ))}
        <div className="rf-court-axis">
          <span>0 km / start</span>
          <span>{scale} km scale</span>
        </div>
      </div>
      <div className="rf-ace-call" aria-live="polite">
        <Mascot concept="rally" />
        <div>
          <span>ACE’S CALL</span>
          <strong>
            {week.cutoff === 0 ? "A fresh starting line." : gapText(week.gap)}
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
        <button className="rf-replay-button" onClick={onReplay}>
          {playing ? "Ⅱ Pause replay" : "▶ Replay my week"}
        </button>
        <div aria-label="Week checkpoints">
          {checkpoints.map((label, i) => (
            <button
              key={label}
              onClick={() => onCutoff(i)}
              aria-pressed={week.cutoff === i}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
