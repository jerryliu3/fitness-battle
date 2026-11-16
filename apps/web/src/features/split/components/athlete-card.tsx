"use client";
import { AppParagraph, AppHeading } from "@/ui/section";

import {
  formatEffort,
  formatVolume,
  initialsFromName,
  sportById,
  type BoardRow,
  type SportId,
  type UnitSystem,
} from "@fitness-battle/shared";

export function AthleteCard({
  name,
  city,
  sportLabel,
  you,
  placeLabel,
}: {
  name: string;
  city: string;
  sportLabel: string;
  you: BoardRow | null;
  placeLabel: string;
}) {
  const bib = initialsFromName(name);
  return (
    <section className="sp-bib" aria-label="Athlete record">
      <AppParagraph typographyRole="body" className="label">Athlete · {bib}</AppParagraph>
      <div className="number">{you ? String(you.place).padStart(3, "0") : "—"}</div>
      <AppHeading level={1} role="display">{name}</AppHeading>
      <div className="sp-bib-meta">
        <span>{sportLabel}</span>
        <span>{city || "—"}</span>
        <span>{placeLabel}</span>
      </div>
    </section>
  );
}

export function WeekRecords({
  sport,
  you,
  units = "us",
  fieldSize,
}: {
  sport: SportId;
  you: BoardRow | null;
  units?: UnitSystem;
  fieldSize: number;
}) {
  const gps = sportById(sport).gps;
  return (
    <div className="sp-records">
      <div>
        <span>{gps ? "Distance" : "Volume"}</span>
        <strong>
          {you
            ? formatVolume(sport, you.distanceM, you.movingSec, units, you.effort)
            : "—"}
        </strong>
      </div>
      <div>
        <span>Effort score</span>
        <strong>{you ? formatEffort(you.elo) : "—"}</strong>
      </div>
      <div>
        <span>Place</span>
        <strong>{you ? `${you.place} / ${fieldSize}` : "—"}</strong>
      </div>
    </div>
  );
}
