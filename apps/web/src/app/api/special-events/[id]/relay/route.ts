import { NextResponse } from "next/server";
import { resolveRequestUserId } from "@/lib/auth/request-user";
import { createRequestClient } from "@/lib/supabase/request";
import { specialEventError } from "@fitness-battle/shared";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!await resolveRequestUserId(request)) {
    return NextResponse.json({ error: "authentication_required" }, { status: 401 });
  }
  const { id } = await context.params;
  const crewId = new URL(request.url).searchParams.get("crewId") ?? "";
  if (!UUID_RE.test(id) || !UUID_RE.test(crewId)) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
  const db = await createRequestClient(request);
  const { data, error } = await db.rpc("special_event_relay_lineup", {
    p_edition_id: id,
    p_crew_id: crewId,
  });
  if (error) {
    const msg = error.message ?? "";
    const status = msg.includes("not_a_crew_member") ? 403 : ["PGRST202", "42883", "42P01"].includes(error.code ?? "") ? 503 : 400;
    return NextResponse.json({ error: specialEventError(msg) }, { status });
  }
  return NextResponse.json({ lineup: data }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!await resolveRequestUserId(request)) {
    return NextResponse.json({ error: "authentication_required" }, { status: 401 });
  }
  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  if (!UUID_RE.test(id) || !body || !UUID_RE.test(String(body.crewId ?? "")) || !Array.isArray(body.legs)) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const legs: { legDay: string; slotIndex: number; userId: string }[] = [];
  for (const item of body.legs) {
    if (!item || typeof item !== "object") return NextResponse.json({ error: "invalid_leg" }, { status: 400 });
    const legDay = String((item as Record<string, unknown>).legDay ?? "");
    const slotIndex = Number((item as Record<string, unknown>).slotIndex ?? 1);
    const userId = String((item as Record<string, unknown>).userId ?? "");
    if (!DAY_RE.test(legDay) || (slotIndex !== 1 && slotIndex !== 2) || !UUID_RE.test(userId)) {
      return NextResponse.json({ error: "invalid_leg" }, { status: 400 });
    }
    legs.push({ legDay, slotIndex, userId });
  }

  const db = await createRequestClient(request);
  const { data, error } = await db.rpc("set_special_event_relay_legs", {
    p_edition_id: id,
    p_crew_id: body.crewId,
    p_legs: legs,
  });
  if (error) {
    const msg = error.message ?? "";
    const status = msg.includes("not_a_crew_member")
      ? 403
      : msg.includes("locked")
        ? 409
        : ["PGRST202", "42883", "42P01"].includes(error.code ?? "")
          ? 503
          : 400;
    return NextResponse.json({ error: specialEventError(msg) }, { status });
  }
  return NextResponse.json({ result: data, persisted: true }, { headers: { "Cache-Control": "private, no-store" } });
}
