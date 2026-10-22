"use client";
import { CrewPanel } from "@/features/rally/crew-panel";
export function FieldScreen() {
  return (
    <div className="focus-crew">
      <header className="club-page-heading"><p className="fb-kicker">Better, together</p><h1>Crew</h1><p className="fb-copy">Different paces. Same direction.</p></header>
      <CrewPanel />
    </div>
  );
}
