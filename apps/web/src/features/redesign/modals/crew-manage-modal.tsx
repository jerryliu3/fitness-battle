"use client";

import { useState } from "react";
import type { CrewDetails, CrewMember } from "@fitness-battle/shared";

interface Props {
  open: boolean;
  crew: CrewDetails;
  members: CrewMember[];
  onClose: () => void;
  onUpdateCrew: (name: string, motto: string) => void;
}

export function CrewManageModal({ open, crew, members, onClose, onUpdateCrew }: Props) {
  const [name, setName] = useState(crew.name);
  const [motto, setMotto] = useState(crew.motto);
  const [copied, setCopied] = useState(false);

  if (!open) return null;

  function handleCopyInvite() {
    navigator.clipboard?.writeText(crew.inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="rd-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="rd-modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="rd-modal-header">
          <div>
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--lime-deep, #7ab800)", textTransform: "uppercase" }}>
              Squad Administration
            </span>
            <h2 className="rd-modal-title">Manage {crew.name}</h2>
          </div>
          <button type="button" className="rd-modal-close-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        {/* Invite Code Share */}
        <div style={{ background: "var(--paper, #eef1f4)", padding: 14, borderRadius: 14 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "var(--muted, #5c6578)", textTransform: "uppercase" }}>
            Crew Invite Code
          </span>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 4 }}>
            <span style={{ fontSize: 16, fontWeight: 800, letterSpacing: "0.08em", color: "var(--ink, #12141a)" }}>
              {crew.inviteCode}
            </span>
            <button
              type="button"
              onClick={handleCopyInvite}
              style={{
                background: "var(--ink, #12141a)",
                color: "#ffffff",
                border: "none",
                borderRadius: 8,
                padding: "6px 12px",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {copied ? "Copied! ✓" : "Copy Code"}
            </button>
          </div>
        </div>

        {/* Edit Crew Details */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
              Crew Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid var(--line, #dce1ea)",
                fontSize: 14,
                boxSizing: "border-box",
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
              Motto & Creed
            </label>
            <input
              type="text"
              value={motto}
              onChange={(e) => setMotto(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid var(--line, #dce1ea)",
                fontSize: 14,
                boxSizing: "border-box",
              }}
            />
          </div>
        </div>

        {/* Member Roster List */}
        <div>
          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--ink, #12141a)", display: "block", marginBottom: 6 }}>
            Roster ({members.length} / {crew.maxMembers} Members)
          </span>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {members.map((m) => (
              <div
                key={m.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "8px 12px",
                  borderRadius: 10,
                  background: "var(--paper, #eef1f4)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>{m.name}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, background: "#e2e8f0", padding: "2px 6px", borderRadius: 4 }}>
                    {m.role}
                  </span>
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: "var(--lime-deep, #7ab800)" }}>
                  {m.weeklyKm} km
                </span>
              </div>
            ))}
          </div>
        </div>

        <button
          type="button"
          className="rd-btn-primary"
          onClick={() => {
            onUpdateCrew(name, motto);
            onClose();
          }}
        >
          <span>Save Changes</span>
        </button>
      </div>
    </div>
  );
}
