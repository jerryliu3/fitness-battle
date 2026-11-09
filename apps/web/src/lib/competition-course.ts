import "server-only";
import { raceCourseFromAssignment } from "@fitness-battle/shared";
import { competitionAuthorityDatabase } from "./competition-authority";

/** Call only after verifying the caller's registration for these exact bounds. */
export async function registeredCompetitionCourse(start: string, end: string) {
  const db = competitionAuthorityDatabase();
  const readSnapshot = () => db.from("weekly_race_routes")
    .select("route_name,coordinates").eq("wave_start", start).maybeSingle();
  let snapshot = await readSnapshot();
  if (snapshot.error) throw snapshot.error;
  if (!snapshot.data) {
    // Match the legacy RPC's rotation, without requiring or assigning a roster.
    const catalog = await db.from("race_routes").select("id").eq("is_active", true).order("id");
    if (catalog.error) throw catalog.error;
    if (!catalog.data?.length) throw new Error("competition_route_unavailable");
    const index = Math.floor(Date.parse(start) / 604_800_000) % catalog.data.length;
    const selected = await db.from("race_routes").select("id,name,coordinates")
      .eq("id", catalog.data[index]!.id).eq("is_active", true).single();
    if (selected.error) throw selected.error;
    const route = selected.data;
    // Validate before freezing. Another API call or the legacy RPC can win;
    // never update its snapshot, and always return the persisted winner.
    raceCourseFromAssignment({ name: route.name, coordinates: route.coordinates, periodStart: start, periodEnd: end }, start, end);
    const saved = await db.from("weekly_race_routes").upsert({
      wave_start: start, route_id: route.id, route_name: route.name, coordinates: route.coordinates,
    }, { onConflict: "wave_start", ignoreDuplicates: true });
    if (saved.error) throw saved.error;
    snapshot = await readSnapshot();
    if (snapshot.error) throw snapshot.error;
  }
  if (!snapshot.data) throw new Error("competition_route_unavailable");
  return raceCourseFromAssignment({ name: snapshot.data.route_name, coordinates: snapshot.data.coordinates, periodStart: start, periodEnd: end }, start, end);
}
