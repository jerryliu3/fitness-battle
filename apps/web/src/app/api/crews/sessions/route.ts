import { NextResponse } from "next/server";
import { resolveRequestUserId } from "@/lib/auth/request-user";
import { createRequestClient } from "@/lib/supabase/request";
const uuid = (v: unknown): v is string =>
  typeof v === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
export async function GET(request: Request) {
  if (!(await resolveRequestUserId(request)))
    return NextResponse.json(
      { error: "authentication_required" },
      { status: 401 },
    );
  const crewId = new URL(request.url).searchParams.get("crewId");
  if (!uuid(crewId))
    return NextResponse.json({ error: "invalid_session" }, { status: 400 });
  const db = await createRequestClient(request),
    { data, error } = await db.rpc("list_crew_sessions", { p_crew_id: crewId });
  if (error)
    return NextResponse.json(
      { error: "sessions_unavailable" },
      { status: 400 },
    );
  return NextResponse.json({ sessions: data ?? [] });
}
export async function POST(request: Request) {
  if (!(await resolveRequestUserId(request)))
    return NextResponse.json(
      { error: "authentication_required" },
      { status: 401 },
    );
  const body = await request.json().catch(() => null);
  if (!body || !uuid(body.id))
    return NextResponse.json({ error: "invalid_session" }, { status: 400 });
  const db = await createRequestClient(request);
  let result;
  if (
    body.action === "create" &&
    uuid(body.crewId) &&
    typeof body.title === "string" &&
    body.title.trim().length <= 80 &&
    typeof body.startsAt === "string" &&
    Number.isFinite(Date.parse(body.startsAt)) &&
    Number.isInteger(body.durationMin) &&
    typeof body.timeZone === "string"
  ) {
    result = await db.rpc("create_crew_session", {
      p_id: body.id,
      p_crew_id: body.crewId,
      p_title: body.title,
      p_starts_at: body.startsAt,
      p_duration_min: body.durationMin,
      p_time_zone: body.timeZone,
    });
  } else if (body.action === "rsvp" && typeof body.join === "boolean")
    result = await db.rpc("set_crew_session_rsvp", {
      p_session_id: body.id,
      p_join: body.join,
    });
  else if (body.action === "cancel")
    result = await db.rpc("cancel_crew_session", { p_session_id: body.id });
  else return NextResponse.json({ error: "invalid_session" }, { status: 400 });
  if (result.error)
    return NextResponse.json({ error: result.error.message }, { status: 400 });
  return NextResponse.json({ ok: true, persisted: true });
}
