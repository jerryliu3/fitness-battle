import {
  formatRallyValue,
  laneValueAt,
  placeAtCutoff,
  type RallyBoard,
  type RallyCutoff,
  type RallyReference,
} from "./model";

export function DistanceField({
  rally,
  weekCutoff,
  weekTotal,
  reference,
  onReference,
}: {
  rally: RallyBoard;
  weekCutoff: RallyCutoff;
  weekTotal: number;
  reference: RallyReference;
  onReference: (id: string) => void;
}) {
  const values = rally.lanes.map((lane) => laneValueAt(lane, weekCutoff));
  const scale =
    Math.max(5, Math.ceil(Math.max(...values, weekTotal, 1) / 5) * 5);
  const place = placeAtCutoff(rally, weekCutoff);
  const unit = rally.unit;

  return (
    <section
      className="rf-distance-field"
      aria-label="The weekly field by accumulated distance"
    >
      <header>
        <div>
          <span className="rf-kicker">THE WHOLE PICTURE</span>
          <h2>A place is only half the story.</h2>
        </div>
        <strong>
          {place}
          <small>
            / {Math.max(rally.lanes.length, 1)} distance place
          </small>
        </strong>
      </header>
      <div className="rf-field-axis">
        <span>Accumulated {unit === "km" ? "distance" : "effort"} →</span>
        <span>
          0–{scale} {unit} shared scale
        </span>
      </div>
      <div className="rf-field-lanes">
        {rally.lanes.map((lane) => {
          const value = laneValueAt(lane, weekCutoff);
          const gap = Math.round((value - weekTotal) * 1000) / 1000;
          return (
            <button
              key={lane.id}
              type="button"
              className={`rf-field-row ${lane.you ? "rf-field-you" : ""}`}
              aria-pressed={!lane.you && reference.id === lane.id}
              disabled={lane.you}
              onClick={() => onReference(lane.id)}
              aria-label={`${lane.name}, ${formatRallyValue(value, unit)} ${unit}${lane.you ? ", your position" : `, ${Math.abs(gap).toFixed(1)} ${unit} ${gap >= 0 ? "ahead" : "behind"}. Compare with this runner`}`}
            >
              <span className="rf-field-person">
                <b>{lane.you ? "YOU" : lane.initials}</b>
                <span>
                  {lane.you ? "You" : lane.name.split(" ")[0]}
                  <small>
                    {lane.you
                      ? "Your lane"
                      : Math.abs(gap) < 0.001
                        ? "Level with you"
                        : `${formatRallyValue(Math.abs(gap), unit)} ${unit} ${gap > 0 ? "ahead" : "behind"}`}
                  </small>
                </span>
              </span>
              <span className="rf-field-track">
                <span style={{ width: `${(value / scale) * 100}%` }} />
                <i style={{ left: `${(value / scale) * 100}%` }} />
              </span>
              <strong>
                {formatRallyValue(value, unit)}
                <small>{unit}</small>
              </strong>
            </button>
          );
        })}
      </div>
      <p>
        Lane order stays fixed. Position along the line shows actual{" "}
        {unit === "km" ? "mileage" : "effort"}; select a runner to open your
        matchup.
      </p>
    </section>
  );
}
