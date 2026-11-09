import { NextResponse } from "next/server";
import { raceCourseFromAssignment } from "@fitness-battle/shared";
import { resolveRequestUserId } from "@/lib/auth/request-user";
import { registeredCompetitionCourse } from "@/lib/competition-course";
import { createRequestClient } from "@/lib/supabase/request";

/** Registration authorizes course access independently of roster assignment. */
export async function GET(request: Request) {
  const userId = await resolveRequestUserId(request);
  if (!userId) return NextResponse.json({ error: "authentication_required" }, { status: 401 });
  const params = new URL(request.url).searchParams;
  const sport = params.get("sport"), start = params.get("start"), end = params.get("end");
  if (!sport || !["running", "cycling", "walking"].includes(sport)
    || !start || !end || !Number.isFinite(Date.parse(start)) || !Number.isFinite(Date.parse(end))
    || Date.parse(end) <= Date.parse(start)) return NextResponse.json({ error: "invalid_competition_route" }, { status: 400 });
  try {
    const db = await createRequestClient(request);
    const registration = await db.from("wave_enrollments").select("user_id")
      .eq("user_id", userId).eq("sport", sport).eq("wave_start", start).eq("week_end", end).maybeSingle();
    if (registration.error) throw registration.error;
    let course;
    if (registration.data) {
      course = await registeredCompetitionCourse(start, end);
    } else {
      // Archived fields can outlive the current enrollment. Their existing
      // membership-checked RPC remains the authority for historical access.
      const { data, error } = await db.rpc("competition_route", { p_sport: sport, p_start: start, p_end: end });
      if (error || !data) return NextResponse.json({ error: "Weekly course is unavailable. Please try again." }, { status: error?.code === "42501" ? 404 : 503 });
      course = raceCourseFromAssignment(data, start, end);
    }
    return NextResponse.json({ name: course.name, coordinates: course.coordinates, periodStart: start, periodEnd: end }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ error: "Weekly course is unavailable. Please try again." }, { status: 503 });
  }
}
