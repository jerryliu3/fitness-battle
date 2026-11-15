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
  type PeriodResult,
  type UnitSystem,
} from "@fitness-battle/shared";
export function ResultCard({
  result,
  units,
  variant = "default",
}: {
  result: PeriodResult;
  units: UnitSystem;
  variant?: "default" | "recap";
}) {
  const [receipt, setReceipt] = useState(false),
    reduced = useReducedMotion();
  const range = formatPeriodDateRange(result.periodStart, result.periodEnd);

  if (variant === "recap") {
    const sport = sportById(result.sport);
    const deltaText = formatEloDelta(result.eloBefore, result.eloAfter);
    const podiumWin = !result.frozen && result.place <= 3;
    return (
      <button
        type="button"
        className={`week-recap-result-card${receipt ? " is-expanded" : ""}`}
        aria-label={`${receipt ? "Hide" : "View"} ${sport.name} result receipt`}
        aria-expanded={receipt}
        onClick={() => setReceipt(!receipt)}
      >
        <div className="week-recap-result-top">
          <span className="week-recap-result-title">
            <SportActivityIcon sport={result.sport} size={18} />
            <strong>Your result</strong>
          </span>
          <span className={`week-recap-place-pill${podiumWin ? " is-podium" : ""}`}>
            {ordinalPlace(result.place)} of {result.fieldSize}{result.frozen ? " · Frozen" : ""}
          </span>
        </div>
        <div className="week-recap-result-metrics">
          {weekRecapMetrics(result, units).map((metric) => (
            <div key={metric.key}><span>{metric.key.toUpperCase()}</span><strong>{metric.value}</strong></div>
          ))}
        </div>
        {receipt && (
          <div className="week-recap-result-receipt">
            <div><span>Starting score</span><b>{result.eloBefore}</b></div>
            <div><span>Round adjustment</span><b>{deltaText}{result.frozen ? " (frozen)" : ""}</b></div>
            <div><span>Final rating</span><b>{result.eloAfter}</b></div>
            <div><span>Window</span><b>Eastern time · Mon–Mon</b></div>
          </div>
        )}
      </button>
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