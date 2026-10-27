"use client";
import { SHELL_COLORS as c } from "@fitness-battle/shared";
export function FieldViewSwitcher({ value, geographic, onChange }: {
  value: "2d" | "3d" | "4d"; geographic: boolean; onChange(value: "2d" | "3d" | "4d"): void;
}) {
  const modes: ("2d" | "3d" | "4d")[] = geographic ? ["2d", "3d", "4d"] : ["2d", "3d"];
  return <div role="group" aria-label="Field view" style={{ display: "flex", gap: 4 }}>
    {modes.map(mode => <button key={mode} type="button" className="fb-btn-line"
      aria-label={`Switch to ${mode.toUpperCase()} ${mode === "4d" ? "course" : "field"}`} aria-pressed={value === mode}
      onClick={() => onChange(mode)} style={{ minHeight: 44, minWidth: 44, background: value === mode ? c.tennis : c.card }}>
      {mode.toUpperCase()}
    </button>)}
  </div>;
}
