"use client";

import Link from "next/link";
import { deltaCopy, formatPts, type ComparisonMode, type TrackLane } from "../model";

export function TrackVerdict({
  comparison,
  youLane,
  ghostEffort,
  checkpointEffort,
  onOpenField,
}: {
  comparison: ComparisonMode;
  youLane: TrackLane | null;
  ghostEffort: number;
  checkpointEffort: number;
  onOpenField?: () => void;
}) {
  if (comparison === "field") {
    const place = youLane?.place ?? "—";
    return (
      <aside className="sp-verdict" aria-live="polite">
        <p className="sp-kicker">On the field</p>
        <strong>{String(place).padStart(2, "0")}</strong>
        <h2>in your matched weekly group.</h2>
        <p>
          Nearby lanes show the closest contest. Open the full field for every
          place.
        </p>
        <div className="sp-verdict-actions">
          <Link href="/splits" className="sp-cta">
            See what counted ↗
          </Link>
          {onOpenField ? (
            <button type="button" className="sp-link" onClick={onOpenField}>
              Open full field ↗
            </button>
          ) : (
            <Link href="/board" className="sp-link">
              Open the field ↗
            </Link>
          )}
        </div>
      </aside>
    );
  }

  const copy = deltaCopy(checkpointEffort, ghostEffort);
  return (
    <aside className="sp-verdict" aria-live="polite">
      <p className="sp-kicker">Against yourself</p>
      <strong>
        {copy.delta > 0 ? "+" : ""}
        {formatPts(Math.abs(copy.delta))}
      </strong>
      <h2>{copy.headline}</h2>
      <p>{copy.detail}</p>
      <div className="sp-verdict-actions">
        <Link href="/splits" className="sp-cta">
          See what counted ↗
        </Link>
        <Link href="/board" className="sp-link">
          Open the field ↗
        </Link>
      </div>
    </aside>
  );
}
