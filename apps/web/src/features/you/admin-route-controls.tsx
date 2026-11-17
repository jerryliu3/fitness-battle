"use client";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { createRaceCourse, type LngLat } from "@fitness-battle/shared";
import { MAX_ADMIN_ROUTE_BYTES, parseAdminRouteGpx, validateAdminRoute, type AdminRaceRoute, type AdminRaceRouteSummary } from "@/lib/admin-route-input";
import type { AdminRouteAssignment, AdminRouteSurface } from "@/lib/admin-route-overview";
import { AppParagraph, AppText, SectionHeader } from "@/ui/section";

type CatalogOverviewRow = AdminRaceRouteSummary & { frozenWeeks: number; upcomingWeeks: number; inRotation: boolean };
type RouteOverview = {
  surfaces: AdminRouteSurface[];
  catalog: CatalogOverviewRow[];
  assignments: AdminRouteAssignment[];
  activeIds: string[];
};

type Draft = Omit<AdminRaceRoute, "coordinates" | "updated_at"> & { updated_at: string | null };
const emptyDraft = (): Draft => ({ id: "", name: "", location: "", is_active: true, updated_at: null });

/** A geographic shape preview; no activity, route selection, or score writes. */
function previewPoints(coordinates: LngLat[]) {
  let previous = coordinates[0][0];
  const projected = coordinates.map(([lng, lat]) => {
    const longitude = previous + ((lng - previous + 180) % 360 + 360) % 360 - 180;
    previous = longitude;
    return [longitude * Math.PI / 180, Math.log(Math.tan(Math.PI / 4 + lat * Math.PI / 360))];
  });
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const [x, y] of projected) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
  const scale = Math.min(608 / (maxX - minX || 1e-9), 188 / (maxY - minY || 1e-9));
  return projected.map(([x, y]) => `${(320 + (x - (minX + maxX) / 2) * scale).toFixed(2)},${(110 - (y - (minY + maxY) / 2) * scale).toFixed(2)}`).join(" ");
}

function formatWhen(value: string) {
  return new Date(value).toLocaleString("en-US", { timeZone: "America/New_York", dateStyle: "medium", timeStyle: "short", timeZoneName: "short" });
}

