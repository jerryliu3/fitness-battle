import type { SupabaseClient } from "@supabase/supabase-js";
import {
  pickSynthetics,
  type CrewBoardPin,
  type SportId,
} from "@fitness-battle/shared";

/** The sole persisted seating plan, for both open and private crew fields. */
export interface WeekFieldRow {
  id: string;
  sport: SportId;
  wave_start: string;
  week_end: string;
  capacity: number;
  crew_id: string | null;
  name: string;
  member_ids: string[];
  synthetic_ids: string[];
}

interface FieldRosterRow {
  user_id: string;
  display_name: string;
  open_elo: number | string;
  distance_m: number | string;
  moving_sec: number | string;
  verified_elo?: number | string;
  verified_distance_m?: number | string;
  verified_moving_sec?: number | string;
}

/** All field readers use the same authorized roster and counted-volume RPC. */
export async function readWeekFieldPin(
  db: SupabaseClient,
  field: WeekFieldRow,
): Promise<CrewBoardPin> {
  const { data, error } = await db.rpc("week_field_roster", { p_field_id: field.id });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("field_roster_unavailable");
  const memberSet = new Set(field.member_ids);
  const {data:portraits}=field.member_ids.length?await db.from("profiles").select("id, avatar_url").in("id",field.member_ids):{data:[]};
  const photos=new Map((portraits??[]).map(row=>[row.id,row.avatar_url]));
  const members = (data as FieldRosterRow[])
    .filter((row) => memberSet.has(row.user_id))
    .map((row) => ({
      id: row.user_id,
      name: row.display_name || "Athlete",
      avatarUrl: photos.get(row.user_id) ?? null,
      elo: Number(row.open_elo) || 1000,
      distanceM: Number(row.distance_m) || 0,
      movingSec: Number(row.moving_sec) || 0,
      verifiedElo: Number(row.verified_elo ?? 1000),
      verifiedDistanceM: Number(row.verified_distance_m) || 0,
      verifiedMovingSec: Number(row.verified_moving_sec) || 0,
    }))
    .sort((a, b) => a.id.localeCompare(b.id));

  const needed = Math.max(0, field.capacity - field.member_ids.length);
  let syntheticIds = field.synthetic_ids;
  if (syntheticIds.length !== needed) {
    const elos = members.map((member) => member.elo).sort((a, b) => a - b);
    const median = elos[Math.floor((elos.length - 1) / 2)] ?? 1000;
    syntheticIds = pickSynthetics(
      field.sport,
      median,
      needed,
      field.member_ids,
      `${field.crew_id ?? `solo:${field.id}`}:${field.sport}:${field.wave_start}`,
    ).map((rival) => rival.id);
  }

  return {
    crewId: field.crew_id ?? "solo",
    crewName: field.name,
    sport: field.sport,
    waveStart: field.wave_start,
    weekEnd: field.week_end,
    capacity: field.capacity,
    memberIds: field.member_ids,
    members,
    syntheticIds,
  };
}

export async function loadCrewWeekFieldPin(
  db: SupabaseClient,
  crewId: string,
  waveStart: string,
): Promise<CrewBoardPin | null> {
  const { data, error } = await db
    .from("week_fields")
    .select("*")
    .eq("crew_id", crewId)
    .eq("wave_start", waveStart)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? readWeekFieldPin(db, data as WeekFieldRow) : null;
}

export async function seatWeekFieldPin(
  db: SupabaseClient,
  input: {
    sport: SportId;
    waveStart: string;
    weekEnd: string;
    capacity: number;
    crewId?: string | null;
    crewName?: string;
    syntheticIds: string[];
  },
): Promise<CrewBoardPin> {
  const { data, error } = await db.rpc("seat_athlete_week_field", {
    p_sport: input.sport,
    p_wave_start: input.waveStart,
    p_week_end: input.weekEnd,
    p_capacity: input.capacity,
    p_crew_id: input.crewId ?? null,
    p_crew_name: input.crewName ?? null,
    p_synthetic_ids: input.syntheticIds,
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("field_not_seated");
  return readWeekFieldPin(db, data as WeekFieldRow);
}
