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
  const { data, error } = await db.from("activities").select("route_replay").eq("user_id", owner).eq("compete_key", id).maybeSingle();
  if (error) return NextResponse.json({ error: "replay_unavailable" }, { status: 503 });
  if (!data) return NextResponse.json({ error: "activity_not_found" }, { status: 404 });
  return NextResponse.json({ routeReplay: normalizeRouteReplay(data.route_replay) }, { headers: { "Cache-Control": "private, no-store" } });
}
