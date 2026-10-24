"use client";
import { AppParagraph, AppHeading } from "@/ui/section";


import {
  formatEffort,
  formatVolume,
  initialsFromName,
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
      <AppHeading level={1} role="pageTitle">{name}</AppHeading>
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
  return (
    <div className="sp-records">
      <div>
        <span>Distance</span>
        <strong>
          {you
            ? formatVolume(sport, you.distanceM, you.movingSec, units)
            : "—"}
        </strong>
      </div>
      <div>
        <span>Effort</span>
        <strong>{you ? formatEffort(you.effort) : "—"}</strong>
      </div>
      <div>
        <span>Place</span>
        <strong>{you ? `${you.place} / ${fieldSize}` : "—"}</strong>
      </div>
    </div>
  );
}
