import { NextResponse } from "next/server";
import { resolveRequestUserId } from "@/lib/auth/request-user";
import { asSportId, buildCrewBoardPin, type RosterRow } from "@/lib/crew-field";
import { createClient } from "@/lib/supabase/server";

interface CrewRow {
  id: string;
  name: string;
  sport: string;
}

async function loadActiveCrews(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  crewId?: string,
): Promise<CrewRow[]> {
  let query = supabase
    .from("crew_members")
    .select("crew_id, crews(id, name, sport)")
    .eq("user_id", userId)
    .eq("status", "active");
  if (crewId) query = query.eq("crew_id", crewId);
  const { data, error } = await query;
  if (error || !data) return [];
  return data.flatMap((row) => {
    const embed = row.crews as
      | { id: string; name: string; sport: string }
      | { id: string; name: string; sport: string }[]
      | null;
    const crew = Array.isArray(embed) ? embed[0] : embed;
    if (!crew) return [];
    return [{ id: crew.id, name: crew.name, sport: crew.sport }];
  });
}

async function seatCrew(
  supabase: Awaited<ReturnType<typeof createClient>>,
  crew: CrewRow,
) {
  const sport = asSportId(crew.sport);
  if (!sport) {
    return { error: "unsupported_sport" as const };
  }
  const { data: roster, error: rosterError } = await supabase.rpc(
    "crew_field_roster",
    { p_crew_id: crew.id },
  );
  if (rosterError) {
    return { error: rosterError.message };
  }
  const rows = (roster ?? []) as RosterRow[];
  if (rows.length === 0) {
    return { error: "empty_roster" as const };
  }
  const built = buildCrewBoardPin({
    crewId: crew.id,
    crewName: crew.name,
    sport,
    roster: rows,
  });
  const { data: saved, error: saveError } = await supabase.rpc(
    "upsert_crew_week_field",
    {
      p_crew_id: crew.id,
      p_wave_start: built.waveStart,
      p_week_end: built.weekEnd,
      p_sport: sport,
      p_capacity: built.capacity,
      p_member_ids: built.memberIds,
      p_synthetic_ids: built.syntheticIds,
    },
  );
  if (saveError) {
    return { error: saveError.message };
  }
  return { pin: built.pin, field: saved };
}

/** Read the caller's shared crew field pin(s) for this week. */
export async function GET(request: Request) {
  const userId = await resolveRequestUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "authentication_required" }, { status: 401 });
  }
  const crewId = new URL(request.url).searchParams.get("crewId") ?? undefined;
  const supabase = await createClient();
  const crews = await loadActiveCrews(supabase, userId, crewId);
  if (crews.length === 0) {
    return NextResponse.json({ fields: [] });
  }

  const fields = [];
  for (const crew of crews) {
    const sport = asSportId(crew.sport);
    if (!sport) continue;
    const { data: roster, error: rosterError } = await supabase.rpc(
      "crew_field_roster",
      { p_crew_id: crew.id },
    );
    if (rosterError) continue;
    const rows = (roster ?? []) as RosterRow[];
    const waveStart = buildCrewBoardPin({
      crewId: crew.id,
      crewName: crew.name,
      sport,
      roster: rows,
    }).waveStart;
    const { data: existing } = await supabase
      .from("crew_week_fields")
      .select(
        "crew_id, wave_start, week_end, sport, capacity, member_ids, synthetic_ids",
      )
      .eq("crew_id", crew.id)
      .eq("wave_start", waveStart)
      .maybeSingle();

    if (existing) {
      const memberSet = new Set(existing.member_ids as string[]);
      fields.push({
        pin: {
          crewId: crew.id,
          crewName: crew.name,
          sport,
          waveStart: existing.wave_start,
          weekEnd: existing.week_end,
          capacity: existing.capacity,
          memberIds: existing.member_ids,
          members: rows
            .filter((row) => memberSet.has(row.user_id))
            .map((row) => ({
              id: row.user_id,
              name: row.display_name || "Athlete",
              elo: Number(row.open_elo) || 1000,
            }))
            .sort((a, b) => a.id.localeCompare(b.id)),
          syntheticIds: existing.synthetic_ids,
        },
      });
      continue;
    }

    const seated = await seatCrew(supabase, crew);
    if ("pin" in seated && seated.pin) {
      fields.push({ pin: seated.pin });
    }
  }

  return NextResponse.json({ fields });
}

/** Reseat one crew (or every active crew) onto a shared individual field. */
export async function POST(request: Request) {
  const userId = await resolveRequestUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "authentication_required" }, { status: 401 });
  }
  const body = (await request.json().catch(() => ({}))) as { crewId?: string };
  const supabase = await createClient();
  const crews = await loadActiveCrews(supabase, userId, body.crewId);
  if (crews.length === 0) {
    return NextResponse.json({ error: "crew_not_found" }, { status: 404 });
  }

  const fields = [];
  for (const crew of crews) {
    const seated = await seatCrew(supabase, crew);
    if ("error" in seated && seated.error) {
      return NextResponse.json({ error: seated.error }, { status: 400 });
    }
    if ("pin" in seated && seated.pin) {
      fields.push({ pin: seated.pin, field: seated.field });
    }
  }
  return NextResponse.json({ fields });
}
