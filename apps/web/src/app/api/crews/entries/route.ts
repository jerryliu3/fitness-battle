import { NextResponse } from "next/server";
import { resolveRequestUserId } from "@/lib/auth/request-user";
import { createClient } from "@/lib/supabase/server";

interface EntryBody {
  crewId?: string;
  activities?: {
    id: string;
    startedAt: string;
    sport: string;
    distanceM: number;
    movingSec: number;
    disposition?: string;
    provenance?: string;
  }[];
}

export async function POST(request: Request) {
  const userId = await resolveRequestUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "authentication_required" }, { status: 401 });
  }
  const body = (await request.json().catch(() => ({}))) as EntryBody;
  if (!body.crewId) {
    return NextResponse.json({ error: "crew_required" }, { status: 400 });
  }
  const rows = (body.activities ?? [])
    .filter((activity) => activity.provenance !== "demo" && activity.disposition === "counted")
    .map((activity) => ({
      crew_id: body.crewId,
      user_id: userId,
      activity_id: activity.id,
      started_at: activity.startedAt,
      sport: activity.sport,
      distance_m: activity.distanceM,
      moving_sec: activity.movingSec,
      disposition: "counted",
      provenance: activity.provenance ?? "recorded",
    }));
  if (rows.length === 0) {
    return NextResponse.json({ saved: 0 });
  }
  const supabase = await createClient();
  const { error } = await supabase.from("crew_entries").upsert(rows, {
    onConflict: "crew_id,user_id,activity_id",
  });
  if (error) {
    return NextResponse.json({ error: error.message, persisted: false }, { status: 400 });
  }
  return NextResponse.json({ saved: rows.length, persisted: true });
}
