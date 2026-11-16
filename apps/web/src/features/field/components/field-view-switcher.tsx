"use client";
import { colors as c } from "@/theme/app-colors";


import { typographyStyle } from "@/ui/section";
export function FieldViewSwitcher({ compact = false, value, geographic, onChange, standings = false, onStandings, onZoomIn, onZoomOut }: {
  compact?: boolean;
  value: "2d" | "3d" | "4d" | "graph"; geographic: boolean; onChange(value: "2d" | "3d" | "4d" | "graph"): void;
  standings?: boolean; onStandings?: () => void;
  onZoomIn?: () => void; onZoomOut?: () => void;
}) {
  const selector = <select aria-label="Field view" value={standings ? "standings" : value}
    onChange={event => { const next = event.target.value; if (next === "standings") onStandings?.(); else if (next === "zoom-in") onZoomIn?.(); else if (next === "zoom-out") onZoomOut?.(); else onChange(next as "2d" | "3d" | "4d" | "graph"); }}
    style={{ ...typographyStyle("label"), minHeight: 44, maxWidth: 160, borderRadius: 14, padding: "8px 12px", border: `1px solid ${c.line}`, background: c.card, color: c.ink }}>
    <option value="graph">Graph</option>
    <option value="2d">2D map</option>
    {geographic ? <option value="4d">3D course</option> : null}
    {onStandings ? <option value="standings">Standings</option> : null}
    {onZoomIn || onZoomOut ? <optgroup label="Camera">
      {onZoomIn ? <option value="zoom-in">Zoom in</option> : null}
      {onZoomOut ? <option value="zoom-out">Zoom out</option> : null}
    </optgroup> : null}
  </select>;
  const compactModes: Array<{ value: "2d" | "3d" | "4d" | "graph"; label: string }> = [
    ...(geographic ? [{ value: "4d" as const, label: "3D Course" }] : []),
    { value: "2d", label: "2D Lanes" },
    { value: "graph", label: "Graph" },
  ];
  return compact ? (
    <div
      role="group"
      aria-label="Field view"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: 4,
        borderRadius: 999,
        background: "rgba(20, 20, 19, 0.78)",
        border: "1px solid rgba(255, 255, 255, 0.18)",
        backdropFilter: "blur(12px)",
        marginLeft: "auto",
      }}
    >
      {compactModes.map((mode) => {
        const active = value === mode.value && !standings;
        return (
          <button
            key={mode.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(mode.value)}
            style={{
              ...typographyStyle("caption"),
              minHeight: 34,
              padding: "0 12px",
              borderRadius: 999,
              border: 0,
              cursor: "pointer",
              whiteSpace: "nowrap",
              background: active ? c.tennis : "transparent",
              color: active ? c.ink : "#ffffff",
            }}
          >
            {mode.label}
          </button>
        );
      })}
    </div>
  ) : selector;
}
