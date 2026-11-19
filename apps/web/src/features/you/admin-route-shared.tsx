"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ONBOARDING_OVERTAKE_SURFACE_ID, type LngLat } from "@fitness-battle/shared";
import { MAX_ADMIN_ROUTE_BYTES, parseAdminRouteGpx, validateAdminRoute, type AdminRaceRoute, type AdminRaceRouteSummary } from "@/lib/admin-route-input";
import type { AdminRouteAssignment, AdminRouteSurface } from "@/lib/admin-route-overview";
import type { AdminWaveFieldParticipants } from "@/lib/admin-wave-participants";
import { RouteStaticPreview } from "@/components/routes/route-static-preview";

type CatalogOverviewRow = AdminRaceRouteSummary & { frozenWeeks: number; upcomingWeeks: number; inRotation: boolean };
export type RouteOverview = {
  surfaces: AdminRouteSurface[];
  catalog: CatalogOverviewRow[];
  assignments: AdminRouteAssignment[];
  activeIds: string[];
  participantsByWave?: Record<string, AdminWaveFieldParticipants[]>;
};

type Draft = Omit<AdminRaceRoute, "coordinates" | "updated_at"> & { updated_at: string | null };
export const emptyRouteDraft = (): Draft => ({ id: "", name: "", location: "", is_active: true, updated_at: null });

export function formatWaveWhen(value: string) {
  return new Date(value).toLocaleString("en-US", { timeZone: "America/New_York", dateStyle: "medium", timeStyle: "short" });
}

export function useAdminRouteApi() {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const generation = useRef(0);
  const pending = useRef<AbortController | null>(null);
  useEffect(() => () => { generation.current++; pending.current?.abort(); }, []);

  async function perform(work: (signal: AbortSignal, current: () => boolean) => Promise<void>) {
    pending.current?.abort();
    const controller = new AbortController();
    pending.current = controller;
    const key = ++generation.current;
    const current = () => generation.current === key && !controller.signal.aborted;
    const timeout = setTimeout(() => controller.abort(), 20_000);
    setBusy(true);
    setNote("");
    try { await work(controller.signal, current); }
    catch (error) {
      if (generation.current === key) {
        setNote(controller.signal.aborted ? "Request timed out. Reload before retrying a save." : error instanceof Error ? error.message : "The route request failed.");
      }
    } finally {
      clearTimeout(timeout);
      if (generation.current === key) setBusy(false);
    }
  }

  async function read(url: string, signal: AbortSignal, body?: unknown) {
    const response = await fetch(url, {
      signal,
      cache: "no-store",
      ...(body === undefined ? {} : { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "The route request failed.");
    return data;
  }

  return { busy, note, setNote, perform, read };
}

export function AdminStatusNote({ note }: { note: string }) {
  if (!note) return null;
  return <p className="fb-copy" role="status" style={{ marginTop: 12 }}>{note}</p>;
}

export function AdminTable({ ariaLabel, children }: { ariaLabel: string; children: ReactNode }) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table aria-label={ariaLabel} className="fb-copy" style={{ width: "100%", borderCollapse: "collapse" }}>
        {children}
      </table>
    </div>
  );
}

export const adminCell = { border: "1px solid var(--line)", padding: "8px 10px", textAlign: "left" as const, verticalAlign: "top" as const };

export function RouteMapPreview({ coordinates, name, height = 220 }: { coordinates: LngLat[]; name: string; height?: number }) {
  if (coordinates.length < 2) return <p className="fb-copy">Import coordinates to preview the course on a map.</p>;
  return (
    <RouteStaticPreview
      coordinates={coordinates}
      width={640}
      height={height}
      showPlayBadge={false}
      strokeColor="142b3b"
      alt={`Map preview for ${name}`}
      className="!rounded-xl"
    />
  );
}

export function onboardingSurfaceRouteId(surfaces: AdminRouteSurface[]) {
  return surfaces.find(surface => surface.id === ONBOARDING_OVERTAKE_SURFACE_ID)?.assignedRouteId ?? "";
}

export async function saveRouteDraft(
  read: ReturnType<typeof useAdminRouteApi>["read"],
  draft: Draft,
  coordinates: string,
  signal: AbortSignal,
) {
  const input = validateAdminRoute({ ...draft, updatedAt: draft.updated_at, coordinates: JSON.parse(coordinates) });
  const { route } = await read("/api/admin/routes", signal, input);
  return route as AdminRaceRoute;
}