"use client";
import { AppParagraph, AppText, Section } from "@/ui/section";

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
    <Section className="club-week-recap" title="Your week, in perspective" action={<span aria-hidden="true">↗</span>}>

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
      <AppParagraph typographyRole="caption" className="fb-note">
        {week.previousSec
          ? `${difference >= 0 ? "+" : "−"}${clubDuration(Math.abs(difference))} compared with all of last week.`
          : "Each session builds your story."}
      </AppParagraph>
      {recap ? (
        <Link className="club-recap-link" href="/arena?results=latest">
          <span className="club-recap-stamp" aria-hidden="true">
            {recap.place}
          </span>
          <span>
            <b>Your latest settled week.</b>
            <AppText as="small" role="caption" secondary>
              {sportById(recap.sport).name} · {recap.track === "verified" ? "GPS" : "Open"} ·{" "}
              {new Date(recap.periodStart).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                timeZone: APP_TIMEZONE,
              })}{" "}
              · Place {recap.place} of {recap.fieldSize}
            </AppText>
            <AppText as="small" role="caption" secondary>
              {recap.eloAfter - recap.eloBefore >= 0 ? "+" : ""}
              {recap.eloAfter - recap.eloBefore} Effort Score · View recap
            </AppText>
          </span>
          <span aria-hidden="true">→</span>
        </Link>
      ) : (
        <AppParagraph typographyRole="caption" className="fb-note">
          Your first settled competition recap will appear here.
        </AppParagraph>
      )}
    </Section>
  );
}
