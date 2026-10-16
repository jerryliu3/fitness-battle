import { NextResponse } from "next/server";
import { resolveRequestUserId } from "@/lib/auth/request-user";
import { createRequestClient } from "@/lib/supabase/request";

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
  const { data, error } = await supabase.rpc("share_crew_week", {
    p_crew_id: body.crewId,
  });
  if (error) {
    return NextResponse.json({ error: error.message, persisted: false }, { status: 400 });
  }
  return NextResponse.json({ saved: data ?? 0, persisted: true });
}
