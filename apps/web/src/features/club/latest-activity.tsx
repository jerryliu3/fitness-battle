"use client";
import {
  APP_TIMEZONE,
  clubDuration,
  competeNow,
  countsOnTrack,
  isVerifiedActivity,
  sportById,
  type Activity,
  type CompeteState,
} from "@fitness-battle/shared";
export function LatestActivity({
  state,
  onOpen,
}: {
  state: CompeteState;
  onOpen: (activity: Activity) => void;
}) {
  const activity = state.activities
    .filter(
      (a) =>
        countsOnTrack(a, "open") &&
        Date.parse(a.startedAt) <= competeNow(state).getTime(),
    )
    .sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt))[0];
  if (!activity) return null;
  return (
    <section className="club-latest">
      <h2>Latest activity</h2>
      <button
        type="button"
        onClick={() => onOpen(activity)}
        className="club-activity-row"
      >
        <span className="club-activity-icon" aria-hidden="true">
          ↗
        </span>
        <span>
          <b>
            {sportById(activity.sport).name} ·{" "}
            {clubDuration(activity.movingSec)}
          </b>
          <small>
            {isVerifiedActivity(activity) ? "GPS verified" : "Open"} · Counted
          </small>
        </span>
        <span>
          <small>
            {new Date(activity.startedAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              timeZone: APP_TIMEZONE,
            })}
          </small>
          <span aria-hidden="true">→</span>
        </span>
      </button>
    </section>
  );
}
