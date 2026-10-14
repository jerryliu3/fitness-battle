import { NextResponse } from "next/server";
import { resolveRequestUserId } from "@/lib/auth/request-user";
import { createClient } from "@/lib/supabase/server";

async function requireUser(request: Request) {
  const userId = await resolveRequestUserId(request);
  if (!userId) return { userId: null, supabase: null };
  const supabase = await createClient();
  return { userId, supabase };
}

export async function GET(request: Request) {
  const { userId, supabase } = await requireUser(request);
  if (!userId || !supabase) {
    return NextResponse.json({ error: "authentication_required" }, { status: 401 });
  }
  const { data: memberships, error } = await supabase
    .from("crew_members")
    .select("crew_id, display_name, status, rest_week, crews(id, name, invite_code, sport, format, target_sessions, journey_km)")
    .eq("user_id", userId)
    .eq("status", "active");
  if (error) {
    return NextResponse.json({ error: "crews_unavailable" }, { status: 500 });
  }
  const crewIds = (memberships ?? []).map((row) => row.crew_id);
  const [{ data: members }, { data: entries }, { data: notices }] = await Promise.all([
    crewIds.length
      ? supabase.from("crew_members").select("crew_id, user_id, display_name, rest_week, status").in("crew_id", crewIds)
      : Promise.resolve({ data: [] }),
    crewIds.length
      ? supabase.from("crew_entries").select("crew_id, user_id, activity_id, started_at, sport, distance_m, moving_sec, disposition").in("crew_id", crewIds)
      : Promise.resolve({ data: [] }),
    supabase.from("crew_notices").select("id, crew_id, kind, body, created_at, read_at").eq("user_id", userId).is("read_at", null).order("created_at", { ascending: false }).limit(20),
  ]);
  return NextResponse.json({
    crews: memberships ?? [],
    members: members ?? [],
    entries: entries ?? [],
    notices: notices ?? [],
  });
}

export async function POST(request: Request) {
  const { userId, supabase } = await requireUser(request);
  if (!userId || !supabase) {
    return NextResponse.json({ error: "authentication_required" }, { status: 401 });
  }
  const body = (await request.json().catch(() => ({}))) as {
    name?: string;
    sport?: string;
    format?: string;
    targetSessions?: number;
    journeyKm?: number;
  };
  const { data, error } = await supabase.rpc("create_crew", {
    p_name: body.name ?? "Crew",
    p_sport: body.sport ?? "running",
    p_format: body.format ?? "volume",
    p_target_sessions: body.targetSessions ?? 3,
    p_journey_km: body.journeyKm ?? 40,
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ crew: data });
}
