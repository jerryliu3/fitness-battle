"use client";

import { useState } from "react";
import { APP_ICON_PATHS, APP_TIMEZONE, crewBadgeCollection, type CrewBadgeReceipt, type UnitSystem } from "@fitness-battle/shared";
import { Sheet } from "@/ui/sheet";

type Badge = ReturnType<typeof crewBadgeCollection>[number];

function Seal({ badge }: { badge: Badge }) {
  const earned = Boolean(badge.receipt);
  const { fill, edge, ink, radius } = badge.seal;
  return <span className="crew-passport-seal" data-earned={earned} aria-hidden="true"
    style={{ borderRadius: radius, ...(earned ? { backgroundColor: fill, borderColor: edge, color: ink } : {}) }}>
    <svg width="21" height="21" viewBox="0 0 24 24" fill="currentColor"><path d={APP_ICON_PATHS[badge.icon]} /></svg>
  </span>;
}

export function CrewBadgeCard({ crewName, badges, units }: {
  crewName: string;
  badges?: CrewBadgeReceipt[];
  units?: UnitSystem;
}) {
  const [open, setOpen] = useState(false);
  if (!badges) return null;
  const collection = crewBadgeCollection(badges, units);
  const count = collection.filter(badge => badge.receipt).length;
  const date = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: APP_TIMEZONE });
  return <>
    <button type="button" className="crew-passport-cover" onClick={() => setOpen(true)}>
      <span className="crew-passport-name">{crewName}</span>
      <strong className="crew-passport-title">Crew Passport</strong>
      <span className="crew-passport-slots">{collection.map(badge => <Seal key={badge.code} badge={badge} />)}</span>
      <span className="crew-passport-footer"><span>{count} of {collection.length} earned</span><strong>View badges →</strong></span>
    </button>
    <Sheet open={open} onClose={() => setOpen(false)} title="Crew Passport" body={crewName} fullScreen>
      <p>{count} of {collection.length} earned</p>
      <ul className="crew-passport-catalog">
        {collection.map(badge => <li key={badge.code}>
          <Seal badge={badge} />
          <strong>{badge.name}</strong>
          <span>{badge.result ?? badge.requirement}</span>
          {badge.receipt && <time dateTime={badge.receipt.earned_at}>{date.format(new Date(badge.receipt.earned_at))}</time>}
        </li>)}
      </ul>
    </Sheet>
  </>;
}
