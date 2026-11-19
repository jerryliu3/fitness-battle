"use client";

import { useEffect, useMemo, useState } from "react";
import { createRaceCourse, ONBOARDING_OVERTAKE_SURFACE_ID, type LngLat } from "@fitness-battle/shared";
import type { AdminRaceRoute } from "@/lib/admin-route-input";
import { MAX_ADMIN_ROUTE_BYTES, parseAdminRouteGpx } from "@/lib/admin-route-input";
import { AppParagraph, AppText, SectionHeader } from "@/ui/section";
import {
  AdminStatusNote,
  AdminTable,
  RouteMapPreview,
  adminCell,
  emptyRouteDraft,
  onboardingSurfaceRouteId,
  saveRouteDraft,
  type RouteOverview,
  useAdminRouteApi,
} from "./admin-route-shared";

type Draft = ReturnType<typeof emptyRouteDraft>;

export function AdminRoutesWorkspace() {
  const { busy, note, setNote, perform, read } = useAdminRouteApi();
  const [routes, setRoutes] = useState<RouteOverview["catalog"]>([]);
  const [overview, setOverview] = useState<RouteOverview | null>(null);
  const [assignOnboardingRouteId, setAssignOnboardingRouteId] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [coordinates, setCoordinates] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);

  const coordPreview = useMemo(() => {
    if (!coordinates.trim()) return { error: "Import a GPX file or paste coordinates to preview." };
    try {
      const points = JSON.parse(coordinates) as LngLat[];
      if (!Array.isArray(points)) throw new Error("Enter an array of longitude, latitude pairs.");
      const course = createRaceCourse(draft?.name || "Preview", points);
      return { course, points };
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Enter valid coordinates." };
    }
  }, [coordinates, draft?.name]);

  function loadCatalog() {
    void perform(async (signal, current) => {
      const data = await read("/api/admin/routes", signal);
      if (!current()) return;
      setRoutes(data.overview?.catalog ?? data.routes ?? []);
      setOverview(data.overview ?? null);
      if (!data.routes?.length) setNote("No routes yet. Create one to enable 3D course assignment.");
    });
  }

  useEffect(() => { loadCatalog(); }, []);

  function beginNewRoute() {
    setDraft(emptyRouteDraft());
    setCoordinates("");
    setEditorOpen(true);
    setNote("");
  }

  function beginEditRoute(id: string) {
    if (!id) return;
    void perform(async (signal, current) => {
      const { route } = await read(`/api/admin/routes?id=${encodeURIComponent(id)}`, signal);
      if (!current()) return;
      const { coordinates: points, ...metadata } = route as AdminRaceRoute;
      setDraft(metadata);
      setCoordinates(JSON.stringify(points));
      setEditorOpen(true);
    });
  }

  function assignOnboardingSurface() {
    const routeId = assignOnboardingRouteId || onboardingSurfaceRouteId(overview?.surfaces ?? []);
    if (!routeId.trim() || busy) return;
    void perform(async (signal, current) => {
      await read("/api/admin/routes/surface", signal, { surfaceId: ONBOARDING_OVERTAKE_SURFACE_ID, routeId: routeId.trim() });
      if (!current()) return;
      setNote("Onboarding overtake surface updated.");
      loadCatalog();
    });
  }

  function save() {
    if (!draft || busy) return;
    void perform(async (signal, current) => {
      const route = await saveRouteDraft(read, draft, coordinates, signal);
      if (!current()) return;
      const { coordinates: points, ...metadata } = route;
      setDraft(metadata);
      setCoordinates(JSON.stringify(points));
      setNote(metadata.updated_at ? "Route saved." : "Route added to the catalog.");
      loadCatalog();
    });
  }

  const onboardingValue = assignOnboardingRouteId || onboardingSurfaceRouteId(overview?.surfaces ?? []);

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <section className="fb-card" style={{ padding: 16, display: "grid", gap: 12 }}>
        <SectionHeader title="Catalog" action={
          <div className="focus-actions">
            <button type="button" className="fb-btn-line" disabled={busy} onClick={loadCatalog}>Refresh</button>
            <button type="button" className="fb-btn" disabled={busy} onClick={beginNewRoute}>New route</button>
          </div>
        } />
        <AppParagraph typographyRole="body">
          Active rotation{overview?.activeIds.length ? `: ${overview.activeIds.join(" → ")}` : " is empty."} New competition waves pick from active routes unless overridden on the Waves page.
        </AppParagraph>
        {overview ? (
          <AdminTable ariaLabel="Route catalog">
            <thead>
              <tr>
                <th style={adminCell}>Route</th>
                <th style={adminCell}>Rotation</th>
                <th style={adminCell}>Frozen</th>
                <th style={adminCell}>Upcoming</th>
                <th style={adminCell}></th>
              </tr>
            </thead>
            <tbody>
              {overview.catalog.map(route => (
                <tr key={route.id} style={draft?.id === route.id && editorOpen ? { background: "var(--wash)" } : undefined}>
                  <td style={adminCell}>
                    <strong>{route.name}</strong>
                    <br />
                    <code className="fb-copy">{route.id}</code>
                    {route.location ? <><br />{route.location}</> : null}
                  </td>
                  <td style={adminCell}>{route.inRotation ? "Active" : "Inactive"}</td>
                  <td style={adminCell}>{route.frozenWeeks}</td>
                  <td style={adminCell}>{route.upcomingWeeks}</td>
                  <td style={adminCell}>
                    <button type="button" className="fb-btn-line" disabled={busy} onClick={() => beginEditRoute(route.id)}>Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </AdminTable>
        ) : (
          <AppParagraph typographyRole="body">Loading catalog…</AppParagraph>
        )}
      </section>

      {editorOpen && draft ? (
        <section className="fb-card" style={{ padding: 16, display: "grid", gap: 12, border: "2px solid var(--line)" }} aria-labelledby="route-editor-heading">
          <SectionHeader title={draft.updated_at ? `Edit · ${draft.name || draft.id}` : "New route"} />
          <p id="route-editor-heading" className="fb-copy" style={{ margin: 0 }}>
            {draft.updated_at ? "Changes apply to the catalog and future waves. Started waves keep their frozen geometry." : "Define an ID, name, and GPS path, then save to add it to the catalog."}
          </p>
          <div className="admin-split" style={{ display: "grid", gap: 16, gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)" }}>
            <form onSubmit={event => { event.preventDefault(); save(); }} style={{ display: "grid", gap: 12, alignContent: "start" }}>
              <label className="fb-copy">Route ID<input className="fb-input" style={{ display: "block", width: "100%" }} value={draft.id} required pattern="[a-z0-9-]{3,80}" maxLength={80} disabled={busy || draft.updated_at !== null} onChange={event => setDraft({ ...draft, id: event.target.value })} /></label>
              <label className="fb-copy">Name<input className="fb-input" style={{ display: "block", width: "100%" }} value={draft.name} required maxLength={120} disabled={busy} onChange={event => setDraft({ ...draft, name: event.target.value })} /></label>
              <label className="fb-copy">Location<input className="fb-input" style={{ display: "block", width: "100%" }} value={draft.location} maxLength={160} disabled={busy} onChange={event => setDraft({ ...draft, location: event.target.value })} /></label>
              <label className="fb-copy"><input type="checkbox" checked={draft.is_active} disabled={busy} onChange={event => setDraft({ ...draft, is_active: event.target.checked })} /> Active for new assignments</label>
              <label className="fb-copy">Import GPX<input type="file" accept=".gpx,application/gpx+xml" disabled={busy} onChange={event => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (!file) return;
                void perform(async (_signal, current) => {
                  if (file.size > MAX_ADMIN_ROUTE_BYTES) throw new Error("Use a GPX under 4 MB.");
                  const points = parseAdminRouteGpx(await file.text());
                  if (current()) {
                    setCoordinates(JSON.stringify(points));
                    setNote("GPX loaded. Review the map and save.");
                  }
                });
              }} /></label>
              <label className="fb-copy">Coordinates · longitude, latitude<textarea className="fb-input" style={{ display: "block", width: "100%", minHeight: 120 }} value={coordinates} maxLength={MAX_ADMIN_ROUTE_BYTES} disabled={busy} placeholder="[[-73.97,40.76],[-73.96,40.77]]" onChange={event => setCoordinates(event.target.value)} /></label>
              <div className="focus-actions">
                <button type="submit" className="fb-btn" disabled={busy || !("course" in coordPreview && coordPreview.course) || !draft.name.trim() || !draft.id.trim()}>{busy ? "Working…" : draft.updated_at ? "Save changes" : "Add route"}</button>
                <button type="button" className="fb-btn-line" disabled={busy} onClick={() => { setEditorOpen(false); setDraft(null); }}>Close</button>
              </div>
            </form>
            <div style={{ display: "grid", gap: 8, alignContent: "start" }}>
              {coordPreview.course ? (
                <>
                  <RouteMapPreview coordinates={coordPreview.course.coordinates} name={draft.name || "route"} height={280} />
                  <AppParagraph typographyRole="body">
                    {(coordPreview.course.length / 1000).toFixed(2)} km · {coordPreview.course.coordinates.length.toLocaleString()} points
                  </AppParagraph>
                </>
              ) : (
                <AppParagraph typographyRole="body">{coordPreview.error}</AppParagraph>
              )}
            </div>
          </div>
        </section>
      ) : null}

      {overview ? (
        <section className="fb-card" style={{ padding: 16, display: "grid", gap: 12 }}>
          <SectionHeader title="Surface paths" />
          <AdminTable ariaLabel="Route surfaces">
            <thead><tr><th style={adminCell}>Surface</th><th style={adminCell}>Managed on</th><th style={adminCell}>Assigned route</th></tr></thead>
            <tbody>
              {overview.surfaces.map(surface => (
                <tr key={surface.id}>
                  <td style={adminCell}>{surface.label}<br /><AppText as="small" role="caption" secondary>{surface.notes}</AppText></td>
                  <td style={adminCell}>{surface.managedOn === "server" ? "Server" : "Client bundle"}</td>
                  <td style={adminCell}>
                    {surface.assignedRouteName ? <>{surface.assignedRouteName} · <code className="fb-copy">{surface.assignedRouteId}</code></> : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </AdminTable>
          <SectionHeader title="Onboarding overtake route" />
          <label className="fb-copy">Catalog route
            <select aria-label="Onboarding surface route" className="fb-input" style={{ display: "block", width: "100%" }} disabled={busy} value={onboardingValue} onChange={event => setAssignOnboardingRouteId(event.target.value)}>
              <option value="">Select a route</option>
              {routes.map(route => <option key={route.id} value={route.id}>{route.name} ({route.id})</option>)}
            </select>
          </label>
          <button type="button" className="fb-btn-line" disabled={busy || !onboardingValue} onClick={assignOnboardingSurface}>Save onboarding route</button>
        </section>
      ) : null}

      <AdminStatusNote note={note} />
    </div>
  );
}
