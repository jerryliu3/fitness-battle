import { NextResponse } from "next/server";
import { resolveRequestUserId } from "@/lib/auth/request-user";
import { createRequestClient } from "@/lib/supabase/request";
import { specialEventError } from "@fitness-battle/shared";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (v: unknown): v is string => typeof v === "string" && UUID_RE.test(v);

export async function GET(request: Request) {
  if (!await resolveRequestUserId(request)) {
    return NextResponse.json({ error: "authentication_required" }, { status: 401 });
  }
  const db = await createRequestClient(request);
  const { data, error } = await db.rpc("list_special_events");
  if (error) {
    const missing = ["PGRST202", "42883", "42P01"].includes(error.code ?? "");
    return NextResponse.json(
      { error: missing ? "Special events are not available on this server yet." : "Could not load special events." },
      { status: 503 },
    );
  }
  return NextResponse.json(
    { editions: Array.isArray(data) ? data : [] },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}

export async function POST(request: Request) {
  if (!await resolveRequestUserId(request)) {
    return NextResponse.json({ error: "authentication_required" }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || !isUuid(body.editionId)) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
  const db = await createRequestClient(request);
  let result;
  if (body.action === "register") {
    const crewId = body.crewId == null || body.crewId === "" ? null : body.crewId;
    if (crewId !== null && !isUuid(crewId)) {
      return NextResponse.json({ error: "invalid_crew" }, { status: 400 });
    }
    const groupValue =
      typeof body.groupValue === "string" && body.groupValue.trim().length > 0 && body.groupValue.trim().length <= 64
        ? body.groupValue.trim()
        : null;
    result = await db.rpc("register_special_event", {
      p_edition_id: body.editionId,
      p_crew_id: crewId,
      p_group_value: groupValue,
    });
  } else if (body.action === "cancel") {
    result = await db.rpc("cancel_special_event", { p_edition_id: body.editionId });
  } else {
    return NextResponse.json({ error: "invalid_action" }, { status: 400 });
  }

  if (result.error) {
    const message = result.error.message ?? "";
    const status = message.includes("registration_closed")
      ? 409
      : message.includes("not_a_crew_member")
        ? 403
        : ["PGRST202", "42883", "42P01"].includes(result.error.code ?? "")
          ? 503
          : 400;
    return NextResponse.json({ error: specialEventError(message) }, { status });
  }
  return NextResponse.json({ result: result.data, persisted: true }, { headers: { "Cache-Control": "private, no-store" } });
}
