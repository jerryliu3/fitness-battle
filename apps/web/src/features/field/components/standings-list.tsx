"use client";

import type { ReactNode } from "react";
import { arenaValueDecimals, effortRankBadge, rankSymbolForScore, standingsBar } from "@fitness-battle/shared";
import { PolishedRacer } from "@/features/brand/polished-racer";
import { RankAvatar } from "@/ui/rank-symbol";

export interface StandingsRowItem {
  id: string;
  name: string;
  avatarUrl?: string | null;
  you?: boolean;
  value: number;
}

/** Shared ranked athlete standings list used in both Compete and Overtake Replay. */
export function StandingsList<T extends StandingsRowItem>({
  ranked,
  unit,
  scores = {},
  onSelectAthlete,
  onOpenProfile,
  footer,
}: {
  ranked: readonly T[];
  unit: string;
  scores?: Readonly<Record<string, number | undefined>>;
  onSelectAthlete?: (lane: T) => void;
  onOpenProfile?: (lane: T, rank: number) => void;
  footer?: ReactNode;
}) {
  const leaderValue = Math.max(ranked[0]?.value ?? 0, 0.0001);
  const placeOf = (value: number) => 1 + ranked.filter((lane) => lane.value > value).length;

  return (
    <div className="focus-standings-bars" role="list">
      {ranked.map((lane) => {
        const rank = placeOf(lane.value);
        const bar = standingsBar(lane.value, leaderValue, rank);
        const elo = scores[lane.id];
        return (
          <div
            key={lane.id}
            role="listitem"
            className={
              lane.you
                ? "focus-standing-bar-row is-you"
                : "focus-standing-bar-row"
            }
            onClick={onSelectAthlete ? () => onSelectAthlete(lane) : undefined}
            tabIndex={onSelectAthlete ? 0 : undefined}
            onKeyDown={
              onSelectAthlete
                ? (event) => {
                    if (
                      event.target === event.currentTarget &&
                      (event.key === "Enter" || event.key === " ")
                    ) {
                      event.preventDefault();
                      onSelectAthlete(lane);
                    }
                  }
                : undefined
            }
          >
            <span className="focus-standing-rank">{rank}</span>
            <button
              type="button"
              aria-label={`Open ${lane.name}'s profile`}
              onClick={
                onOpenProfile
                  ? (event) => {
                      event.stopPropagation();
                      onOpenProfile(lane, rank);
                    }
                  : undefined
              }
              disabled={!onOpenProfile}
              style={{
                border: 0,
                padding: 0,
                background: "transparent",
                cursor: onOpenProfile ? "pointer" : "default",
                overflow: "visible",
              }}
            >
              <RankAvatar
                rank={rankSymbolForScore(elo)}
                src={lane.avatarUrl}
                name={lane.name}
                size={52}
                fallback={
                  <svg
                    className="focus-standing-avatar"
                    width="26"
                    height="36"
                    viewBox="-40 -50 80 100"
                    aria-hidden="true"
                  >
                    <PolishedRacer
                      x={0}
                      y={0}
                      you={Boolean(lane.you)}
                      gold={rank === 1}
                      showWake={false}
                    />
                  </svg>
                }
              />
            </button>
            <div className="focus-standing-bar-content">
              <div className="focus-standing-bar-top">
                <strong className="focus-standing-name">
                  {lane.name}
                  {elo != null ? ` ${effortRankBadge(elo).symbol}` : ""}
                </strong>
                <div className="focus-standing-metrics">
                  <strong>
                    {lane.value.toFixed(arenaValueDecimals(unit))} {unit}
                  </strong>
                  <small>{elo ?? "—"} effort score</small>
                </div>
              </div>
              <div className="focus-standing-bar-track" aria-hidden="true">
                <div
                  className={
                    rank === 1
                      ? "focus-standing-bar-fill is-leader"
                      : lane.you
                        ? "focus-standing-bar-fill is-you"
                        : "focus-standing-bar-fill"
                  }
                  style={{ width: `${bar.percent}%`, background: bar.color }}
                />
              </div>
            </div>
          </div>
        );
      })}
      {footer}
    </div>
  );
}
