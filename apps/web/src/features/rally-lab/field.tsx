import { distanceFor, laneRunners, placeFor } from "../evolution-lab/model";
import type { WorldProps } from "../worlds-lab/types";

export function DistanceField(p: WorldProps) {
  const scale =
    Math.ceil(Math.max(...laneRunners.map((r) => distanceFor(r, 3))) / 5) * 5;
  return (
    <section
      className="rf-distance-field"
      aria-label="The nine-person sample field"
    >
      <header>
        <div>
          <span className="rf-kicker">THE WHOLE PICTURE</span>
          <h2>A place is only half the story.</h2>
        </div>
        <strong>
          {placeFor("you", p.week.cutoff)}
          <small>/ 9 distance place</small>
        </strong>
      </header>
      <div className="rf-field-axis">
        <span>Accumulated distance →</span>
        <span>0–{scale} km shared scale</span>
      </div>
      <div className="rf-field-lanes">
        {laneRunners.map((r) => {
          const km = distanceFor(r, p.week.cutoff),
            gap = Math.round((km - p.week.total) * 1000) / 1000;
          return (
            <button
              key={r.id}
              className={`rf-field-row ${r.you ? "rf-field-you" : ""}`}
              aria-pressed={!r.you && p.reference.id === r.id}
              disabled={r.you}
              onClick={() => p.onReference(r.id)}
              aria-label={`${r.name}, ${km.toFixed(1)} kilometers${r.you ? ", your position" : `, ${Math.abs(gap).toFixed(1)} kilometers ${gap >= 0 ? "ahead" : "behind"}. Compare with this runner`}`}
            >
              <span className="rf-field-person">
                <b>{r.you ? "YOU" : r.initials}</b>
                <span>
                  {r.name.split(" ")[0]}
                  <small>
                    {r.you
                      ? "Your lane"
                      : Math.abs(gap) < 0.001
                        ? "Level with you"
                        : `${Math.abs(gap).toFixed(1)} km ${gap > 0 ? "ahead" : "behind"}`}
                  </small>
                </span>
              </span>
              <span className="rf-field-track">
                <span style={{ width: `${(km / scale) * 100}%` }} />
                <i style={{ left: `${(km / scale) * 100}%` }} />
              </span>
              <strong>
                {km.toFixed(1)}
                <small>km</small>
              </strong>
            </button>
          );
        })}
      </div>
      <p>
        Lane order stays fixed. Position along the line shows actual mileage;
        select a runner to open your matchup.
      </p>
    </section>
  );
}
