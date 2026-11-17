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
  routeId: string | null;
  notes: string;
};

export const ADMIN_ROUTE_SURFACES: AdminRouteSurface[] = [
  {
    id: "weekly-competition",
    label: "Registered competition · 3D course",
    managedOn: "server",
    storage: "Supabase `race_routes` + frozen `weekly_race_routes`",
    routeId: null,
    notes: "Auto-picks from the active catalog on first authorized read, then freezes for that wave start. Edits apply to new waves only.",
  },
  {
    id: "onboarding-overtake",
    label: "Onboarding · overtake tutorial",
    managedOn: "client",
    storage: "`packages/shared/src/onboarding-overtake.ts`",
    routeId: "onboarding-overtake (not in DB today)",
    notes: "Ships in the app bundle. Changing it still requires a client release unless we add a server-fed onboarding surface.",
  },
  {
    id: "demo-preview",
    label: "Offline / debug 4D preview",
    managedOn: "client",
    storage: "`packages/shared/src/sampleRoute.ts` → `DEMO_RACE_COURSE`",
    routeId: "marin-headlands-loop (sample)",
    notes: "Used when Supabase course fetch is unavailable or for local previews only.",
  },
];

export function buildAdminRouteOverview(
  routes: AdminRaceRouteSummary[],
  assignments: Pick<AdminRouteAssignment, "wave_start" | "route_id" | "route_name" | "created_at">[],
  nowMs = Date.now(),
) {
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

  return { surfaces: ADMIN_ROUTE_SURFACES, catalog, assignments: mapped, activeIds };
}