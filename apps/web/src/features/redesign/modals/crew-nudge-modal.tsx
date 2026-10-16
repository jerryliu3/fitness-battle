"use client";

import { useState } from "react";
import type { CrewMember } from "@fitness-battle/shared";

interface Props {
  open: boolean;
  member: CrewMember | null;
  onClose: () => void;
  onSendNudge: (memberName: string, message: string) => void;
}

const PRESET_NUDGES = [
  { emoji: "👟", label: "Lace up!", text: "Hey! Lace up for today's crew miles!" },
  { emoji: "🔥", label: "You got this!", text: "Let's push today! We're only 16 km behind Tokyo Striders." },
  { emoji: "⚡", label: "Need your km!", text: "We need your contribution to lock the top-3 podium this week!" },
  { emoji: "🙌", label: "High five!", text: "Great consistency this week, keep the momentum alive!" },
];

export function CrewNudgeModal({ open, member, onClose, onSendNudge }: Props) {
  const [selectedPreset, setSelectedPreset] = useState(PRESET_NUDGES[0]!.text);
  const [sent, setSent] = useState(false);

  if (!open || !member) return null;

  function handleSend() {
    onSendNudge(member?.name ?? "Teammate", selectedPreset);
    setSent(true);
    setTimeout(() => {
      setSent(false);
      onClose();
    }, 1200);
  }

  return (
    <div className="rd-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="rd-modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="rd-modal-header">
          <div>
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--lime-deep, #7ab800)", textTransform: "uppercase" }}>
              Squad Motivation
            </span>
            <h2 className="rd-modal-title">Nudge {member.name}</h2>
          </div>
          <button type="button" className="rd-modal-close-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12, background: "var(--paper, #eef1f4)", padding: 12, borderRadius: 14 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: "50%",
              background: "var(--accent, #1a1f2b)",
              color: "var(--lime, #b7f255)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 18,
              fontWeight: 800,
            }}
          >
            {member.name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "var(--ink, #12141a)" }}>
              {member.name} ({member.role})
            </p>
            <p style={{ margin: "2px 0 0", fontSize: 11, color: "var(--muted, #5c6578)" }}>
              Logged {member.weeklyKm} km this week · Last active {member.lastActiveLabel}
            </p>
          </div>
        </div>

        <div>
          <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 8, color: "var(--ink, #12141a)" }}>
            Choose Nudge Message
          </label>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {PRESET_NUDGES.map((preset, idx) => {
              const isSelected = selectedPreset === preset.text;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelectedPreset(preset.text)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: isSelected ? "2px solid var(--ink, #12141a)" : "1px solid var(--line, #dce1ea)",
                    background: isSelected ? "#f6fee7" : "var(--card, #ffffff)",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <span style={{ fontSize: 18 }}>{preset.emoji}</span>
                  <div>
                    <span style={{ fontSize: 12, fontWeight: 700, display: "block", color: "var(--ink, #12141a)" }}>
                      {preset.label}
                    </span>
                    <span style={{ fontSize: 11, color: "var(--muted, #5c6578)" }}>{preset.text}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {sent ? (
          <div style={{ background: "#f0fdf4", color: "#166534", padding: 12, borderRadius: 10, textAlign: "center", fontWeight: 700, fontSize: 13 }}>
            ⚡ Nudge delivered to {member.name}!
          </div>
        ) : (
          <button type="button" className="rd-btn-primary" onClick={handleSend}>
            <span>⚡ Send Nudge Push Notification</span>
          </button>
        )}
      </div>
    </div>
  );
}
