"use client";

import { useState } from "react";
import type { BackfillProgressStep } from "@fitness-battle/shared";
import { PROTOTYPE_BACKFILL_STEPS } from "@fitness-battle/shared";

interface Props {
  open: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export function BackfillDialog({ open, onClose, onComplete }: Props) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [finished, setFinished] = useState(false);

  if (!open) return null;

  function runSimulation() {
    setIsRunning(true);
    let step = 0;
    const interval = setInterval(() => {
      step++;
      setCurrentStep(step);
      if (step >= PROTOTYPE_BACKFILL_STEPS.length) {
        clearInterval(interval);
        setIsRunning(false);
        setFinished(true);
      }
    }, 900);
  }

  return (
    <div className="rd-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="rd-modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="rd-modal-header">
          <div>
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--lime-deep, #7ab800)", textTransform: "uppercase" }}>
              One-Time Setup
            </span>
            <h2 className="rd-modal-title">90-Day Historical Backfill</h2>
          </div>
          <button type="button" className="rd-modal-close-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: "var(--muted, #5c6578)" }}>
          To place you in the right weekly competitive bracket, Fitness Battle ingests your last 90 days of GPS workouts and biometric recovery data to calibrate your official starting <b>Leo Elo score</b>.
        </p>

        {/* Step Progress Checklist */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, background: "var(--paper, #eef1f4)", padding: 14, borderRadius: 14 }}>
          {PROTOTYPE_BACKFILL_STEPS.map((step, idx) => {
            const isDone = finished || idx < currentStep;
            const isCurrent = isRunning && idx === currentStep;
            return (
              <div
                key={idx}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                  opacity: isDone || isCurrent ? 1 : 0.45,
                }}
              >
                <div
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    background: isDone ? "var(--lime-deep, #7ab800)" : isCurrent ? "var(--ink, #12141a)" : "#cbd5e1",
                    color: "#ffffff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 11,
                    fontWeight: 800,
                    flexShrink: 0,
                    marginTop: 1,
                  }}
                >
                  {isDone ? "✓" : isCurrent ? "⏳" : idx + 1}
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "var(--ink, #12141a)" }}>
                    {step.label}
                  </p>
                  {isDone && step.importedSessions > 0 && (
                    <span style={{ fontSize: 11, color: "var(--muted, #5c6578)" }}>
                      Found {step.importedSessions} sessions · Baseline Elo: {step.baselineScore}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {finished && (
          <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", padding: 14, borderRadius: 12, textAlign: "center" }}>
            <p style={{ margin: "0 0 4px", fontSize: 13, fontWeight: 800, color: "#166534" }}>
              🎉 Calibration Complete!
            </p>
            <p style={{ margin: 0, fontSize: 12, color: "#15803d" }}>
              Initial Leo Score: <b>1,842 Elo</b> · Assigned to <b>Division 2 (Master)</b>
            </p>
          </div>
        )}

        <div style={{ display: "flex", gap: 10 }}>
          {!finished ? (
            <button
              type="button"
              className="rd-btn-primary"
              style={{ width: "100%" }}
              disabled={isRunning}
              onClick={runSimulation}
            >
              <span>{isRunning ? "Simulating Historical Sync..." : "Start 90-Day Backfill Sync"}</span>
            </button>
          ) : (
            <button
              type="button"
              className="rd-btn-primary"
              style={{ width: "100%" }}
              onClick={() => {
                onComplete();
                onClose();
              }}
            >
              <span>Continue into Arena</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
