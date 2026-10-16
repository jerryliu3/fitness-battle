"use client";
import { CrewPanel } from "@/features/rally/crew-panel";
export function FieldScreen() {
  return (
    <div className="focus-crew">
      <header className="focus-heading">
        <p className="fb-kicker">Your people</p>
        <h1>A little further, together.</h1>
        <p className="fb-copy">Different paces. Same direction.</p>
      </header>
      <CrewPanel />
    </div>
  );
}
