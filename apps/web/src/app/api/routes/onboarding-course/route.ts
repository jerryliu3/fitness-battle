import { NextResponse } from "next/server";
import {
  ONBOARDING_OVERTAKE_SURFACE_ID,
  bundledOnboardingCourse,
  parseRouteSurfaceCourse,
} from "@fitness-battle/shared";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

const cacheHeaders = { "Cache-Control": "public, max-age=300, stale-while-revalidate=86400" };

function bundledPayload() {
  const course = bundledOnboardingCourse();
  return {
    surfaceId: ONBOARDING_OVERTAKE_SURFACE_ID,
    routeId: "bundle",
    name: course.name,
    coordinates: course.coordinates,
  };
}

export async function GET() {
  if (!getSupabaseConfig().configured) {
    return NextResponse.json(bundledPayload(), { headers: cacheHeaders });
  }
  try {
    const db = await createClient();
    const { data, error } = await db.rpc("route_surface_course", { p_surface_id: ONBOARDING_OVERTAKE_SURFACE_ID });
    if (error) throw error;
    const course = parseRouteSurfaceCourse(data);
    if (!course) return NextResponse.json(bundledPayload(), { headers: cacheHeaders });
    return NextResponse.json({
      surfaceId: ONBOARDING_OVERTAKE_SURFACE_ID,
      routeId: (data as { routeId?: string }).routeId ?? "unknown",
      name: course.name,
      coordinates: course.coordinates,
    }, { headers: cacheHeaders });
  } catch {
    return NextResponse.json(bundledPayload(), { headers: cacheHeaders });
  }
}