"use client";

import { useState } from "react";
import type { AvailableCompetition, SportSpec } from "@fitness-battle/shared";
import { SUPPORTED_SPORTS } from "@fitness-battle/shared";

interface Props {
  open: boolean;
  competitions: AvailableCompetition[];
  crewName?: string;
  onClose: () => void;
  onConfirmRegistration: (competitionId: string, format: "solo" | "crew", sportId: string) => void;
}

export function RegistrationDialog({
  open,
  competitions,
  crewName = "Neon Gazelles",
  onClose,
  onConfirmRegistration,
}: Props) {
  const [selectedCompId, setSelectedCompId] = useState<string>(competitions[0]?.id ?? "");
  const [format, setFormat] = useState<"solo" | "crew">("solo");
  const [selectedSport, setSelectedSport] = useState<string>("running");

  if (!open) return null;

  const currentComp = competitions.find((c) => c.id === selectedCompId) ?? competitions[0];

  return (
    <div className="rd-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="rd-modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="rd-modal-header">
          <div>
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--lime-deep, #7ab800)", textTransform: "uppercase" }}>
              Arena Enrollment
            </span>
            <h2 className="rd-modal-title">Register for Competition</h2>
          </div>
          <button type="button" className="rd-modal-close-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        {/* Competition Dropdown / Selection */}
        <div>
          <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 6, color: "var(--ink, #12141a)" }}>
            Select Competition League
          </label>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {competitions.map((comp) => {
              const isSelected = comp.id === selectedCompId;
              return (
                <div
                  key={comp.id}
                  onClick={() => setSelectedCompId(comp.id)}
                  style={{
                    padding: "10px 14px",
                    borderRadius: 12,
                    border: isSelected ? "2px solid var(--ink, #12141a)" : "1px solid var(--line, #dce1ea)",
                    background: isSelected ? "#f6fee7" : "var(--card, #ffffff)",
                    cursor: "pointer",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <p style={{ margin: "0 0 2px", fontSize: 13, fontWeight: 700, color: "var(--ink, #12141a)" }}>
                      {comp.title}
                    </p>
                    <p style={{ margin: 0, fontSize: 11, color: "var(--muted, #5c6578)" }}>
                      {comp.division} · Closes in {comp.closesInDays}d
                    </p>
                  </div>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      padding: "2px 7px",
                      borderRadius: 6,
                      background: comp.registrationStatus === "open" ? "#dcfce7" : "#ffedd5",
                      color: comp.registrationStatus === "open" ? "#166534" : "#9a3412",
                    }}
                  >
                    {comp.registrationStatus === "open" ? "Open" : "Closing Soon"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Solo vs Crew Segmented Selector */}
        <div>
          <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 6, color: "var(--ink, #12141a)" }}>
            Participation Format
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, background: "var(--paper, #eef1f4)", padding: 4, borderRadius: 12 }}>
            <button
              type="button"
              onClick={() => setFormat("solo")}
              style={{
                border: "none",
                borderRadius: 9,
                padding: "8px 0",
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
                background: format === "solo" ? "var(--card, #ffffff)" : "transparent",
                color: format === "solo" ? "var(--ink, #12141a)" : "var(--muted, #5c6578)",
                boxShadow: format === "solo" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
              }}
            >
              👤 Solo Entry
            </button>
            <button
              type="button"
              onClick={() => setFormat("crew")}
              style={{
                border: "none",
                borderRadius: 9,
                padding: "8px 0",
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
                background: format === "crew" ? "var(--card, #ffffff)" : "transparent",
                color: format === "crew" ? "var(--ink, #12141a)" : "var(--muted, #5c6578)",
                boxShadow: format === "crew" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
              }}
            >
              🛡 As a Crew ({crewName})
            </button>
          </div>
          <p style={{ margin: "6px 0 0", fontSize: 11, color: "var(--muted, #5c6578)" }}>
            {format === "solo"
              ? "You will be matched in a 12-athlete weekly cohort seeded by your verified Leo Elo score."
              : `Your mileage counts for both your personal record and the ${crewName} squad bracket.`}
          </p>
        </div>

        {/* Sport Selection */}
        <div>
          <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 6, color: "var(--ink, #12141a)" }}>
            Primary Sport Discipline
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 6 }}>
            {SUPPORTED_SPORTS.filter((s) => s.category !== "tracking").map((sport) => {
              const isSelected = sport.id === selectedSport;
              return (
                <button
                  key={sport.id}
                  type="button"
                  onClick={() => setSelectedSport(sport.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "8px 10px",
                    borderRadius: 10,
                    border: isSelected ? "2px solid var(--lime-deep, #7ab800)" : "1px solid var(--line, #dce1ea)",
                    background: isSelected ? "#f4faeb" : "var(--card, #ffffff)",
                    color: "var(--ink, #12141a)",
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <span style={{ fontSize: 14 }}>{sport.isGps ? "🛰" : "⚡"}</span>
                  <div style={{ overflow: "hidden" }}>
                    <div style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {sport.name}
                    </div>
                    <div style={{ fontSize: 10, fontWeight: 500, color: "var(--muted, #5c6578)" }}>
                      {sport.isGps ? "GPS Verified" : "Open Score"}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <button
          type="button"
          className="rd-btn-primary"
          onClick={() => {
            if (currentComp) {
              onConfirmRegistration(currentComp.id, format, selectedSport);
            }
            onClose();
          }}
        >
          <span>Confirm & Enter {format === "solo" ? "Solo" : "Crew"} Arena</span>
        </button>
      </div>
    </div>
  );
}
