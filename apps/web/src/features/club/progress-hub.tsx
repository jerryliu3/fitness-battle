"use client";
import { useEffect, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
export function ProgressHub({
  overview,
  effort,
  history,
}: {
  overview: ReactNode;
  effort: ReactNode;
  history: ReactNode;
}) {
  const params = useSearchParams();
  const requested = params.get("view");
  const [view, setView] = useState("overview");
  useEffect(() => {
    if (requested === "effort") setView("effort");
  }, [requested]);
  return (
    <div className="club-progress">
      <header className="club-page-heading">
        <p className="fb-kicker">Every effort adds up</p>
        <h1>Progress</h1>
        <p className="fb-copy">A little further. A little more you.</p>
      </header>
      <div className="focus-segments" role="group" aria-label="Progress view">
        {[
          { id: "overview", label: "Overview" },
          { id: "effort", label: "Effort score" },
          { id: "history", label: "History" },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            aria-pressed={view === tab.id}
            onClick={() => setView(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="club-progress-section" hidden={view !== "overview"}>
        {overview}
      </div>
      <div className="club-progress-section" hidden={view !== "effort"}>
        {effort}
      </div>
      <div className="club-progress-section" hidden={view !== "history"}>
        {history}
      </div>
    </div>
  );
}
