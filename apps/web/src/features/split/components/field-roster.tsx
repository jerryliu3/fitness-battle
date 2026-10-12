"use client";

import { formatEffort } from "@fitness-battle/shared";
import type { BoardRow } from "@fitness-battle/shared";

export function FieldRoster({
  rows,
  onSelect,
  selectedId,
  detail = "rating",
}: {
  rows: BoardRow[];
  onSelect?: (id: string) => void;
  selectedId?: string;
  /** What the secondary line explains. */
  detail?: "rating" | "distance";
}) {
  return (
    <div className="sp-roster" role="list" aria-label="Weekly field">
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
            : `Rating ${row.elo}`;
        const body = (
          <>
            <span className="place">{row.place}</span>
            <span className="grow">
              {row.you ? "You" : row.name}
              <small>{secondary}</small>
            </span>
            <b>{formatEffort(row.effort)} pts</b>
          </>
        );
        if (onSelect) {
          return (
            <button
              key={row.id}
              type="button"
              role="listitem"
              className={className}
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
          >
            {body}
          </div>
        );
      })}
    </div>
  );
}
