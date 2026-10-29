import { NextResponse } from "next/server";
import { resolveRequestUserId } from "@/lib/auth/request-user";
import {
  DEFAULT_GROUP_CAPACITY,
  nextDailyWaveWindowAt,

} from "@fitness-battle/shared";
import { asSportId } from "@/lib/crew-field";
import { loadCrewWeekFieldPin } from "@/lib/week-field";
import { createRequestClient } from "@/lib/supabase/request";

type Supabase = Awaited<ReturnType<typeof createRequestClient>>;

interface CrewRow {
  id: string;
  name: string;
  sport: string;
}

async function loadCrew(
  supabase: Supabase,
  userId: string,
  crewId: string,
): Promise<CrewRow | null> {
  const { data, error } = await supabase
    .from("crew_members")
    .select("crew_id, crews(id, name, sport)")
    .eq("user_id", userId)
    .eq("crew_id", crewId)
    .eq("status", "active")
    .maybeSingle();
  if (error || !data) return null;
  const embed = data.crews as CrewRow | CrewRow[] | null;
  return Array.isArray(embed) ? (embed[0] ?? null) : embed;
}

/** Read the crew's canonical field; never create seating on a refresh. */
export async function GET(request: Request) {
  const userId = await resolveRequestUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "authentication_required" }, { status: 401 });
  }
  const crewId = new URL(request.url).searchParams.get("crewId");
  if (!crewId) {
    return NextResponse.json({ error: "crew_required" }, { status: 400 });
  }
  const supabase = await createRequestClient(request);
  const crew = await loadCrew(supabase, userId, crewId);
  if (!crew) return NextResponse.json({ fields: [] });

  try {
    const pin = await loadCrewWeekFieldPin(
      supabase,
      crew.id,
    );
    return NextResponse.json({ fields: pin ? [{ pin }] : [] });
  } catch {
    return NextResponse.json({ error: "field_unavailable" }, { status: 503 });
  }
}

/** Seat once in week_fields and return that field's authorized counted scores. */
export async function POST(request: Request) {
  const userId = await resolveRequestUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "authentication_required" }, { status: 401 });
  }
  const body = (await request.json().catch(() => ({}))) as { crewId?: string };
  if (!body.crewId) {
    return NextResponse.json({ error: "crew_required" }, { status: 400 });
  }
  const supabase = await createRequestClient(request);
  const crew = await loadCrew(supabase, userId, body.crewId);
  if (!crew) {
    return NextResponse.json({ error: "crew_not_found" }, { status: 404 });
  }
  const sport = asSportId(crew.sport);
  if (!sport) {
    return NextResponse.json({ error: "unsupported_sport" }, { status: 400 });
  }

  // Queue context only. The account save owns registration; no names or field
  // seats are exposed until the benchmark and canonical batch assignment.
  const window = nextDailyWaveWindowAt();
  return NextResponse.json({ pin: {
    crewId: crew.id, crewName: crew.name, sport,
    waveStart: window.waveStart.toISOString(), weekEnd: window.weekEnd.toISOString(),
    capacity: DEFAULT_GROUP_CAPACITY, memberIds: [userId], members: [], syntheticIds: [],
  } });
}
