"use client";
import { useState } from "react";
import { useReducedMotion } from "motion/react";
import {
  APP_TIMEZONE,
  formatEloDelta,
  formatVolume,
  formatEffort,
  sportById,
  type PeriodResult,
  type UnitSystem,
} from "@fitness-battle/shared";
export function ResultCard({
  result,
  units,
}: {
  result: PeriodResult;
  units: UnitSystem;
}) {
  const [receipt, setReceipt] = useState(false),
    reduced = useReducedMotion();
  const range = `${new Date(result.periodStart).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: APP_TIMEZONE })} – ${new Date(Date.parse(result.periodEnd) - 1).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: APP_TIMEZONE })}`;
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
          <span>
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
          <small>
            {result.frozen
              ? "Weekly bonus held by freeze"
              : "Weekly placement bonus"}{" "}
            · {APP_TIMEZONE}
          </small>
        </>
      ) : (
        <>
          <span className="week-result-place">
            <strong>#{result.place}</strong>
            <span>of {result.fieldSize}</span>
          </span>
          <span>
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
        </>
      )}
      <span className="week-result-turn">
        {receipt ? "Back to result ↻" : "View receipt ↻"}
      </span>
    </button>
  );
}
