"use client";
import { SHELL_COLORS as c } from "@fitness-battle/shared";
import { typographyStyle } from "@/ui/section";
export function FieldViewSwitcher({ value, geographic, onChange, standings = false, onStandings, onZoomIn, onZoomOut }: {
  value: "2d" | "3d" | "4d"; geographic: boolean; onChange(value: "2d" | "3d" | "4d"): void;
  standings?: boolean; onStandings?: () => void;
  onZoomIn?: () => void; onZoomOut?: () => void;
}) {
  return <select aria-label="Field view" value={standings ? "standings" : value}
    onChange={event => { const next = event.target.value; if (next === "standings") onStandings?.(); else if (next === "zoom-in") onZoomIn?.(); else if (next === "zoom-out") onZoomOut?.(); else onChange(next as "2d" | "3d" | "4d"); }}
    style={{ ...typographyStyle("label"), minHeight: 44, maxWidth: 160, borderRadius: 14, padding: "8px 12px", border: `1px solid ${c.line}`, background: c.card, color: c.ink }}>
    <option value="2d">2D map</option><option value="3d">3D field</option>
    {geographic ? <option value="4d">4D course</option> : null}
    {onStandings ? <option value="standings">Standings</option> : null}
    {onZoomIn || onZoomOut ? <optgroup label="Camera">
      {onZoomIn ? <option value="zoom-in">Zoom in</option> : null}
      {onZoomOut ? <option value="zoom-out">Zoom out</option> : null}
    </optgroup> : null}
  </select>;
}
