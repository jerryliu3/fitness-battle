"use client";

import { AnimatedEmber } from "@/components/mascot/ember";
import { formatEffort } from "@fitness-battle/shared";
import type { BoardRow } from "@fitness-battle/shared";
import type { CSSProperties } from "react";

export interface RosterGhost {
  id: string;
  name: string;
  effort: number;
  /** Short note under the name (e.g. “Reference · not ranked”). */
  detail?: string;
}

export function FieldRoster({
  rows,
  onSelect,
  selectedId,
  detail = "rating",
  unit = "pts",
  ghost = null,
}: {
  rows: BoardRow[];
  onSelect?: (id: string) => void;
  selectedId?: string;
  /** What the secondary line explains. */
  detail?: "rating" | "distance";
  unit?: string;
  /** Past-self (or other) ghost — shown as a reference, never ranked. */
  ghost?: RosterGhost | null;
}) {
  const maxEffort = Math.max(
    1,
    ...rows.map((r) => r.effort),
    ghost?.effort ?? 0,
  );
  const youRow = rows.find((r) => r.you) ?? null;

  return (
    <div className="sp-roster" role="list" aria-label="Weekly field">
      {ghost ? (
        onSelect ? (
          <button
            key={ghost.id}
            type="button"
            role="listitem"
            className={[
              "sp-roster-item",
              "ghost-ref",
              selectedId === ghost.id ? "selected" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            style={
              {
                "--effort-pct": `${Math.min(100, Math.round((ghost.effort / maxEffort) * 100))}%`,
              } as CSSProperties
            }
            aria-pressed={selectedId === ghost.id}
            onClick={() => onSelect(ghost.id)}
          >
            <span className="sp-roster-fill" aria-hidden="true" />
            <span className="place" aria-label="Not ranked">
              ·
            </span>
            <span className="grow">
              <strong>{ghost.name}</strong>
              <small>{ghost.detail ?? "Reference · not ranked"}</small>
            </span>
            <b>
              {formatEffort(ghost.effort)} {unit}
            </b>
          </button>
        ) : (
          <div
            key={ghost.id}
            role="listitem"
            className="sp-roster-row sp-roster-item ghost-ref"
            style={
              {
                "--effort-pct": `${Math.min(100, Math.round((ghost.effort / maxEffort) * 100))}%`,
              } as CSSProperties
            }
          >
            <span className="sp-roster-fill" aria-hidden="true" />
            <span className="place" aria-label="Not ranked">
              ·
            </span>
            <span className="grow">
              <strong>{ghost.name}</strong>
              <small>{ghost.detail ?? "Reference · not ranked"}</small>
            </span>
            <b>
              {formatEffort(ghost.effort)} {unit}
            </b>
          </div>
        )
      ) : null}
      {rows.map((row) => {
        const pct = Math.min(100, Math.max(4, Math.round((row.effort / maxEffort) * 100)));
        const className = [
          "sp-roster-item",
          row.you ? "you" : "",
          row.place <= 3 ? `is-top-${row.place}` : "",
          selectedId === row.id ? "selected" : "",
        ]
          .filter(Boolean)
          .join(" ");
        const baseSecondary =
          detail === "distance"
            ? `${(row.distanceM / 1000).toFixed(1)} km`
            : `Rating ${row.elo}`;
        const gapFromYou =
          youRow && !row.you ? row.effort - youRow.effort : 0;
        const gapNote =
          youRow && !row.you
            ? gapFromYou > 0.05
              ? ` · +${formatEffort(gapFromYou)} ${unit} ahead`
              : gapFromYou < -0.05
                ? ` · ${formatEffort(Math.abs(gapFromYou))} ${unit} behind you`
                : " · Tied with you"
            : row.you && row.place === 1
              ? " · Leading the week"
              : "";
        const secondary = `${baseSecondary}${gapNote}`;
        const style = { "--effort-pct": `${pct}%` } as CSSProperties;

        const body = (
          <>
            <span className="sp-roster-fill" aria-hidden="true" />
            <span className={`place place-${row.place}`}>{row.place}</span>
            <span className="grow">
              <span className="sp-roster-name-row">
                {row.you ? (
                  <span className="sp-roster-ember" aria-hidden="true">
                    <AnimatedEmber
                      clip={row.place === 1 ? "celebrate" : "idle"}
                      size={26}
                      shadow={false}
                    />
                  </span>
                ) : null}
                <strong>{row.you ? "You" : row.name}</strong>
              </span>
              <small>{secondary}</small>
            </span>
            <b>
              {formatEffort(row.effort)} {unit}
            </b>
          </>
        );
        if (onSelect) {
          return (
            <button
              key={row.id}
              type="button"
              role="listitem"
              className={className}
              style={style}
              aria-pressed={selectedId === row.id}
              onClick={() => onSelect(row.id)}
            >
              {body}
            </button>
          );
        }
        return (
          <div
            key={row.id}
            role="listitem"
            className={`sp-roster-row ${className}`}
            style={style}
          >
            {body}
          </div>
        );
      })}
    </div>
  );
}
