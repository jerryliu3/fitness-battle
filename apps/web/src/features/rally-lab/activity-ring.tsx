import type { Activity } from "../design-lab/data";

/** A 10 km distance scale, not a prescribed workout goal or completion percentage. */
export function ActivityRing({
  activity,
  counted = true,
  onOpen,
}: {
  activity: Activity;
  counted?: boolean;
  onOpen: () => void;
}) {
  const circumference = 2 * Math.PI * 44;
  const km = counted ? activity.km : 0;
  return (
    <button
      className="rf-move"
      disabled={!counted}
      onClick={onOpen}
      aria-label={`${activity.title}, ${activity.km} kilometers, ${counted ? "counted sample import. Open activity" : "not yet counted at this replay cutoff"}`}
    >
      <span className="rf-move-day">
        {activity.day}
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
            strokeDasharray={`${Math.min(km / 10, 1) * circumference} ${circumference}`}
            transform="rotate(-90 56 56)"
          />
        </svg>
        <strong>
          {km.toFixed(1)}
          <small>km</small>
        </strong>
      </div>
      <strong className="rf-move-name">{activity.title}</strong>
      <span className="rf-move-time">
        {counted
          ? `${activity.minutes} min · Running ↗`
          : "Not yet in the week’s total"}
      </span>
    </button>
  );
}
