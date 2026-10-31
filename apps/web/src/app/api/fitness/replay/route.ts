import { getServerFitnessProvider } from "@/lib/fitness";
import { serviceDb } from "@/lib/fitness-store";
import type { CategorySlug } from "@fitness-battle/shared";
import { NextResponse } from "next/server";
import { normalizeRouteReplay } from "@fitness-battle/shared";
import { resolveRequestUserId } from "@/lib/auth/request-user";
import { createRequestClient } from "@/lib/supabase/request";

/** Owner-only, lazy sample read: large sensor series never join initial account hydration. */
export async function GET(request: Request) {
  const owner = await resolveRequestUserId(request);
  if (!owner) return NextResponse.json({ error: "authentication_required" }, { status: 401 });
  const id = new URL(request.url).searchParams.get("activityId");
  if (!id || id.length > 512) return NextResponse.json({ error: "invalid_activity" }, { status: 400 });
  const db = await createRequestClient(request);
  const { data, error } = await db.from("activities").select("route_replay,provider,external_id,sport,detailed_polyline").eq("user_id", owner).eq("compete_key", id).maybeSingle();
  if (error) return NextResponse.json({ error: "replay_unavailable" }, { status: 503 });
  if (!data) return NextResponse.json({ error: "activity_not_found" }, { status: 404 });
  if (data.provider === "strava" && !data.route_replay) {
    try {
      const route=await getServerFitnessProvider("strava").routeForActivity(owner,data.external_id,data.sport as CategorySlug);
      if (route.detailedPolyline) {
        const result=await serviceDb()?.from("activities").update({detailed_polyline:route.detailedPolyline,summary_polyline:route.summaryPolyline,route_bounds:route.routeBounds,route_replay:route.routeReplay??null,elevation_gain_m:route.elevationGainM}).eq("user_id",owner).eq("provider","strava").eq("external_id",data.external_id);
        if (!result?.error) { data.route_replay=route.routeReplay; data.detailed_polyline=route.detailedPolyline; }
      }
    } catch { return NextResponse.json({error:"route_sync_unavailable"},{status:503}); }
  }
  return NextResponse.json({ detailedPolyline:data.detailed_polyline, routeReplay: normalizeRouteReplay(data.route_replay) }, { headers: { "Cache-Control": "private, no-store" } });
}
