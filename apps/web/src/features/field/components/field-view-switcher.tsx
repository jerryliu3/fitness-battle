"use client";
import { colors as c } from "@/theme/app-colors";


import { typographyStyle } from "@/ui/section";
export function FieldViewSwitcher({ compact = false, value, geographic, onChange, standings = false, onStandings, onZoomIn, onZoomOut }: {
  compact?: boolean;
  value: "2d" | "3d" | "4d"; geographic: boolean; onChange(value: "2d" | "3d" | "4d"): void;
  standings?: boolean; onStandings?: () => void;
  onZoomIn?: () => void; onZoomOut?: () => void;
}) {
  const selector = <select aria-label="Field view" value={standings ? "standings" : value}
    onChange={event => { const next = event.target.value; if (next === "standings") onStandings?.(); else if (next === "zoom-in") onZoomIn?.(); else if (next === "zoom-out") onZoomOut?.(); else onChange(next as "2d" | "3d" | "4d"); }}
    style={{ ...typographyStyle("label"), minHeight: 44, maxWidth: 160, borderRadius: 14, padding: "8px 12px", border: `1px solid ${c.line}`, background: c.card, color: c.ink }}>
    <option value="2d">2D map</option>
    {geographic ? <option value="4d">3D course</option> : null}
    {onStandings ? <option value="standings">Standings</option> : null}
    {onZoomIn || onZoomOut ? <optgroup label="Camera">
      {onZoomIn ? <option value="zoom-in">Zoom in</option> : null}
      {onZoomOut ? <option value="zoom-out">Zoom out</option> : null}
    </optgroup> : null}
  </select>;
  return compact ? <details style={{ position: "relative", marginLeft: "auto" }}><summary aria-label="Course options" style={{ listStyle: "none", cursor: "pointer", padding: 2, background: "transparent", color: c.ink }}>⚙</summary><div style={{ position: "absolute", right: 0, bottom: 36, width: 220, padding: 8, borderRadius: 12, background: c.card, color: c.ink, boxShadow: "0 8px 24px #142b3b22", zIndex: 2 }}>
    {geographic ? <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, minHeight: 44, padding: "0 8px" }}><span>3D view</span><input type="checkbox" className="course-settings-switch" role="switch" aria-label="3D view" checked={value === "4d"} onChange={event => onChange(event.target.checked ? "4d" : "2d")} style={{ margin: 0, backgroundColor: value === "4d" ? c.tennis : c.line }} /></label> : <span>2D view</span>}
    {onStandings ? <button type="button" className="fb-btn-line" onClick={onStandings}>Standings</button> : null}
    {onZoomIn ? <button type="button" className="fb-btn-line" onClick={onZoomIn}>Zoom in</button> : null}
    {onZoomOut ? <button type="button" className="fb-btn-line" onClick={onZoomOut}>Zoom out</button> : null}
  </div></details> : selector;
}
