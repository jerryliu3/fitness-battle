"use client";

import { useEffect, useState } from "react";
import type { AdminRaceRoute } from "@/lib/admin-route-input";
import type { AdminRouteAssignment } from "@/lib/admin-route-overview";
import type { AdminWaveFieldParticipants } from "@/lib/admin-wave-participants";
import { AppParagraph, AppText, SectionHeader } from "@/ui/section";
import {
  AdminStatusNote,
  AdminTable,
  RouteMapPreview,
  adminCell,
  formatWaveWhen,
  type RouteOverview,
  useAdminRouteApi,
} from "./admin-route-shared";

export function AdminWavesWorkspace() {
  const { busy, note, setNote, perform, read } = useAdminRouteApi();
  const [overview, setOverview] = useState<RouteOverview | null>(null);
  const [routes, setRoutes] = useState<{ id: string; name: string }[]>([]);
  const [selectedWave, setSelectedWave] = useState<string | null>(null);
  const [overrideRouteId, setOverrideRouteId] = useState("");
  const [routePreview, setRoutePreview] = useState<AdminRaceRoute | null>(null);

  function load() {
    void perform(async (signal, current) => {
      const data = await read("/api/admin/routes?waveParticipants=1", signal);
      if (!current()) return;
      setOverview(data.overview ?? null);
      setRoutes((data.routes ?? []).map((row: { id: string; name: string }) => ({ id: row.id, name: row.name })));
      if (!data.overview?.assignments?.length) setNote("No frozen wave assignments yet.");
    });
  }

  useEffect(() => { load(); }, []);

  const selectedRow: AdminRouteAssignment | undefined = overview?.assignments.find(row => row.wave_start === selectedWave);

  useEffect(() => {
    const routeId = selectedRow?.route_id;
    if (!routeId) {
      setRoutePreview(null);
      return;
    }
    void perform(async (signal, current) => {
      const { route } = await read(`/api/admin/routes?id=${encodeURIComponent(routeId)}`, signal);
      if (current()) setRoutePreview(route as AdminRaceRoute);
    });
  }, [selectedRow?.route_id]);

  function assignWaveRoute() {
    if (!selectedWave || !overrideRouteId.trim() || busy) return;
    void perform(async (signal, current) => {
      await read("/api/admin/routes/assign", signal, { waveStart: selectedWave, routeId: overrideRouteId.trim() });
      if (!current()) return;
      setNote("Upcoming wave reassigned.");
      setOverrideRouteId("");
      load();
    });
  }

  const participants = selectedWave && overview?.participantsByWave
    ? overview.participantsByWave[selectedWave] ?? []
    : [];

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <section className="fb-card" style={{ padding: 16, display: "grid", gap: 12 }}>
        <SectionHeader title="Competition waves" action={
          <button type="button" className="fb-btn-line" disabled={busy} onClick={load}>Refresh</button>
        } />
        <AppParagraph typographyRole="body">Select a wave to see seated athletes, the assigned GPS course, and override controls. Past waves stay frozen.</AppParagraph>
        {overview ? (
          <AdminTable ariaLabel="Competition route assignments">
            <thead>
              <tr>
                <th style={adminCell}>Wave (ET)</th>
                <th style={adminCell}>Route</th>
                <th style={adminCell}>Rotation</th>
                <th style={adminCell}>Status</th>
              </tr>
            </thead>
            <tbody>
              {overview.assignments.length ? overview.assignments.map(row => (
                <tr
                  key={row.wave_start}
                  onClick={() => setSelectedWave(row.wave_start)}
                  style={{ cursor: "pointer", background: selectedWave === row.wave_start ? "var(--wash)" : undefined }}
                >
                  <td style={adminCell}>
                    {formatWaveWhen(row.wave_start)}
                    <br />
                    <code className="fb-copy">{row.wave_start}</code>
                  </td>
                  <td style={adminCell}>{row.route_name}<br /><code className="fb-copy">{row.route_id}</code></td>
                  <td style={adminCell}>
                    {row.autoRouteId ? <code className="fb-copy">{row.autoRouteId}</code> : "—"}
                    <br />
                    {row.matchesRotation ? "Matches rotation" : "Override"}
                  </td>
                  <td style={adminCell}>{row.started ? "Started" : "Upcoming"}</td>
                </tr>
              )) : (
                <tr><td colSpan={4} style={adminCell}>No assignments yet. They appear when athletes first open 3D for a competition wave.</td></tr>
              )}
            </tbody>
          </AdminTable>
        ) : (
          <AppParagraph typographyRole="body">Loading waves…</AppParagraph>
        )}
      </section>

      {selectedRow ? (
        <section className="fb-card" style={{ padding: 16, display: "grid", gap: 16, border: "2px solid var(--line)" }}>
          <SectionHeader title={`Wave · ${formatWaveWhen(selectedRow.wave_start)}`} />
          <div className="admin-split" style={{ display: "grid", gap: 20, gridTemplateColumns: "minmax(0, 1.1fr) minmax(0, 0.9fr)" }}>
            <div style={{ display: "grid", gap: 12 }}>
              <SectionHeader title="Seated athletes" />
              {participants.length ? participants.map(field => (
                <FieldAthletesCard key={field.fieldId} field={field} />
              )) : (
                <AppParagraph typographyRole="body">No `week_fields` rows for this wave start yet.</AppParagraph>
              )}
            </div>
            <div style={{ display: "grid", gap: 12, alignContent: "start" }}>
              <SectionHeader title="Assigned course" />
              {routePreview?.coordinates?.length ? (
                <RouteMapPreview coordinates={routePreview.coordinates} name={routePreview.name} height={260} />
              ) : (
                <AppParagraph typographyRole="body">Loading route map…</AppParagraph>
              )}
              {!selectedRow.started ? (
                <>
                  <SectionHeader title="Override route" />
                  <label className="fb-copy">Catalog route
                    <select aria-label="Override catalog route" className="fb-input" style={{ display: "block", width: "100%" }} disabled={busy} value={overrideRouteId || selectedRow.route_id} onChange={event => setOverrideRouteId(event.target.value)}>
                      <option value="">Select a route</option>
                      {routes.map(route => <option key={route.id} value={route.id}>{route.name} ({route.id})</option>)}
                    </select>
                  </label>
                  <button type="button" className="fb-btn" disabled={busy || !(overrideRouteId || selectedRow.route_id)} onClick={assignWaveRoute}>Save wave assignment</button>
                </>
              ) : (
                <AppParagraph typographyRole="body">This wave has started; its route is frozen.</AppParagraph>
              )}
            </div>
          </div>
        </section>
      ) : null}

      <AdminStatusNote note={note} />
    </div>
  );
}

function FieldAthletesCard({ field }: { field: AdminWaveFieldParticipants }) {
  return (
    <div style={{ border: "1px solid var(--line)", borderRadius: 12, padding: 12 }}>
      <strong>{field.fieldName}</strong>
      <AppText as="small" role="caption" secondary> · {field.sport} · <code className="fb-copy">{field.fieldId}</code></AppText>
      <AdminTable ariaLabel={`Athletes in ${field.fieldName}`}>
        <thead><tr><th style={adminCell}>Athlete</th><th style={adminCell}>Account ID</th><th style={adminCell}>Email</th></tr></thead>
        <tbody>
          {field.members.map(member => (
            <tr key={member.id}>
              <td style={adminCell}>{member.displayName}</td>
              <td style={adminCell}><code className="fb-copy">{member.id}</code></td>
              <td style={adminCell}>{member.email ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </AdminTable>
    </div>
  );
}