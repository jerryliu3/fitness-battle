import { pickRaceRouteIdByRotation } from "@fitness-battle/shared";
import type { AdminRaceRouteSummary } from "./admin-route-input";

export type AdminRouteAssignment = {
  wave_start: string;
  route_id: string;
  route_name: string;
  created_at: string;
  started: boolean;
  autoRouteId: string | null;
  matchesRotation: boolean;
};

export type AdminRouteSurface = {
  id: string;
  label: string;
  managedOn: "server" | "client";
  storage: string;
  assignedRouteId: string | null;
  assignedRouteName: string | null;
  editable: boolean;
  notes: string;
};

export type AdminRouteSurfaceAssignment = {
  surface_id: string;
  route_id: string;
  updated_at?: string;
};

const SURFACE_SPECS: Omit<AdminRouteSurface, "assignedRouteId" | "assignedRouteName">[] = [
  {
    id: "weekly-competition",
    label: "Registered competition · 3D course",
    managedOn: "server",
    storage: "Supabase `race_routes` + frozen `weekly_race_routes`",
    editable: false,
    notes: "Auto-picks from the active catalog on first authorized read, then freezes for that wave start. Edits apply to new waves only.",
  },
  {
    id: "onboarding-overtake",
    label: "Onboarding · overtake tutorial",
    managedOn: "server",
    storage: "`route_surface_assignments` → `GET /api/routes/onboarding-course`",
    editable: true,
    notes: "Clients prefetch in the background and always render the bundled fallback on the overtake step.",
  },
  {
    id: "demo-preview",
    label: "Offline / debug 4D preview",
    managedOn: "client",
    storage: "`packages/shared/src/sampleRoute.ts` → `DEMO_RACE_COURSE`",
    editable: false,
    notes: "Used when Supabase course fetch is unavailable or for local previews only.",
  },
];

export function buildAdminRouteOverview(
  routes: AdminRaceRouteSummary[],
  assignments: Pick<AdminRouteAssignment, "wave_start" | "route_id" | "route_name" | "created_at">[],
  surfaceAssignments: AdminRouteSurfaceAssignment[] = [],
  nowMs = Date.now(),
) {
  const surfaceById = new Map(surfaceAssignments.map(row => [row.surface_id, row]));
  const routeNames = new Map(routes.map(route => [route.id, route.name]));
  const surfaces: AdminRouteSurface[] = SURFACE_SPECS.map(spec => {
    const assigned = surfaceById.get(spec.id);
    return {
      ...spec,
      assignedRouteId: assigned?.route_id ?? null,
      assignedRouteName: assigned?.route_id ? routeNames.get(assigned.route_id) ?? assigned.route_id : null,
    };
  });
  const activeIds = routes.filter(route => route.is_active).map(route => route.id).sort((a, b) => a.localeCompare(b));
  const usage = new Map<string, { frozenWeeks: number; upcomingWeeks: number }>();
  for (const route of routes) usage.set(route.id, { frozenWeeks: 0, upcomingWeeks: 0 });
  const mapped: AdminRouteAssignment[] = assignments.map(row => {
    const started = Date.parse(row.wave_start) <= nowMs;
    const autoId = activeIds.length ? pickRaceRouteIdByRotation(row.wave_start, activeIds) : null;
    const bucket = usage.get(row.route_id) ?? { frozenWeeks: 0, upcomingWeeks: 0 };
    if (started) bucket.frozenWeeks += 1;
    else bucket.upcomingWeeks += 1;
    usage.set(row.route_id, bucket);
    return { ...row, started, autoRouteId: autoId, matchesRotation: autoId === row.route_id };
  }).sort((a, b) => Date.parse(b.wave_start) - Date.parse(a.wave_start));

  const catalog = routes.map(route => {
    const counts = usage.get(route.id) ?? { frozenWeeks: 0, upcomingWeeks: 0 };
    return {
      ...route,
      frozenWeeks: counts.frozenWeeks,
      upcomingWeeks: counts.upcomingWeeks,
      inRotation: route.is_active,
    };
  }).sort((a, b) => a.id.localeCompare(b.id));

  return { surfaces, catalog, assignments: mapped, activeIds };
}