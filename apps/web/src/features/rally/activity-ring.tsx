import type { RallyMove, RallyUnit } from "./model";
import { formatRallyValue } from "./model";

/** Shared 10 km (or proportional) distance scale — mileage fill, not a workout goal. */
export function ActivityRing({
  move,
  unit,
  counted = true,
  onOpen,
}: {
  move: RallyMove;
  unit: RallyUnit;
  counted?: boolean;
  onOpen: () => void;
}) {
  const circumference = 2 * Math.PI * 44;
  const display = counted ? (unit === "km" ? move.km : move.minutes / 6) : 0;
  const labelValue = counted
    ? unit === "km"
      ? move.km
      : move.minutes
    : 0;
  const unitLabel = unit === "km" ? "km" : "min";

  return (
    <button
      type="button"
      className="rf-move"
      disabled={!counted}
      onClick={onOpen}
      aria-label={`${move.title}, ${formatRallyValue(labelValue, unit === "km" ? "km" : "pts")} ${unitLabel}, ${counted ? "counted import. Open activity" : "not yet counted at this replay cutoff"}`}
    >
      <span className="rf-move-day">
        {move.day}
        <span>{counted ? "Counted ✓" : "Later in replay"}</span>
      </span>
      <div className="rf-ring">
        <svg viewBox="0 0 112 112" aria-hidden="true">
          <circle cx="56" cy="56" r="44" className="rf-ring-track" />
          <circle
            cx="56"
            cy="56"
            r="44"
            className="rf-ring-value"
            strokeDasharray={`${Math.min(display / 10, 1) * circumference} ${circumference}`}
            transform="rotate(-90 56 56)"
          />
        </svg>
        <strong>
          {unit === "km" ? labelValue.toFixed(1) : Math.round(labelValue)}
          <small>{unitLabel}</small>
        </strong>
      </div>
      <strong className="rf-move-name">{move.title}</strong>
      <span className="rf-move-time">
        {counted
          ? `${move.minutes} min · ${move.verified ? "Verified" : "Open"} ↗`
          : "Not yet in the week’s total"}
      </span>
    </button>
  );
}
