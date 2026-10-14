import { NextResponse } from "next/server";
import { resolveRequestUserId } from "@/lib/auth/request-user";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const userId = await resolveRequestUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "authentication_required" }, { status: 401 });
  }
  const body = (await request.json().catch(() => ({}))) as {
    crewId?: string;
    activityId?: string;
    ownerId?: string;
  };
  if (!body.crewId || !body.activityId || !body.ownerId) {
    return NextResponse.json({ error: "cheer_target_required" }, { status: 400 });
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc("cheer_entry", {
    p_crew_id: body.crewId,
    p_activity_id: body.activityId,
    p_owner: body.ownerId,
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
