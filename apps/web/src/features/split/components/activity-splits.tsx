"use client";

import {
  activityEffort,
  formatEffort,
  formatVolume,
  type Activity,
  type SportId,
  type UnitSystem,
} from "@fitness-battle/shared";
import { useState } from "react";

function dayLabel(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function ActivitySplits({
  activities,
  sport,
  units = "us",
}: {
  activities: Activity[];
  sport: SportId;
  units?: UnitSystem;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const total = activities.reduce((sum, item) => sum + activityEffort(item), 0);

  if (activities.length === 0) {
    return (
      <div className="sp-empty">
        <h2>No splits yet</h2>
        <p className="fb-copy">
          Sync a tracker or log work this week. Counted sessions appear here as
          numbered splits.
        </p>
      </div>
    );
  }

  return (
    <div className="sp-splits">
      {activities.map((activity, index) => {
        const pts = activityEffort(activity);
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
                <small>
                  {formatVolume(
                    sport,
                    activity.distanceM,
                    activity.movingSec,
                    units,
                  )}
                  {activity.verified ? " · verified" : " · open"}
                  {" · "}
                  {activity.source}
                </small>
              </span>
              <b>{formatEffort(pts)} pts</b>
            </button>
            {open ? (
              <p className="fb-note" style={{ padding: "0 4px 8px" }}>
                Counted toward this week’s effort.{" "}
                {activity.avgHr != null
                  ? `Avg HR ${activity.avgHr}. `
                  : "No heart-rate mark. "}
                Source: {activity.source}.
              </p>
            ) : null}
          </div>
        );
      })}
      <div className="sp-split-total">
        <span>
          {activities.length} session{activities.length === 1 ? "" : "s"}.
          Counted.
        </span>
        <strong>{formatEffort(total)}</strong>
      </div>
    </div>
  );
}
