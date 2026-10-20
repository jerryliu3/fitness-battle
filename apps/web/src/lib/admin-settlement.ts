import type { SupabaseClient } from "@supabase/supabase-js";
import { countsOnTrack, type Activity, type CompeteState, type CrewBoardPin } from "@fitness-battle/shared";

/** Server service-client read path; caller must authorize the owner first. Never seats an athlete. */
export async function readAdminSettlementFields(db: SupabaseClient, target: string, state: CompeteState): Promise<CrewBoardPin[]> {
  const boards: CrewBoardPin[] = [];
  for (const enrollment of state.enrollments) {
    const { data: fields, error } = await db.from("week_fields").select("*")
      .eq("sport", enrollment.sport).eq("wave_start", enrollment.waveStart).contains("member_ids", [target]);
    if (error) throw new Error("field_unavailable");
    const field = (fields ?? []).find((row) =>
      new Date(row.week_end).getTime() === Date.parse(enrollment.weekEnd) &&
      (row.crew_id ?? "solo") === (enrollment.crewId && !enrollment.crewId.startsWith("field:") ? enrollment.crewId : "solo"));
    if (!field) {
      if (enrollment.peerIds.length) throw new Error("field_snapshot_missing");
      continue;
    }
    const ids = field.member_ids as string[];
    const [profiles, ratings, activities] = await Promise.all([
      db.from("profiles").select("id, display_name").in("id", ids),
      db.from("sport_ratings").select("user_id, open_elo").eq("sport", enrollment.sport).in("user_id", ids),
      db.from("activities").select("user_id, sport, started_at, distance_m, moving_sec, provenance, disposition, source_label, compete_key, verified")
        .in("user_id", ids).eq("sport", enrollment.sport).gte("started_at", enrollment.waveStart).lt("started_at", enrollment.weekEnd),
    ]);
    if (profiles.error || ratings.error || activities.error) throw new Error("field_roster_unavailable");
    const totals = new Map<string, { distanceM: number; movingSec: number }>();
    for (const row of activities.data ?? []) {
      const activity: Activity = { id: row.compete_key ?? "", sport: row.sport, startedAt: row.started_at,
        distanceM: Number(row.distance_m ?? 0), movingSec: Number(row.moving_sec ?? 0), avgHr: null,
        provenance: row.provenance, disposition: row.disposition, source: row.source_label ?? "manual", verified: row.verified };
      if (!countsOnTrack(activity, "open") || Date.parse(activity.startedAt) > Date.now()) continue;
      const sum = totals.get(row.user_id) ?? { distanceM: 0, movingSec: 0 };
      totals.set(row.user_id, { distanceM: sum.distanceM + activity.distanceM, movingSec: sum.movingSec + activity.movingSec });
    }
    boards.push({ crewId: enrollment.crewId ?? field.crew_id ?? "solo", crewName: field.name, sport: enrollment.sport,
      waveStart: enrollment.waveStart, weekEnd: enrollment.weekEnd, capacity: field.capacity,
      memberIds: ids, syntheticIds: field.synthetic_ids, members: ids.map((id) => ({
        id, name: profiles.data?.find((row) => row.id === id)?.display_name ?? "Athlete",
        elo: Number(ratings.data?.find((row) => row.user_id === id)?.open_elo ?? 1000),
        ...(totals.get(id) ?? { distanceM: 0, movingSec: 0 }),
      })) });
  }
  return boards;
}
