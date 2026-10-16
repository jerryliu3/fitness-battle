import { NextResponse } from "next/server";
import { resolveRequestUserId } from "@/lib/auth/request-user";
import { createRequestClient } from "@/lib/supabase/request";

export async function POST(request: Request) {
  const userId = await resolveRequestUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "authentication_required" }, { status: 401 });
  }
  const body = (await request.json().catch(() => ({}))) as {
    crewId?: string;
    rest?: boolean;
  };
  if (!body.crewId) {
    return NextResponse.json({ error: "crew_required" }, { status: 400 });
  }
  const supabase = await createRequestClient(request);
  const { error } = await supabase.rpc("set_crew_rest", {
    p_crew_id: body.crewId,
    p_rest: Boolean(body.rest),
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
