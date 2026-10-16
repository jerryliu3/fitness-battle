import { NextResponse } from "next/server";
import { resolveRequestUserId } from "@/lib/auth/request-user";
import {
  asSportId,
  buildCrewBoardPin,
  currentWaveStart,
  type RosterRow,
} from "@/lib/crew-field";
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
  const embed = data.crews as
    | { id: string; name: string; sport: string }
    | { id: string; name: string; sport: string }[]
    | null;
  const crew = Array.isArray(embed) ? embed[0] : embed;
  return crew ? { id: crew.id, name: crew.name, sport: crew.sport } : null;
}

async function rosterWithVolume(
  supabase: Supabase,
  crew: CrewRow,
): Promise<RosterRow[] | { error: string }> {
  const sport = asSportId(crew.sport);
  if (!sport) return { error: "unsupported_sport" };

  const [{ data: roster, error: rosterError }, { data: entries }] =
    await Promise.all([
      supabase.rpc("crew_field_roster", { p_crew_id: crew.id }),
      supabase
        .from("crew_entries")
        .select("user_id, distance_m, moving_sec, disposition, sport, started_at")
        .eq("crew_id", crew.id)
        .eq("sport", sport)
        .eq("disposition", "counted"),
    ]);
  if (rosterError) return { error: rosterError.message };

  const waveStart = currentWaveStart();
  const weekEndMs = new Date(waveStart).getTime() + 7 * 86_400_000;
  const volume = new Map<string, { distanceM: number; movingSec: number }>();
  for (const entry of entries ?? []) {
    const at = new Date(entry.started_at).getTime();
    if (at < new Date(waveStart).getTime() || at >= weekEndMs) continue;
    const prior = volume.get(entry.user_id) ?? { distanceM: 0, movingSec: 0 };
    volume.set(entry.user_id, {
      distanceM: prior.distanceM + Number(entry.distance_m),
      movingSec: prior.movingSec + Number(entry.moving_sec),
    });
  }

  return ((roster ?? []) as RosterRow[]).map((row) => {
    const week = volume.get(row.user_id);
    return {
      ...row,
      distance_m: week?.distanceM,
      moving_sec: week?.movingSec,
    };
  });
}

function pinFromExisting(
  crew: CrewRow,
  sport: NonNullable<ReturnType<typeof asSportId>>,
  existing: {
    wave_start: string;
    week_end: string;
    capacity: number;
    member_ids: string[];
    synthetic_ids: string[];
  },
  roster: RosterRow[],
) {
  const memberSet = new Set(existing.member_ids);
  return {
    crewId: crew.id,
    crewName: crew.name,
    sport,
    waveStart: existing.wave_start,
    weekEnd: existing.week_end,
    capacity: existing.capacity,
    memberIds: existing.member_ids,
    members: roster
      .filter((row) => memberSet.has(row.user_id))
      .map((row) => ({
        id: row.user_id,
        name: row.display_name || "Athlete",
        elo: Number(row.open_elo) || 1000,
        distanceM:
          row.distance_m == null ? undefined : Number(row.distance_m),
        movingSec:
          row.moving_sec == null ? undefined : Number(row.moving_sec),
      }))
      .sort((a, b) => a.id.localeCompare(b.id)),
    syntheticIds: existing.synthetic_ids,
  };
}

/** Read an existing shared field for one crew this week (no write). */
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
  const sport = asSportId(crew.sport);
  if (!sport) return NextResponse.json({ fields: [] });

  const roster = await rosterWithVolume(supabase, crew);
  if ("error" in roster) return NextResponse.json({ fields: [] });

  const { data: existing } = await supabase
    .from("crew_week_fields")
    .select(
      "crew_id, wave_start, week_end, sport, capacity, member_ids, synthetic_ids",
    )
    .eq("crew_id", crew.id)
    .eq("wave_start", currentWaveStart())
    .maybeSingle();
  if (!existing) return NextResponse.json({ fields: [] });

  return NextResponse.json({
    fields: [{ pin: pinFromExisting(crew, sport, existing, roster) }],
  });
}

/** Seat one crew onto a shared individual field for this week. */
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

  const roster = await rosterWithVolume(supabase, crew);
  if ("error" in roster) {
    return NextResponse.json({ error: roster.error }, { status: 400 });
  }
  if (roster.length === 0) {
    return NextResponse.json({ error: "empty_roster" }, { status: 400 });
  }

  const pin = buildCrewBoardPin({
    crewId: crew.id,
    crewName: crew.name,
    sport,
    roster,
  });
  const { error: saveError } = await supabase.rpc("upsert_crew_week_field", {
    p_crew_id: crew.id,
    p_wave_start: pin.waveStart,
    p_week_end: pin.weekEnd,
    p_sport: sport,
    p_capacity: pin.capacity,
    p_member_ids: pin.memberIds,
    p_synthetic_ids: pin.syntheticIds,
  });
  if (saveError) {
    return NextResponse.json({ error: saveError.message }, { status: 400 });
  }
  return NextResponse.json({ pin });
}
