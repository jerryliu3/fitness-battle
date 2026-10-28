"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { createRaceCourse, type LngLat } from "@fitness-battle/shared";
import { MAX_ADMIN_ROUTE_BYTES, parseAdminRouteGpx, validateAdminRoute, type AdminRaceRoute, type AdminRaceRouteSummary } from "@/lib/admin-route-input";
import { AppParagraph, SectionHeader } from "@/ui/section";

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

export function AdminRouteControls() {
  const [routes, setRoutes] = useState<AdminRaceRouteSummary[]>([]);
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
      if (current()) { setRoutes(data.routes); if (!data.routes.length) setNote("No routes yet. Add one to enable 4D course assignment."); }
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
    <SectionHeader title="4D route catalog" />
    <AppParagraph typographyRole="body">Add or edit the routes used by automatic course rotation. Active routes are eligible for new assignments. Deactivating or editing a route preserves courses already assigned to competitions.</AppParagraph>
    <div className="focus-actions">
      <button type="button" className="fb-btn-line" disabled={busy} onClick={loadCatalog}>Load route catalog</button>
      <button type="button" className="fb-btn-line" disabled={busy} onClick={() => { setDraft(emptyDraft()); setCoordinates(""); setNote(""); }}>New route</button>
    </div>
    {routes.length ? <label className="fb-copy">Saved routes<select className="fb-input" value={draft?.updated_at ? draft.id : ""} disabled={busy} onChange={event => loadRoute(event.target.value)} style={{ display: "block", width: "100%" }}>
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
