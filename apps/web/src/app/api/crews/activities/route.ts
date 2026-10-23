import { NextResponse } from "next/server";
import { SPORTS, type CrewActivity, type SportId } from "@fitness-battle/shared";
import { resolveRequestUserId } from "@/lib/auth/request-user";
import { createRequestClient } from "@/lib/supabase/request";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export async function GET(request: Request) {
  if (!await resolveRequestUserId(request)) return NextResponse.json({ error: "authentication_required" }, { status: 401 });
  const params = new URL(request.url).searchParams;
  const crewId = params.get("crewId"), since = params.get("since"), before = params.get("before"), beforeId = params.get("beforeId");
  const limit = Number(params.get("limit") ?? 50);
  if ((crewId && !UUID.test(crewId)) || (beforeId && (!UUID.test(beforeId) || !before)) ||
      (since && !Number.isFinite(Date.parse(since))) || (before && !Number.isFinite(Date.parse(before))) ||
      !Number.isInteger(limit) || limit < 1 || limit > 100) {
    return NextResponse.json({ error: "invalid_activity_query" }, { status: 400 });
  }
  const db = await createRequestClient(request);
  const { data, error } = await db.rpc("crew_activity_reads", {
    p_crew_id: crewId, p_since: since, p_before: before, p_before_id: beforeId,
    p_limit: limit, p_latest_per_member: params.get("latestPerMember") === "true",
  });
  if (error) return NextResponse.json({ error: error.message.includes("not_a_member") ? "not_a_member" : "crew_activities_unavailable" }, { status: error.message.includes("not_a_member") ? 403 : 503 });
  const activities: CrewActivity[] = (data ?? []).flatMap((row: Record<string, unknown>) => {
    if (!SPORTS.some(s => s.id === row.sport)) return [];
    return [{ id: String(row.activity_id), userId: String(row.user_id), name: String(row.display_name || "Athlete"),
      avatarUrl: typeof row.avatar_url === "string" ? row.avatar_url : null, sport: row.sport as SportId,
      startedAt: String(row.started_at), distanceM: Number(row.distance_m), movingSec: Number(row.moving_sec),
      verified: row.verified === true, source: String(row.source) }];
  });
  const last = activities.at(-1);
  return NextResponse.json({ activities, next: activities.length === limit && last ? { before: last.startedAt, beforeId: last.id } : null });
}
