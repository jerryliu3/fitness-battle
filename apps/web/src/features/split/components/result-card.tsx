"use client";
import { AppText } from "@/ui/section";
import { SportActivityIcon } from "@/ui/sport-activity-icon";

import { useState } from "react";
import { useReducedMotion } from "motion/react";
import {
  APP_TIMEZONE,
  formatEloDelta,
  formatPeriodDateRange,
  formatVolume,
  formatEffort,
  ordinalPlace,
  sportById,
  weekRecapMetrics,
  type CompetitionReplay,
  type PeriodResult,
  type UnitSystem,
} from "@fitness-battle/shared";
export function ResultCard({
  result,
  units,
  variant = "default",
  replay,
  hiddenIds = [],
}: {
  result: PeriodResult;
  units: UnitSystem;
  variant?: "default" | "recap";
  replay?: CompetitionReplay | null;
  hiddenIds?: readonly string[];
}) {
  const [receipt, setReceipt] = useState(false),
    reduced = useReducedMotion();
  const range = formatPeriodDateRange(result.periodStart, result.periodEnd);

  if (variant === "recap") {
    const delta = result.eloAfter - result.eloBefore;
    const deltaText = formatEloDelta(result.eloBefore, result.eloAfter);
    const showDelta = !result.frozen;
    const podiumWin = !result.frozen && result.place <= 3;
    return (
      <section className="week-recap-result-card" aria-label="Your result">
        <div className="week-recap-result-top">
          <AppText role="caption" className="week-recap-result-title">Your result</AppText>
          <AppText role="label" className={`week-recap-place-pill${podiumWin ? " is-podium" : ""}`}>
            {ordinalPlace(result.place)} place{result.frozen ? " · Frozen" : ""}
          </AppText>
        </div>
        <div className="week-recap-result-metrics">
          {weekRecapMetrics(result, units, replay, hiddenIds).map((metric) => (
            <div key={metric.key}>
              <AppText role="caption">{metric.key}</AppText>
              <AppText role="value" className="week-recap-result-value">
                {metric.value}
                {metric.key === "Effort" && showDelta && (
                  <AppText role="label" className={`week-recap-rating-delta${delta > 0 ? " is-pos" : delta < 0 ? " is-neg" : ""}`}> ({deltaText})</AppText>
                )}
              </AppText>
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <button
      type="button"
      className={`week-result-card${receipt ? " is-receipt" : ""}`}
      aria-label={`${receipt ? "Hide" : "View"} ${sportById(result.sport).name} result receipt`}
      aria-expanded={receipt}
      onClick={() => setReceipt(!receipt)}
      onPointerMove={(e) => {
        if (reduced) return;
        const r = e.currentTarget.getBoundingClientRect();
        e.currentTarget.style.setProperty(
          "--card-x",
          `${((e.clientY - r.top) / r.height) * 6 - 3}deg`,
        );
        e.currentTarget.style.setProperty(
          "--card-y",
          `${3 - ((e.clientX - r.left) / r.width) * 6}deg`,
        );
      }}
      onPointerLeave={(e) => {
        e.currentTarget.style.removeProperty("--card-x");
        e.currentTarget.style.removeProperty("--card-y");
      }}
    >
      <span className="fb-kicker">
        {sportById(result.sport).name} ·{" "}
        {result.track === "verified" ? "GPS" : "Open"} · {range}
      </span>
      {receipt ? (
        <>
          <strong className="week-result-heading">The receipt</strong>
          <span className="week-result-volume">
            {formatVolume(
              result.sport,
              result.distanceM,
              result.movingSec,
              units,
            )}{" "}
            · {formatEffort(result.effort)} effort
          </span>
          <span>
            {result.eloBefore} → {result.eloAfter} effort score
          </span>
          <AppText as="small" role="caption" secondary>
            {result.frozen
              ? "Weekly score adjustment held by freeze"
              : "Weekly score adjustment"}{" "}
            · {APP_TIMEZONE}
          </AppText>
        </>
      ) : (
        <>
          <span className="week-result-podium" aria-hidden="true">
            {(
              [
                { step: 2, label: "2nd", height: 50 },
                { step: 1, label: "1st", height: 64 },
                { step: 3, label: "3rd", height: 40 },
              ] as const
            ).map((podium) => {
              const isYou = result.place === podium.step;
              return (
                <span
                  key={podium.step}
                  className={`week-result-podium-step${isYou ? " is-you" : ""}`}
                  style={{ height: podium.height }}
                >
                  <b>{podium.label}</b>
                  {isYou ? <small>YOU</small> : null}
                </span>
              );
            })}
          </span>
          <span className="week-result-bento">
          <span className="week-result-place">
            <strong>#{result.place}</strong>
            <span>of {result.fieldSize}</span>
          </span>
          <span className="week-result-volume">
            {formatVolume(
              result.sport,
              result.distanceM,
              result.movingSec,
              units,
            )}
          </span>
          <span className="week-result-score">
            <b>{result.eloAfter}</b> effort score <em>{formatEloDelta(result.eloBefore,result.eloAfter)}</em>
          </span>
          </span>
        </>
      )}
      <span className="week-result-turn">
        {receipt ? "View result ↻" : "View receipt ↻"}
      </span>
    </button>
  );
}