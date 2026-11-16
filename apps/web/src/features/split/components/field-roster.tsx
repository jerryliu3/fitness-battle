"use client";
import { AppText } from "@/ui/section";


import { formatArenaVolume, type BoardRow, type CompeteState, type SportId } from "@fitness-battle/shared";
import { motion, useReducedMotion } from "motion/react";

export interface RosterGhost {
  id: string;
  name: string;
  effort: number;
  /** Short note under the name (e.g. “Reference · not ranked”). */
  detail?: string;
}

export function FieldRoster({
  rows,
  sport,
  units = "us",
  onSelect,
  selectedId,
  detail = "rating",
  ghost = null,
}: {
  rows: BoardRow[];
  sport: SportId;
  units?: CompeteState["units"];
  onSelect?: (id: string) => void;
  selectedId?: string;
  /** What the secondary line explains. */
  detail?: "rating" | "distance";
  /** Past-self (or other) ghost — shown as a reference, never ranked. */
  ghost?: (RosterGhost & { distanceM?: number; movingSec?: number }) | null;
}) {
  const volumeLabel = (totals: { distanceM: number; movingSec: number; effort: number }) =>
    formatArenaVolume(sport, totals, units);
  const reduced = useReducedMotion();
  const layout = reduced ? false : "position" as const;
  const transition = { layout: { type: "spring" as const, stiffness: 380, damping: 34 } };
  return (
    <div className="sp-roster" role="list" aria-label="Weekly field">
      {ghost ? (
        onSelect ? (
          <button
            key={ghost.id}
            type="button"
            role="listitem"
            className={[
              "ghost-ref",
              selectedId === ghost.id ? "selected" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            aria-pressed={selectedId === ghost.id}
            onClick={() => onSelect(ghost.id)}
          >
            <span className="place" aria-label="Not ranked">
              ·
            </span>
            <span className="grow">
              {ghost.name}
              <AppText as="small" role="caption" secondary>{ghost.detail ?? "Reference · not ranked"}</AppText>
            </span>
            <b>
              {volumeLabel({ distanceM: ghost.distanceM ?? 0, movingSec: ghost.movingSec ?? 0, effort: ghost.effort })}
            </b>
          </button>
        ) : (
          <div
            key={ghost.id}
            role="listitem"
            className="sp-roster-row ghost-ref"
          >
            <span className="place" aria-label="Not ranked">
              ·
            </span>
            <span className="grow">
              {ghost.name}
              <AppText as="small" role="caption" secondary>{ghost.detail ?? "Reference · not ranked"}</AppText>
            </span>
            <b>
              {volumeLabel({ distanceM: ghost.distanceM ?? 0, movingSec: ghost.movingSec ?? 0, effort: ghost.effort })}
            </b>
          </div>
        )
      ) : null}
      {rows.map((row) => {
        const className = [
          row.you ? "you" : "",
          selectedId === row.id ? "selected" : "",
        ]
          .filter(Boolean)
          .join(" ");
        const secondary =
          detail === "distance"
            ? `${(row.distanceM / 1000).toFixed(1)} km`
            : `Effort Score ${row.elo}`;
        const body = (
          <>
            <span className="place">{row.place}</span>
            <span className="grow">
              {row.name}
              <AppText as="small" role="caption" secondary>{secondary}</AppText>
            </span>
            <b>
              {volumeLabel(row)}
            </b>
          </>
        );
        if (onSelect) {
          return (
            <motion.button
              key={row.id}
              layout={layout}
              transition={transition}
              type="button"
              role="listitem"
              className={className}
              aria-pressed={selectedId === row.id}
              onClick={() => onSelect(row.id)}
            >
              {body}
            </motion.button>
          );
        }
        return (
          <motion.div
            key={row.id}
            layout={layout}
            transition={transition}
            role="listitem"
            className={`sp-roster-row ${className}`}
          >
            {body}
          </motion.div>
        );
      })}
    </div>
  );
}
