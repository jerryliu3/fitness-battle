"use client";
import { SectionStack } from "@/ui/section";
import { useEffect, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
export function ProgressHub({
  overview,
  effort,
  history = null,
}: {
  overview: ReactNode;
  effort: ReactNode;
  history?: ReactNode;
}) {
  const params = useSearchParams();
  const requested = params.get("view");
  const [view, setView] = useState("overview");
  useEffect(() => {
    if (requested === "effort") setView("effort");
  }, [requested]);
  return (
    <div className="club-progress">
      <div className="club-text-tabs" role="group" aria-label="Progress view">
        {[
          { id: "overview", label: "Overview" },
          { id: "effort", label: "Effort score" },
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
        <SectionStack divided={false}>{overview}</SectionStack>
      </div>
      <div className="club-progress-section" hidden={view !== "effort"}>
        <SectionStack divided={false}>{effort}</SectionStack>
      </div>
    </div>
  );
}
