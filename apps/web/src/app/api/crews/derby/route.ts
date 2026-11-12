import { NextResponse } from "next/server";
import { resolveRequestUserId } from "@/lib/auth/request-user";
import { createRequestClient } from "@/lib/supabase/request";

export async function GET(request: Request) {
  if (!await resolveRequestUserId(request)) return NextResponse.json({ error: "authentication_required" }, { status: 401 });
  const crewId = new URL(request.url).searchParams.get("crewId");
  if (!crewId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(crewId))
    return NextResponse.json({ error: "invalid_crew" }, { status: 400 });
  const db = await createRequestClient(request);
  const { data, error } = await db.rpc("crew_derby_standings", { p_crew_id: crewId });
  if (error) return NextResponse.json({ error: "derby_unavailable" }, { status: error.message.includes("not_a_member") ? 403 : 503 });
  return NextResponse.json({ derby: data }, { headers: { "Cache-Control": "private, no-store" } });
}
