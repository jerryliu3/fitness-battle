"use client";
import { AppParagraph, AppHeading } from "@/ui/section";

import Link from "next/link";
import {
  competeNow,
  competitionTrack,
  clubRivalCardSummary,
  sportById,
  weeklyBoard,
  type CompeteState,
} from "@fitness-battle/shared";

export function RivalCard({ state }: { state: CompeteState }) {
  const sport =
    state.ratings.find((r) => r.sport === state.primary && r.optedIn)?.sport ??
    state.ratings.find((r) => r.optedIn)?.sport;
  const { place, headline, caption } = clubRivalCardSummary(
    sport ? weeklyBoard(state, sport, competitionTrack(sport), competeNow(state)) : [],
    sport,
    state.units,
    state.enrollments.find(e => e.sport === sport)?.syntheticIds,
  );
  return (
    <Link
      href={sport ? `/arena?event=${sport}` : "/arena"}
      className="club-rival-card"
    >
      <img className="club-landscape" src="/club/alpine-trail.jpg" alt="" />
      <div className="club-rival-top">
        <div>
          <AppHeading level={2} role="heading">{sport ? sportById(sport).name : "Find your field"}</AppHeading>
        </div>
        {place ? (
          <span className="club-place">
            <b>{place}</b>
          </span>
        ) : null}
      </div>
      <div className="club-rival-bottom">
        <div>
          <strong>{headline}</strong>
          <AppParagraph typographyRole="body">{caption}</AppParagraph>
        </div>
        <span className="club-round-arrow" aria-hidden="true">
          ↗
        </span>
      </div>
    </Link>
  );
}
