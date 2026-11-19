import { NextResponse } from "next/server";
import { resolveRequestUserId } from "@/lib/auth/request-user";
import { createRequestClient } from "@/lib/supabase/request";
import { specialEventError } from "@fitness-battle/shared";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!await resolveRequestUserId(request)) {
    return NextResponse.json({ error: "authentication_required" }, { status: 401 });
  }
  const { id } = await context.params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: "invalid_edition" }, { status: 400 });

  const db = await createRequestClient(request);
  const { data, error } = await db.rpc("special_event_standings", { p_edition_id: id });
  if (error) {
    const msg = error.message ?? "";
    const status = msg.includes("not_registered")
      ? 403
      : msg.includes("edition_not_started")
        ? 409
        : ["PGRST202", "42883", "42P01"].includes(error.code ?? "")
          ? 503
          : 400;
    return NextResponse.json({ error: specialEventError(msg) }, { status });
  }
  return NextResponse.json({ standings: data }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!await resolveRequestUserId(request)) {
    return NextResponse.json({ error: "authentication_required" }, { status: 401 });
  }
  const { id } = await context.params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: "invalid_edition" }, { status: 400 });
  const body = await request.json().catch(() => null);
  if (body?.action !== "acknowledge") {
    return NextResponse.json({ error: "invalid_action" }, { status: 400 });
  }
  const db = await createRequestClient(request);
  const { data, error } = await db.rpc("acknowledge_special_event", { p_edition_id: id });
  if (error) return NextResponse.json({ error: specialEventError(error.message ?? "") }, { status: 400 });
  return NextResponse.json({ acknowledged: Boolean(data), persisted: true }, { headers: { "Cache-Control": "private, no-store" } });
}
