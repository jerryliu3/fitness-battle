"use client";
import Link from "next/link";
import {
  APP_TIMEZONE,
  clubDuration,
  clubWeekSummary,
  latestClubRecap,
  sportById,
  type CompeteState,
} from "@fitness-battle/shared";
export function WeekRecap({ state }: { state: CompeteState }) {
  const week = clubWeekSummary(state),
    recap = latestClubRecap(state);
  const difference = week.movingSec - week.previousSec;
  return (
    <section className="club-week-recap">
      <div className="club-section-heading">
        <h2>Your week, in perspective</h2>
        <span aria-hidden="true">↗</span>
      </div>
      <div className="club-week-metrics">
        <div>
          <strong>{clubDuration(week.movingSec)}</strong>
          <small>Active time</small>
        </div>
        <div>
          <strong>{week.sessions}</strong>
          <small>Sessions</small>
        </div>
        <div>
          <strong>
            {week.activeDays}
            <small> / 7</small>
          </strong>
          <small>Active days</small>
        </div>
      </div>
      <p className="fb-note">
        {week.previousSec
          ? `${difference >= 0 ? "+" : "−"}${clubDuration(Math.abs(difference))} compared with all of last week.`
          : "Each counted session builds your story."}
      </p>
      {recap ? (
        <Link className="club-recap-link" href="/arena?results=latest">
          <span className="club-recap-stamp" aria-hidden="true">
            {recap.place}
          </span>
          <span>
            <b>Your latest settled week.</b>
            <small>
              {sportById(recap.sport).name} · {recap.track === "verified" ? "GPS" : "Open"} ·{" "}
              {new Date(recap.periodStart).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                timeZone: APP_TIMEZONE,
              })}{" "}
              · Place {recap.place} of {recap.fieldSize}
            </small>
            <small>
              {recap.eloAfter - recap.eloBefore >= 0 ? "+" : ""}
              {recap.eloAfter - recap.eloBefore} Effort Score · View recap
            </small>
          </span>
          <span aria-hidden="true">→</span>
        </Link>
      ) : (
        <p className="fb-note">
          Your first settled competition recap will appear here.
        </p>
      )}
    </section>
  );
}
