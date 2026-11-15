"use client";
import { AppParagraph, AppText, Section } from "@/ui/section";

import Link from "next/link";
import {
  accountTimeZone,
  clubDuration,
  clubWeekSummary,
  latestClubRecap,
  settledWeekBreakdownTarget,
  sportById,
  type CompeteState,
} from "@fitness-battle/shared";
export function WeekRecap({ state }: { state: CompeteState }) {
  const displayTz = accountTimeZone(state);
  const week = clubWeekSummary(state),
    recap = latestClubRecap(state),
    breakdown = recap ? null : settledWeekBreakdownTarget(state);
  const difference = week.movingSec - week.previousSec;
  return (
    <Section className="club-week-recap" title="Your week, in perspective">

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
            <small> / {week.daysPassed}</small>
          </strong>
          <small>Active days</small>
        </div>
      </div>
      {week.previousSec ? (
        <AppParagraph typographyRole="caption" className="fb-note">
          {difference >= 0 ? "+" : "−"}
          {clubDuration(Math.abs(difference))} {week.daysPassed >= 7 ? "compared with all of last week." : "compared with this point last week."}
        </AppParagraph>
      ) : breakdown ? (
        <Link className="club-recap-link" href="/arena?breakdown=latest">
          <span>
            <b>Your last week in motion.</b>
            <AppText as="small" role="caption" secondary>
              {new Date(breakdown.periodStart).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                timeZone: displayTz,
              })} · View week breakdown
            </AppText>
          </span>
          <span aria-hidden="true">→</span>
        </Link>
      ) : null}
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
                timeZone: displayTz,
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
      ) : breakdown ? (
        <Link className="club-recap-link" href="/arena?breakdown=latest">
          <span>
            <b>Your last week in motion.</b>
            <AppText as="small" role="caption" secondary>
              {new Date(breakdown.periodStart).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                timeZone: displayTz,
              })} · View week breakdown
            </AppText>
          </span>
          <span aria-hidden="true">→</span>
        </Link>
      ) : null}
    </Section>
  );
}