export function AdminRouteControls() {
  const [routes, setRoutes] = useState<AdminRaceRouteSummary[]>([]);
  const [overview, setOverview] = useState<RouteOverview | null>(null);
  const [assignWave, setAssignWave] = useState("");
  const [assignRouteId, setAssignRouteId] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [coordinates, setCoordinates] = useState("");
  const [busy, setBusy] = useState(false), [note, setNote] = useState("");
  const generation = useRef(0);
  const pending = useRef<AbortController | null>(null);
  useEffect(() => () => { generation.current++; pending.current?.abort(); }, []);
  const preview = useMemo(() => {
    if (!coordinates.trim()) return { error: "Import a GPX file or enter coordinates to preview the route." };
    try {
      const points = JSON.parse(coordinates);
      if (!Array.isArray(points)) throw new Error("Enter an array of longitude, latitude pairs.");
      const course = createRaceCourse(draft?.name || "Preview", points);
      return { course, points: previewPoints(course.coordinates) };
    } catch (error) { return { error: error instanceof Error ? error.message : "Enter valid coordinates." }; }
  }, [coordinates, draft?.name]);

  async function perform(work: (signal: AbortSignal, current: () => boolean) => Promise<void>) {
    pending.current?.abort();
    const controller = new AbortController(); pending.current = controller;
    const key = ++generation.current;
    const current = () => generation.current === key && !controller.signal.aborted;
    const timeout = setTimeout(() => controller.abort(), 20_000);
    setBusy(true); setNote("");
    try { await work(controller.signal, current); }
    catch (error) { if (generation.current === key) setNote(controller.signal.aborted ? "Request timed out. Reload the route before retrying a save." : error instanceof Error ? error.message : "Could not load routes."); }
    finally { clearTimeout(timeout); if (generation.current === key) setBusy(false); }
  }
  async function read(url: string, signal: AbortSignal, body?: unknown) {
    const response = await fetch(url, { signal, cache: "no-store", ...(body === undefined ? {} : { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "The route request failed.");
    return data;
  }
  function loadCatalog() {
    void perform(async (signal, current) => {
      const data = await read("/api/admin/routes", signal);
      if (current()) {
        setRoutes(data.routes);
        setOverview(data.overview ?? null);
        if (!data.routes.length) setNote("No routes yet. Add one to enable 3D course assignment.");
      }
    });
  }
  function assignWaveRoute() {
    if (!assignWave.trim() || !assignRouteId.trim() || busy) return;
    void perform(async (signal, current) => {
      await read("/api/admin/routes/assign", signal, { waveStart: assignWave.trim(), routeId: assignRouteId.trim() });
      if (!current()) return;
      setNote("Upcoming wave reassigned. Reload the catalog to refresh usage.");
      loadCatalog();
    });
  }
  function loadRoute(id: string) {
    if (!id) return;
    void perform(async (signal, current) => {
      const { route } = await read(`/api/admin/routes?id=${encodeURIComponent(id)}`, signal);
      if (current()) { const { coordinates: points, ...metadata } = route as AdminRaceRoute; setDraft(metadata); setCoordinates(JSON.stringify(points)); }
    });
  }
  function save() {
    if (!draft || busy) return;
    void perform(async (signal, current) => {
      const input = validateAdminRoute({ ...draft, updatedAt: draft.updated_at, coordinates: JSON.parse(coordinates) });
      const { route } = await read("/api/admin/routes", signal, input);
      if (!current()) return;
      const { coordinates: points, ...metadata } = route as AdminRaceRoute;
      setDraft(metadata); setCoordinates(JSON.stringify(points));
      setRoutes(previous => [...previous.filter(row => row.id !== metadata.id), metadata].sort((a, b) => a.id.localeCompare(b.id)));
      setNote("Route saved. Existing competition assignments retain their saved course.");
    });
  }
  return <section style={{ display: "grid", gap: 16 }}>
    <SectionHeader title="3D route catalog" />
    <AppParagraph typographyRole="body">Weekly competitions read GPS paths from Supabase after the next Vercel deploy—no native app release. Onboarding and offline demo scenery still ship in `@fitness-battle/shared` today.</AppParagraph>
    <div className="focus-actions">
      <button type="button" className="fb-btn-line" disabled={busy} onClick={loadCatalog}>Load route catalog</button>
      <button type="button" className="fb-btn-line" disabled={busy} onClick={() => { setDraft(emptyDraft()); setCoordinates(""); setNote(""); }}>New route</button>
    </div>
    {overview ? <>
      <SectionHeader title="Where each surface gets its path" />
      <RouteAdminTable ariaLabel="Route surfaces">
        <thead><tr><th style={tableCell}>Surface</th><th style={tableCell}>Managed on</th><th style={tableCell}>Storage</th></tr></thead>
        <tbody>{overview.surfaces.map(surface => <tr key={surface.id}><td style={tableCell}>{surface.label}<br /><AppText as="small" role="caption" secondary>{surface.notes}</AppText></td><td style={tableCell}>{surface.managedOn === "server" ? "Server (Supabase + Vercel)" : "Client bundle"}</td><td style={tableCell}><code className="fb-copy">{surface.storage}</code></td></tr>)}</tbody>
      </RouteAdminTable>
      <SectionHeader title="Catalog status" />
      <AppParagraph typographyRole="body">Active rotation order: {overview.activeIds.length ? overview.activeIds.join(" → ") : "none"}. New waves pick `floor(epoch / 1 week) % active count` from that sorted list unless you override an upcoming assignment.</AppParagraph>
      <RouteAdminTable ariaLabel="Catalog routes">
        <thead><tr><th style={tableCell}>Route</th><th style={tableCell}>Status</th><th style={tableCell}>Frozen weeks</th><th style={tableCell}>Upcoming</th><th style={tableCell}></th></tr></thead>
        <tbody>{overview.catalog.map(route => <tr key={route.id}>
          <td style={tableCell}><strong>{route.name}</strong><br /><code className="fb-copy">{route.id}</code>{route.location ? <><br />{route.location}</> : null}</td>
          <td style={tableCell}>{route.inRotation ? "In rotation" : "Inactive"}</td>
          <td style={tableCell}>{route.frozenWeeks}</td>
          <td style={tableCell}>{route.upcomingWeeks}</td>
          <td style={tableCell}><button type="button" className="fb-btn-line" disabled={busy} onClick={() => loadRoute(route.id)}>Edit</button></td>
        </tr>)}</tbody>
      </RouteAdminTable>
      <SectionHeader title="Frozen wave assignments" />
      <RouteAdminTable ariaLabel="Competition route assignments">
        <thead><tr><th style={tableCell}>Wave start (ET)</th><th style={tableCell}>Assigned route</th><th style={tableCell}>Auto pick</th><th style={tableCell}>Status</th></tr></thead>
        <tbody>{overview.assignments.length ? overview.assignments.map(row => <tr key={row.wave_start}>
          <td style={tableCell}><code className="fb-copy">{row.wave_start}</code><br />{formatWhen(row.wave_start)}</td>
          <td style={tableCell}>{row.route_name}<br /><code className="fb-copy">{row.route_id}</code></td>
          <td style={tableCell}>{row.autoRouteId ? <code className="fb-copy">{row.autoRouteId}</code> : "—"}<br />{row.matchesRotation ? "Matches rotation" : "Override"}</td>
          <td style={tableCell}>{row.started ? "Started" : "Upcoming"}</td>
        </tr>) : <tr><td colSpan={4} style={tableCell}>No frozen assignments yet. They appear when athletes first open 3D for a competition wave.</td></tr>}</tbody>
      </RouteAdminTable>
      <SectionHeader title="Override upcoming wave" />
      <AppParagraph typographyRole="body">Use the exact `wave_start` timestamp from an enrollment (ISO). Past waves stay frozen.</AppParagraph>
      <label className="fb-copy">Wave start ISO<input className="fb-input" style={{ display: "block", width: "100%" }} disabled={busy} value={assignWave} placeholder="2026-11-17T11:00:00.000Z" onChange={event => setAssignWave(event.target.value)} /></label>
      <label className="fb-copy">Catalog route<select aria-label="Override catalog route" className="fb-input" style={{ display: "block", width: "100%" }} disabled={busy} value={assignRouteId} onChange={event => setAssignRouteId(event.target.value)}>
        <option value="">Select a route</option>{routes.map(route => <option key={route.id} value={route.id}>{route.name} ({route.id})</option>)}
      </select></label>
      <button type="button" className="fb-btn" disabled={busy || !assignWave.trim() || !assignRouteId} onClick={assignWaveRoute}>Assign route to wave</button>
    </> : null}
    {routes.length ? <label className="fb-copy">Saved routes<select aria-label="Saved routes" className="fb-input" value={draft?.updated_at ? draft.id : ""} disabled={busy} onChange={event => loadRoute(event.target.value)} style={{ display: "block", width: "100%" }}>
      <option value="">Select a route</option>{routes.map(route => <option key={route.id} value={route.id}>{route.name} · {route.is_active ? "Active" : "Inactive"}</option>)}
    </select></label> : null}
    {draft && <form onSubmit={event => { event.preventDefault(); save(); }} style={{ display: "grid", gap: 12 }}>
      <label className="fb-copy">Route ID<input className="fb-input" style={{ display: "block", width: "100%" }} value={draft.id} required pattern="[a-z0-9-]{3,80}" maxLength={80} disabled={busy || draft.updated_at !== null} onChange={event => setDraft({ ...draft, id: event.target.value })} /></label>
      <label className="fb-copy">Name<input className="fb-input" style={{ display: "block", width: "100%" }} value={draft.name} required maxLength={120} disabled={busy} onChange={event => setDraft({ ...draft, name: event.target.value })} /></label>
      <label className="fb-copy">Location<input className="fb-input" style={{ display: "block", width: "100%" }} value={draft.location} maxLength={160} disabled={busy} onChange={event => setDraft({ ...draft, location: event.target.value })} /></label>
      <label className="fb-copy"><input type="checkbox" checked={draft.is_active} disabled={busy} onChange={event => setDraft({ ...draft, is_active: event.target.checked })} /> Active for new assignments</label>
      <label className="fb-copy">Import GPX<input type="file" accept=".gpx,application/gpx+xml" disabled={busy} onChange={event => {
        const file = event.target.files?.[0]; event.target.value = ""; if (!file) return;
        void perform(async (_signal, current) => {
          if (file.size > MAX_ADMIN_ROUTE_BYTES) throw new Error("Use a GPX under 4 MB.");
          const points = parseAdminRouteGpx(await file.text());
          if (current()) { setCoordinates(JSON.stringify(points)); setNote("GPX loaded into the draft. Review and save to add it to the catalog."); }
        });
      }} /></label>
      <label className="fb-copy">Coordinates · longitude, latitude<textarea className="fb-input" style={{ display: "block", width: "100%", minHeight: 140 }} value={coordinates} maxLength={MAX_ADMIN_ROUTE_BYTES} disabled={busy} placeholder="[[-73.97,40.76],[-73.96,40.77]]" onChange={event => setCoordinates(event.target.value)} /></label>
      {preview.course ? <>
        <svg viewBox="0 0 640 220" role="img" aria-label="Route shape preview" style={{ width: "100%", border: "1px solid var(--line)", borderRadius: 12, background: "var(--card)" }}><polyline points={preview.points} fill="none" stroke="var(--ink)" strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" /></svg>
        <AppParagraph typographyRole="body">{(preview.course.length / 1000).toFixed(2)} km · {preview.course.coordinates.length.toLocaleString()} points. Start {preview.course.coordinates[0].join(", ")} · End {preview.course.coordinates.at(-1)!.join(", ")}.</AppParagraph>
      </> : <AppParagraph typographyRole="body">{preview.error}</AppParagraph>}
      <div className="focus-actions">
        <button type="submit" className="fb-btn" disabled={busy || !preview.course || !draft.name.trim() || !draft.id.trim()}>{busy ? "Working…" : draft.updated_at ? "Save changes" : "Add route"}</button>
        {draft.updated_at && <button type="button" className="fb-btn-line" disabled={busy} onClick={() => loadRoute(draft.id)}>Reload route</button>}
      </div>
    </form>}
    {note && <AppParagraph typographyRole="body" role="status">{note}</AppParagraph>}
  </section>;
}

const tableCell = { border: "1px solid var(--line)", padding: "8px 10px", textAlign: "left" as const, verticalAlign: "top" as const };

function RouteAdminTable({ ariaLabel, children }: { ariaLabel: string; children: ReactNode }) {
  return <div style={{ overflowX: "auto" }}><table aria-label={ariaLabel} className="fb-copy" style={{ width: "100%", borderCollapse: "collapse" }}>{children}</table></div>;
}
