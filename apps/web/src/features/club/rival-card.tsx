"use client";
import { AppText, AppParagraph, AppHeading } from "@/ui/section";

import Link from "next/link";
import {
  competeNow,
  competitionTrack,
  formatEffort,
  formatVolume,
  nextClubRival,
  sportById,
  weeklyBoard,
  type CompeteState,
} from "@fitness-battle/shared";

export function RivalCard({ state }: { state: CompeteState }) {
  const sport =
    state.ratings.find((r) => r.sport === state.primary && r.optedIn)?.sport ??
    state.ratings.find((r) => r.optedIn)?.sport;
  const { you, rival, fieldSize } = nextClubRival(
    sport ? weeklyBoard(state, sport, competitionTrack(sport), competeNow(state)) : [],
  );
  const synthetic = Boolean(
    rival &&
      state.enrollments
        .find((e) => e.sport === sport)
        ?.syntheticIds.includes(rival.id),
  );
  const gap =
    rival && you && sport
      ? sportById(sport).gps
        ? formatVolume(
            sport,
            Math.max(0, rival.distanceM - you.distanceM),
            0,
            state.units,
          )
        : `${formatEffort(Math.max(0, rival.effort - you.effort))} pts`
      : null;
  return (
    <Link
      href={sport ? `/arena?event=${sport}` : "/arena"}
      className="club-rival-card"
    >
      <img className="club-landscape" src="/club/alpine-trail.jpg" alt="" />
      <div className="club-rival-top">
        <div>
          <AppHeading level={2} role="contentTitle">{sport ? sportById(sport).name : "Find your field"}</AppHeading>
        </div>
        {you ? (
          <span className="club-place">
            <b>{you.place}</b> / {fieldSize}
            <AppText as="small" role="caption" secondary>place</AppText>
          </span>
        ) : null}
      </div>
      <div className="club-rival-bottom">
        <div>
          <strong>
            {rival
              ? `${gap} to ${rival.name.split(" ")[0]}`
              : you
                ? "You’re leading the way."
                : "Your next chapter starts here."}
          </strong>
          <AppParagraph typographyRole="body">
            {rival
              ? synthetic
                ? "Next rival · simulated athlete"
                : "Next rival in your field"
              : you
                ? "Keep showing up. Every effort counts."
                : "Register for a weekly event."}
          </AppParagraph>
        </div>
        <span className="club-round-arrow" aria-hidden="true">
          ↗
        </span>
      </div>
    </Link>
  );
}
