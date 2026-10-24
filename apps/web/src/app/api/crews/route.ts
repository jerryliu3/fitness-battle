import { NextResponse } from "next/server";
import { competitionTrack, dayKey, waveWindowAt, type SportId } from "@fitness-battle/shared";
import { resolveRequestUserId } from "@/lib/auth/request-user";
import { createRequestClient } from "@/lib/supabase/request";

interface CrewEmbed {
  id: string;
  name: string;
  invite_code: string;
  sport: string;
  format: string;
  target_sessions: number;
  journey_km: number;
}

interface MembershipRow {
  crew_id: string;
  crews: CrewEmbed | CrewEmbed[] | null;
}

interface EntryRow {
  crew_id: string;
  user_id: string;
  activity_id: string;
  started_at: string;
  sport: string;
  distance_m: number;
  moving_sec: number;
  disposition: string;
}

function embeddedCrew(value: MembershipRow["crews"]): CrewEmbed | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

export async function GET(request: Request) {
  const userId = await resolveRequestUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "authentication_required" }, { status: 401 });
  }
  const supabase = await createRequestClient(request);
  const { data: memberships, error } = await supabase
    .from("crew_members")
    .select("crew_id, display_name, status, rest_week, crews(id, name, invite_code, sport, format, target_sessions, journey_km)")
    .eq("user_id", userId)
    .eq("status", "active");
  if (error) {
    return NextResponse.json({ error: "crews_unavailable" }, { status: 500 });
  }
  const rows = (memberships ?? []) as MembershipRow[];
  const sportByCrew = new Map(
    rows.flatMap((row) => {
      const crew = embeddedCrew(row.crews);
      return crew ? [[row.crew_id, crew.sport] as const] : [];
    }),
  );
  const crewIds = [...sportByCrew.keys()];
  const progress: Array<Record<string, unknown>> = [];
  const previousProgress: Array<Record<string, unknown>> = [];
  const previousProgressAvailable: Record<string,boolean> = {};
  const [summaries,previousSummaries] = await Promise.all([
    Promise.all(crewIds.map(crewId=>supabase.rpc("crew_week_totals",{p_crew_id:crewId}))),
    Promise.all(crewIds.map(crewId=>supabase.rpc("crew_previous_week_totals",{p_crew_id:crewId}))),
  ]);
  for (const [index, crewId] of crewIds.entries()) {
    const previous=previousSummaries[index]!;
    previousProgressAvailable[crewId]=!previous.error;
    if(!previous.error)previousProgress.push(...(previous.data??[]).map((row:Record<string,unknown>)=>({...row,crew_id:crewId})));
    const { data: totals, error: totalsError } = summaries[index]!;
    if (totalsError) return NextResponse.json({ error: "crew_progress_unavailable" }, { status: 500 });
    progress.push(...(totals ?? []).map((row: Record<string, unknown>) => ({
      ...row, crew_id: crewId, activity_id: `total:${row.user_id}`, sport: sportByCrew.get(crewId),
      started_at: new Date().toISOString(), disposition: "counted",
    })));
  }
  const [memberResult, entryResult, noticeResult, ratingResult] = await Promise.all([
    crewIds.length
      ? supabase.from("crew_members").select("crew_id, user_id, display_name, rest_week, status").in("crew_id", crewIds)
      : Promise.resolve({ data: [], error: null }),
    crewIds.length
      ? supabase
          .from("crew_entries")
          .select("crew_id, user_id, activity_id, started_at, sport, distance_m, moving_sec, disposition")
          .in("crew_id", crewIds)
      : Promise.resolve({ data: [], error: null }),
    supabase
      .from("crew_notices")
      .select("id, crew_id, kind, body, created_at, read_at")
      .eq("user_id", userId)
      .is("read_at", null)
      .order("created_at", { ascending: false })
      .limit(20),
    crewIds.length ? supabase.rpc("crew_member_effort_scores") : Promise.resolve({ data: [], error: null }),
  ]);
  if (memberResult.error || entryResult.error || noticeResult.error) return NextResponse.json({ error: "crews_unavailable" }, { status: 500 });
  const { data: members } = memberResult, { data: entries } = entryResult, { data: notices } = noticeResult;
  const memberIds=[...new Set((members??[]).filter(m=>m.status==="active").map(m=>m.user_id))];
  const {data:portraits}=memberIds.length?await supabase.from("profiles").select("id, avatar_url").in("id",memberIds):{data:[]};
  const photos=new Map((portraits??[]).map(p=>[p.id,p.avatar_url]));
  const ratings = new Map((ratingResult.error ? [] : ratingResult.data ?? []).map((row: { crew_id: string; user_id: string; open_elo: number; verified_elo: number }) => [
    `${row.crew_id}:${row.user_id}`, competitionTrack(sportByCrew.get(row.crew_id) as SportId) === "verified" ? Number(row.verified_elo) : Number(row.open_elo),
  ]));
  const week = waveWindowAt();
  const allEntries = (entries ?? []) as EntryRow[];
  const seasonWeeks: Record<string, number> = {};
  const weeksSeen = new Set<string>();
  for (const entry of allEntries) {
    if (entry.disposition !== "counted") continue;
    if (entry.sport !== sportByCrew.get(entry.crew_id)) continue;
    const weekStart = dayKey(waveWindowAt(new Date(entry.started_at)).waveStart);
    const key = `${entry.crew_id}:${weekStart}`;
    if (weeksSeen.has(key)) continue;
    weeksSeen.add(key);
    seasonWeeks[entry.crew_id] = (seasonWeeks[entry.crew_id] ?? 0) + 1;
  }
  const currentEntries = allEntries.filter((entry) => {
    if (entry.sport !== sportByCrew.get(entry.crew_id)) return false;
    const at = new Date(entry.started_at).getTime();
    return at >= week.waveStart.getTime() && at < week.weekEnd.getTime();
  });
  return NextResponse.json({
    crews: memberships ?? [],
    members: (members??[]).map(m=>({...m,avatar_url:photos.get(m.user_id)??null,effort_score:ratings.get(`${m.crew_id}:${m.user_id}`)??null})),
    entries: currentEntries,
    progress,
    previousProgress,
    previousProgressAvailable,
    seasonWeeks,
    notices: notices ?? [],
  });
}

export async function POST(request: Request) {
  const userId = await resolveRequestUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "authentication_required" }, { status: 401 });
  }
  const supabase = await createRequestClient(request);
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
