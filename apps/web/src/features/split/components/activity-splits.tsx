"use client";
import { AppParagraph, AppText, SectionHeader } from "@/ui/section";


import {
  APP_TIMEZONE,
  accountTimeZone,
  activityTrainingXp,
  trainingXpInPeriod,
  formatTrainingXp,
  formatVolume,
  type Activity,
  type CompeteState,
  type SportId,
  type UnitSystem,
} from "@fitness-battle/shared";
import { useState } from "react";

export function ActivitySplits({
  activities,
  sport,
  units = "us",
  state,
}: {
  activities: Activity[];
  sport: SportId;
  units?: UnitSystem;
  state?: CompeteState | null;
}) {
  const displayTz = state ? accountTimeZone(state) : APP_TIMEZONE;
  const dayLabel = (iso: string): string =>
    new Date(iso).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      timeZone: displayTz,
    });
  const [openId, setOpenId] = useState<string | null>(null);
  const history = state?.activities ?? activities;
  const total = trainingXpInPeriod({activities}, new Date(0), new Date(Date.now()+1), undefined, history);

  if (activities.length === 0) {
    return (
      <div className="sp-empty">
        <SectionHeader title="No splits yet"/>
        <AppParagraph typographyRole="body" className="fb-copy">
          Sync a tracker or log work this week. Sessions appear here as
          numbered splits.
        </AppParagraph>
      </div>
    );
  }

  return (
    <div className="sp-splits">
      {activities.map((activity, index) => {
        const pts = activityTrainingXp(activity, history);
        const open = openId === activity.id;
        return (
          <div key={activity.id}>
            <button
              type="button"
              className="sp-split-entry"
              aria-expanded={open}
              onClick={() => setOpenId(open ? null : activity.id)}
            >
              <span className="num">{String(index + 1).padStart(2, "0")}</span>
              <span>
                <strong>{dayLabel(activity.startedAt)}</strong>
                <AppText as="small" role="caption" secondary>
                  {formatVolume(
                    sport,
                    activity.distanceM,
                    activity.movingSec,
                    units,
                  )}
                  {activity.verified ? " · GPS Tracked" : " · activity"}
                  {" · "}
                  {activity.source}
                </AppText>
              </span>
              <b>{formatTrainingXp(pts)} XP</b>
            </button>
            {open ? (
              <AppParagraph typographyRole="caption" className="fb-note" style={{ padding: "0 4px 8px" }}>
                Contributes to your Effort Score.{" "}
                {activity.avgHr != null
                  ? `Avg HR ${activity.avgHr}. `
                  : "No heart-rate mark. "}
                Source: {activity.source}.
              </AppParagraph>
            ) : null}
          </div>
        );
      })}
      <div className="sp-split-total">
        <span>
          {activities.length} session{activities.length === 1 ? "" : "s"}.
        </span>
        <strong>{formatTrainingXp(total)} XP</strong>
      </div>
    </div>
  );
}
