"use client";

import type { CheckpointIndex } from "@fitness-battle/shared";
import {
  formatPts,
  laneAtCheckpoint,
  type ComparisonMode,
  type TrackLane,
} from "../model";

export function RaceTrack({
  comparison,
  checkpoint,
  trackMax,
  youLane,
  ghostEffort,
  ghostName = "Your previous week",
  ghostInitials = "PW",
  nearby,
  onSelect,
}: {
  comparison: ComparisonMode;
  checkpoint: CheckpointIndex;
  trackMax: number;
  youLane: TrackLane | null;
  ghostEffort: number;
  ghostName?: string;
  ghostInitials?: string;
  nearby: TrackLane[];
  onSelect?: (lane: TrackLane) => void;
}) {
  const lanes = comparison === "self" ? (youLane ? [youLane] : []) : nearby;
  const mid = Math.round(trackMax / 2);

  return (
    <div
      className="sp-race-track"
      aria-label={`Score tracks from zero to ${trackMax} effort points. Accumulated points, not distance or live location.`}
    >
      <div className="sp-track-ruler">
        <span>0</span>
        <span>{mid}</span>
        <span>{trackMax} pts</span>
      </div>

      {comparison === "self" ? (
        <div className="sp-lane ghost" aria-hidden={ghostEffort <= 0}>
          <div className="sp-lane-label">
            <span>{ghostName}</span>
            <strong>
              {formatPts(ghostEffort)} <small>pts</small>
            </strong>
          </div>
          <div className="sp-lane-road">
            <span
              className="sp-lane-progress"
              style={{
                width: `${Math.min(100, (ghostEffort / trackMax) * 100)}%`,
              }}
            />
            <span
              className="sp-marker"
              style={{
                left: `${Math.min(100, (ghostEffort / trackMax) * 100)}%`,
              }}
            >
              {ghostInitials}
            </span>
          </div>
        </div>
      ) : null}

      {lanes.map((lane) => {
        const pts = laneAtCheckpoint(lane, checkpoint);
        const pct = Math.min(100, (pts / trackMax) * 100);
        const interactive = Boolean(onSelect);
        const body = (
          <>
            <span className="sp-lane-label">
              <span>{lane.name}</span>
              <strong>
                {formatPts(pts)} <small>pts</small>
              </strong>
            </span>
            <span className="sp-lane-road">
              <span className="sp-lane-progress" style={{ width: `${pct}%` }} />
              <span className="sp-marker" style={{ left: `${pct}%` }}>
                {lane.initials}
              </span>
            </span>
          </>
        );
        if (!interactive) {
          return (
            <div
              key={lane.id}
              className={`sp-lane${lane.you ? " your-lane" : ""}`}
            >
              {body}
            </div>
          );
        }
        return (
          <button
            key={lane.id}
            type="button"
            className={`sp-lane${lane.you ? " your-lane" : ""}`}
            onClick={() => onSelect?.(lane)}
            aria-label={`${lane.name}, ${formatPts(pts)} effort points`}
          >
            {body}
          </button>
        );
      })}

      <div className="sp-finish-label">
        <span>Accumulated weekly effort</span>
        <span>Same day cutoff</span>
      </div>
    </div>
  );
}
